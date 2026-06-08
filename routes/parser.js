function splitTopLevel(str) {
  const parts = [];
  let depth = 0, current = '', inStr = false, strChar = null;
  for (const ch of str) {
    if (inStr) { current += ch; if (ch === strChar) inStr = false; continue; }
    if (ch === "'" || ch === '"' || ch === '`') { inStr = true; strChar = ch; current += ch; continue; }
    if (ch === '(') { depth++; current += ch; continue; }
    if (ch === ')') { depth--; current += ch; continue; }
    if (ch === ',' && depth === 0) { parts.push(current); current = ''; continue; }
    current += ch;
  }
  if (current.trim()) parts.push(current);
  return parts;
}

function parseColumnDef(def) {
  const m = def.trim().match(/^[`"']?([\w\u00C0-\u00FF]+)[`"']?\s+(\w+)(\([^)]*\))?\s*(.*)/i);
  if (!m) return null;
  let name = m[1], type = m[2].toUpperCase(), params = m[3] || '', rest = m[4];
  let col = { id: uid(), name, type, length: null, values: '', pk: false, nn: false, uq: false, ai: false, fk: false, refTable: '', refColumn: '', defaultValue: '' };
  if (type === 'SERIAL' || type === 'BIGSERIAL' || type === 'SMALLSERIAL') {
    const typeMap = { SERIAL: 'INT', BIGSERIAL: 'BIGINT', SMALLSERIAL: 'SMALLINT' };
    col = { ...col, type: typeMap[type], ai: true };
    type = typeMap[type];
  }
  if (params) {
    const inner = params.slice(1, -1);
    if (type === 'ENUM') col.values = inner;
    else if (['VARCHAR','CHAR'].includes(type)) col.length = parseInt(inner) || null;
    else if (['FLOAT','DOUBLE','DECIMAL'].includes(type)) col.length = inner;
    else col.length = parseInt(inner) || null;
  }
  if (/PRIMARY\s+KEY/i.test(rest)) col.pk = true;
  if (/NOT\s+NULL/i.test(rest)) col.nn = true;
  if (/UNIQUE/i.test(rest)) col.uq = true;
  if (/AUTO_INCREMENT/i.test(rest)) col.ai = true;
  const d = rest.match(/DEFAULT\s+(\S+(?:\s+\S+)?)/i);
  if (d) col.defaultValue = d[1].replace(/['"]/g, '');
  const r = rest.match(/REFERENCES\s+[`"']?(\w+)[`"']?\s*\([`"']?([\w\u00C0-\u00FF]+)[`"']?\)/i);
  if (r) { col.fk = true; col.refTable = r[1]; col.refColumn = r[2].replace(/[`"']/g, '').trim(); }
  return col;
}

function parseCardinalityHints(sql) {
  const hints = {};
  const tablesInOrder = [];
  const tableRe = /(?:CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([\w\u00C0-\u00FF]+)[`"']?)[\s(]/gi;
  let tm;
  while ((tm = tableRe.exec(sql)) !== null) {
    tablesInOrder.push({ name: tm[1].toLowerCase(), index: tm.index });
  }
  const patterns = [
    /FOREIGN\s+KEY\s*\([`"']?(\w+)[`"']?\)\s+REFERENCES\s+[`"']?(\w+)[`"']?\s*\([^)]+\)\s*--\s*(1:1|1:M|M:1|M:M)/gmi,
    /(?:^|,)\s*[`"']?(\w+)[`"']?\s+\w+(?:\([^)]*\))?\s+(?:UNIQUE\s+)?REFERENCES\s+[`"']?(\w+)[`"']?\s*\([^)]+\)\s*--\s*(1:1|1:M|M:1|M:M)/gmi
  ];
  for (const re of patterns) {
    re.lastIndex = 0;
    let m;
    while ((m = re.exec(sql)) !== null) {
      const col = (m[1] || '').toLowerCase();
      if (!col) continue;
      const refTable = (m[2] || '').toLowerCase();
      const cardinality = m[3];
      let srcTable = '';
      for (let i = tablesInOrder.length - 1; i >= 0; i--) {
        if (tablesInOrder[i].index < m.index) { srcTable = tablesInOrder[i].name; break; }
      }
      if (srcTable) hints[`${srcTable}.${col}.${refTable}`] = cardinality;
    }
  }
  return hints;
}

function stripSQLComments(sql) {
  return sql.replace(/--.*$/gm, '').replace(/\/\*[\s\S]*?\*\//g, '').replace(/\n\s*\n/g, '\n').trim();
}

function parseSQL(sql) {
  const tables = [];
  const cardHints = parseCardinalityHints(sql);
  let clean = stripSQLComments(sql);
  const stmts = clean.split(';').map(s => s.trim()).filter(s => s);
  let tableIdx = 0;
  for (const stmt of stmts) {
    const cm = stmt.match(/CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([\w\u00C0-\u00FF]+)[`"']?\s*\(([\s\S]*)\)\s*$/i);
    if (cm) {
      const t = { id: uid(), name: cm[1], columns: [], refs: [], color: TABLE_COLORS[tableIdx++ % TABLE_COLORS.length] };
      const parts = splitTopLevel(cm[2]);
      for (const part of parts) {
        const p = part.trim();
        const pk = p.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pk) { pk[1].split(',').map(c => c.trim().replace(/[`"']/g, '')).forEach(cn => { const c = t.columns.find(col => col.name === cn); if (c) c.pk = true; }); continue; }
        const fk = p.match(/FOREIGN\s+KEY\s*\([`"']?([\w\u00C0-\u00FF]+)[`"']?\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\([`"']?([\w\u00C0-\u00FF]+)[`"']?\)/i);
        if (fk) { const fkCol = fk[1].replace(/[`"']/g, '').trim(); const fkTbl = fk[2]; const fkColObj = t.columns.find(c => c.name === fkCol); const cardHint = cardHints[`${t.name.toLowerCase()}.${fkCol.toLowerCase()}.${fkTbl.toLowerCase()}`]; const defCard = (fkColObj && (fkColObj.uq || fkColObj.pk)) ? '1:1' : 'M:1'; t.refs.push({ column: fkCol, refTable: fkTbl, refColumn: fk[3].replace(/[`"']/g, '').trim(), cardinality: cardHint || defCard }); if (fkColObj) fkColObj.fk = true; continue; }
        if (/^(INDEX|KEY|UNIQUE|CONSTRAINT|CHECK|FULLTEXT|SPATIAL)\b/i.test(p)) continue;
        const col = parseColumnDef(p);
        if (col) { if (col.fk && col.refTable) { const cardHint2 = cardHints[`${t.name.toLowerCase()}.${col.name.toLowerCase()}.${col.refTable.toLowerCase()}`]; const defCard = (col.uq || col.pk) ? '1:1' : 'M:1'; t.refs.push({ column: col.name, refTable: col.refTable, refColumn: col.refColumn, cardinality: cardHint2 || defCard }); } t.columns.push(col); }
      }
      tables.push(t);
      continue;
    }
    const af = stmt.match(/ALTER\s+TABLE\s+[`"']?(\w+)[`"']?\s+ADD\s+(?:CONSTRAINT\s+\S+\s+)?FOREIGN\s+KEY\s*\([`"']?([\w\u00C0-\u00FF]+)[`"']?\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\([`"']?([\w\u00C0-\u00FF]+)[`"']?\)/i);
    if (af) {
      const tn = af[1], cn = af[2].replace(/[`"']/g, '').trim(), rt = af[3], rc = af[4].replace(/[`"']/g, '').trim();
      const table = tables.find(t => t.name === tn);
      if (table) {
        if (!table.refs) table.refs = [];
        if (!table.refs.some(r => r.column === cn && r.refTable === rt)) { const cardHint3 = cardHints[`${table.name.toLowerCase()}.${cn.toLowerCase()}.${rt.toLowerCase()}`]; const colObj3 = table.columns.find(c => c.name === cn); table.refs.push({ column: cn, refTable: rt, refColumn: rc, cardinality: cardHint3 || (colObj3 && (colObj3.uq || colObj3.pk) ? '1:1' : 'M:1') }); }
        const col = table.columns.find(c => c.name === cn);
        if (col) col.fk = true;
      }
    }
  }
  return tables;
}
