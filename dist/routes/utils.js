const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const TABLE_COLORS = ['#6366f1','#ec4899','#22c55e','#f59e0b','#06b6d4','#8b5cf6','#f97316','#84cc16'];
const sanitize = (s) => s.replace(/[^a-zA-Z0-9_\u00C0-\u00FF]/g, '_').replace(/^(\d)/, '_$1') || 'col';

function toSnakeCase(s) {
  return s.replace(/([A-Z\u00C0-\u00FF])/g, '_$1').toLowerCase().replace(/^_/, '');
}

function toPascalCase(s) {
  return s.replace(/[^a-zA-Z0-9_]/g, '_').split('_').filter(Boolean).map(w => w[0].toUpperCase() + w.slice(1).toLowerCase()).join('') || 'Model';
}

function toPlural(s) {
  const lower = s.toLowerCase();
  if (lower.endsWith('s') || lower.endsWith('x') || lower.endsWith('z') || lower.endsWith('ch') || lower.endsWith('sh')) return s + 'es';
  if (lower.endsWith('y') && !/[aeiou]y/.test(lower)) return s.slice(0, -1) + 'ies';
  return s + 's';
}

function quoteId(name) {
  return `"${name}"`;
}

function quoteIdMySQL(name) {
  return `\`${name}\``;
}

function pgType(col) {
  const t = col.type.toUpperCase();
  if (['INT','INTEGER'].includes(t)) return 'INTEGER';
  if (['BIGINT'].includes(t)) return 'BIGINT';
  if (['SMALLINT'].includes(t)) return 'SMALLINT';
  if (['TINYINT'].includes(t)) return 'SMALLINT';
  if (['VARCHAR'].includes(t)) return `VARCHAR(${col.length || 255})`;
  if (['CHAR'].includes(t)) return `CHAR(${col.length || 1})`;
  if (['TEXT','MEDIUMTEXT','LONGTEXT'].includes(t)) return 'TEXT';
  if (['FLOAT','DOUBLE','DECIMAL'].includes(t)) return t === 'FLOAT' ? 'REAL' : 'DOUBLE PRECISION';
  if (['BOOLEAN'].includes(t)) return 'BOOLEAN';
  if (['DATE'].includes(t)) return 'DATE';
  if (['DATETIME','TIMESTAMP'].includes(t)) return 'TIMESTAMP';
  if (['BLOB'].includes(t)) return 'BYTEA';
  if (['UUID'].includes(t)) return 'UUID';
  if (['JSON'].includes(t)) return 'JSONB';
  if (['ENUM'].includes(t)) return 'VARCHAR(50)';
  return 'VARCHAR(255)';
}

const COLUMN_TYPES = ['INT','BIGINT','SMALLINT','TINYINT','VARCHAR','CHAR','TEXT','MEDIUMTEXT','LONGTEXT','BOOLEAN','DATE','DATETIME','TIMESTAMP','FLOAT','DOUBLE','DECIMAL','BLOB','ENUM','UUID','JSON'];

const BTN_STYLES = { pk: 'bg-[#d29922]/20 border-[#d29922]/50 text-[#d29922]', ai: 'bg-[#238636]/20 border-[#238636]/50 text-[#3fb950]', nn: 'bg-[#f85149]/20 border-[#f85149]/50 text-[#f85149]', uq: 'bg-[#58a6ff]/20 border-[#58a6ff]/50 text-[#58a6ff]' };

function highlightSql(code) {
  const keywords = new Set(['SELECT','FROM','WHERE','AND','OR','NOT','IN','IS','NULL','AS','ON','JOIN','LEFT','RIGHT','INNER','OUTER','FULL','CROSS','NATURAL','CREATE','TABLE','IF','NOT','EXISTS','ALTER','ADD','DROP','COLUMN','INDEX','KEY','UNIQUE','CONSTRAINT','FOREIGN','REFERENCES','PRIMARY','INSERT','INTO','VALUES','UPDATE','SET','DELETE','INT','BIGINT','SMALLINT','TINYINT','VARCHAR','CHAR','TEXT','MEDIUMTEXT','LONGTEXT','BOOLEAN','DATE','DATETIME','TIMESTAMP','FLOAT','DOUBLE','DECIMAL','BLOB','ENUM','UUID','JSON','AUTO_INCREMENT','DEFAULT','CASCADE','SET','NULL','NO','ACTION','RESTRICT','ENGINE','InnoDB','MyISAM','CHARSET','COLLATE','ORDER','BY','ASC','DESC','GROUP','HAVING','LIMIT','OFFSET','CASE','WHEN','THEN','ELSE','END','DISTINCT','ALL','ANY','LIKE','BETWEEN','ESCAPE','TRUE','FALSE']);
  const tokens = [];
  const re = /('(?:[^'\\]|\\.)*')|(`(?:[^`\\]|\\.)*`)|(--[^\n]*)|(\/\*[\s\S]*?\*\/)|(\b\d+(?:\.\d+)?\b)|(\b[a-zA-Z_\u00C0-\u00FF][\w\u00C0-\u00FF]*\b)|([;,\.\(\)\[\]+\-*/=<>!])|(\s+)/g;
  let last = 0, match;
  while ((match = re.exec(code)) !== null) {
    if (match.index > last) tokens.push({ text: code.slice(last, match.index), cls: '' });
    if (match[1]) tokens.push({ text: match[1], cls: 'sql-string' }); else if (match[2]) tokens.push({ text: match[2], cls: 'sql-backtick' });
    else if (match[3]) tokens.push({ text: match[3], cls: 'sql-comment' }); else if (match[4]) tokens.push({ text: match[4], cls: 'sql-comment' });
    else if (match[5]) tokens.push({ text: match[5], cls: 'sql-number' }); else if (match[6]) tokens.push({ text: match[6], cls: keywords.has(match[6].toUpperCase()) ? 'sql-keyword' : '' });
    else if (match[7]) tokens.push({ text: match[7], cls: 'sql-operator' }); else if (match[8]) tokens.push({ text: match[8], cls: '' });
    last = match.index + match[0].length;
  }
  if (last < code.length) tokens.push({ text: code.slice(last), cls: '' });
  return tokens.map(t => t.cls ? `<span class="${t.cls}">${t.text.replace(/</g,'&lt;')}</span>` : t.text.replace(/</g,'&lt;')).join('');
}
