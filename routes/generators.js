function generateMySQL(tables) {
  const lines = [];
  for (const t of tables) {
    if (!t.name || t.columns.length === 0) continue;
    const tn = sanitize(t.name);
    const cols = [];
    const pks = t.columns.filter(c => c.pk).map(c => sanitize(c.name));
    for (const c of t.columns) {
      if (!c.name) continue;
      let def = `  ${quoteIdMySQL(sanitize(c.name))} ${c.type}`;
      if (c.type === 'ENUM' && c.values) def += `(${c.values.split(',').map(v => `'${v.trim()}'`).join(', ')})`;
      else if (c.type === 'VARCHAR') def += `(${c.length || 255})`;
      else if (c.type === 'CHAR') def += `(${c.length || 1})`;
      else if (['FLOAT','DOUBLE','DECIMAL'].includes(c.type) && c.length) def += `(${c.length})`;
      else if (c.length && !['ENUM','TEXT','BLOB','DATE','DATETIME','TIMESTAMP','BOOLEAN','UUID','JSON'].includes(c.type)) def += `(${c.length})`;
      if (c.ai) def += ' AUTO_INCREMENT';
      if (c.nn) def += ' NOT NULL';
      if (c.uq) def += ' UNIQUE';
      if (c.defaultValue) def += ` DEFAULT '${c.defaultValue}'`;
      cols.push(def);
    }
    if (pks.length > 0) cols.push(`  PRIMARY KEY (${pks.map(p => quoteIdMySQL(p)).join(', ')})`);
    for (const r of (t.refs || [])) {
      if (t.columns.some(c => c.name === r.column)) {
        let fkLine = `  FOREIGN KEY (${quoteIdMySQL(sanitize(r.column))}) REFERENCES ${quoteIdMySQL(sanitize(r.refTable))}(${quoteIdMySQL(sanitize(r.refColumn))})`;
        if (r.cardinality) fkLine += ` -- ${r.cardinality}`;
        cols.push(fkLine);
      }
    }
    lines.push(`CREATE TABLE IF NOT EXISTS ${quoteIdMySQL(tn)} (`);
    lines.push(cols.join(',\n'));
    lines.push(`);\n`);
  }
  return lines.join('\n');
}

function generatePostgreSQL(tables) {
  const lines = [];
  for (const t of tables) {
    if (!t.name || t.columns.length === 0) continue;
    const tn = sanitize(t.name);
    const cols = [];
    const pks = t.columns.filter(c => c.pk).map(c => sanitize(c.name));
    for (const c of t.columns) {
      if (!c.name) continue;
      const qt = quoteId(sanitize(c.name));
      let def = `  ${qt} ${pgType(c)}`;
      if (c.ai) def += ' GENERATED ALWAYS AS IDENTITY';
      if (c.nn) def += ' NOT NULL';
      if (c.uq) def += ' UNIQUE';
      if (c.defaultValue) {
        const dv = c.type.toUpperCase() === 'BOOLEAN' ? (c.defaultValue.toLowerCase() === 'true' ? 'TRUE' : 'FALSE') : `'${c.defaultValue}'`;
        def += ` DEFAULT ${dv}`;
      }
      cols.push(def);
    }
    if (pks.length > 0) cols.push(`  PRIMARY KEY (${pks.map(p => quoteId(p)).join(', ')})`);
    for (const r of (t.refs || [])) {
      if (t.columns.some(c => c.name === r.column)) {
        let fkLine = `  FOREIGN KEY (${quoteId(sanitize(r.column))}) REFERENCES ${quoteId(sanitize(r.refTable))}(${quoteId(sanitize(r.refColumn))})`;
        cols.push(fkLine);
      }
    }
    lines.push(`CREATE TABLE IF NOT EXISTS ${quoteId(tn)} (`);
    lines.push(cols.join(',\n'));
    lines.push(`);\n`);
  }
  return lines.join('\n');
}
