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
  if ((type === 'AUTO_INCREMENT' || type === 'AUTOINCREMENT') && !params) {
    rest = 'AUTO_INCREMENT ' + rest; type = 'INT';
  }
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
  const combinedRe = /(?:CREATE\s+TABLE\s+(?:IF\s+NOT\s+EXISTS\s+)?[`"']?([\w\u00C0-\u00FF]+)[`"']?)[\s(]|(?:FOREIGN\s+KEY\s*\([`"']?(\w+)[`"']?\)\s+REFERENCES\s+[`"']?(\w+)[`"']?\s*\([^)]+\)\s*--\s*(1:1|1:M|M:1|M:M))|(?:^|[,(])\s*[`"']?(\w+)[`"']?\s+\w+(?:\([^)]*\))?\s+(?:UNIQUE\s+)?REFERENCES\s+[`"']?(\w+)[`"']?\s*\([^)]+\)\s*--\s*(1:1|1:M|M:1|M:M)/gi;
  let m;
  while ((m = combinedRe.exec(sql)) !== null) {
    if (m[1]) {
      tablesInOrder.push({ name: m[1].toLowerCase(), index: m.index });
    } else {
      const col = (m[2] || m[5] || '').toLowerCase();
      const refTable = (m[3] || m[6] || '').toLowerCase();
      const cardinality = m[4] || m[7];
      if (!col || !cardinality) continue;
      for (let i = tablesInOrder.length - 1; i >= 0; i--) {
        if (tablesInOrder[i].index < m.index) { hints[`${tablesInOrder[i].name}.${col}.${refTable}`] = cardinality; break; }
      }
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
      const colByName = {};
      for (const part of parts) {
        const p = part.trim();
        const pk = p.match(/PRIMARY\s+KEY\s*\(([^)]+)\)/i);
        if (pk) { pk[1].split(',').forEach(cn => { const clean = cn.trim().replace(/[`"']/g, ''); const c = colByName[clean]; if (c) c.pk = true; }); continue; }
        const fk = p.match(/FOREIGN\s+KEY\s*\([`"']?([\w\u00C0-\u00FF]+)[`"']?\)\s*REFERENCES\s+[`"']?(\w+)[`"']?\s*\([`"']?([\w\u00C0-\u00FF]+)[`"']?\)/i);
        if (fk) { const fkCol = fk[1].replace(/[`"']/g, '').trim(); const fkTbl = fk[2]; const fkColObj = colByName[fkCol]; const cardHint = cardHints[`${t.name.toLowerCase()}.${fkCol.toLowerCase()}.${fkTbl.toLowerCase()}`]; const defCard = (fkColObj && (fkColObj.uq || fkColObj.pk)) ? '1:1' : 'M:1'; t.refs.push({ column: fkCol, refTable: fkTbl, refColumn: fk[3].replace(/[`"']/g, '').trim(), cardinality: cardHint || defCard }); if (fkColObj) fkColObj.fk = true; continue; }
        if (/^(INDEX|KEY|UNIQUE|CONSTRAINT|CHECK|FULLTEXT|SPATIAL)\b/i.test(p)) continue;
        const col = parseColumnDef(p);
        if (col) { if (col.fk && col.refTable) { const cardHint2 = cardHints[`${t.name.toLowerCase()}.${col.name.toLowerCase()}.${col.refTable.toLowerCase()}`]; const defCard = (col.uq || col.pk) ? '1:1' : 'M:1'; t.refs.push({ column: col.name, refTable: col.refTable, refColumn: col.refColumn, cardinality: cardHint2 || defCard }); } t.columns.push(col); colByName[col.name] = col; }
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
        const colByName = {}; for (const c of table.columns) colByName[c.name] = c;
        if (!table.refs.some(r => r.column === cn && r.refTable === rt)) { const cardHint3 = cardHints[`${table.name.toLowerCase()}.${cn.toLowerCase()}.${rt.toLowerCase()}`]; const colObj3 = colByName[cn]; table.refs.push({ column: cn, refTable: rt, refColumn: rc, cardinality: cardHint3 || (colObj3 && (colObj3.uq || colObj3.pk) ? '1:1' : 'M:1') }); }
        const col = colByName[cn];
        if (col) col.fk = true;
      }
    }
  }
  return tables;
}
