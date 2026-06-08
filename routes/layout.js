function layerRectPath(layer) {
  const x = layer.x || 100, y = layer.y || 100, w = layer.w || 300, h = layer.h || 200;
  const r = Math.min(14, Math.min(w, h) * 0.08);
  const path = `M ${x + r},${y} L ${x + w - r},${y} Q ${x + w},${y} ${x + w},${y + r} L ${x + w},${y + h - r} Q ${x + w},${y + h} ${x + w - r},${y + h} L ${x + r},${y + h} Q ${x},${y + h} ${x},${y + h - r} L ${x},${y + r} Q ${x},${y} ${x + r},${y} Z`;
  return { path, x, y, w, h, cx: x + w / 2, cy: y + h / 2 };
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

function segmentsCross(p1, p2, p3, p4) {
  const d1x = p2.x - p1.x, d1y = p2.y - p1.y;
  const d2x = p4.x - p3.x, d2y = p4.y - p3.y;
  const d3x = p3.x - p1.x, d3y = p3.y - p1.y;
  const cross = d1x * d2y - d1y * d2x;
  if (Math.abs(cross) < 1e-10) return false;
  const t = (d3x * d2y - d3y * d2x) / cross;
  const u = (d3x * d1y - d3y * d1x) / cross;
  return t > 0 && t < 1 && u > 0 && u < 1;
}

function getTableRect(t, pos) {
  return { x: pos.x, y: pos.y, w: 310, h: 40 + t.columns.length * 34 + 44 };
}

function detectIssues(tables, positions) {
  const overlaps = [];
  const crossings = [];
  const rects = {};
  for (const t of tables) {
    const p = positions[t.id];
    if (p) rects[t.id] = getTableRect(t, p);
  }
  const ids = Object.keys(rects);
  for (let i = 0; i < ids.length; i++) {
    for (let j = i + 1; j < ids.length; j++) {
      if (rectsOverlap(rects[ids[i]], rects[ids[j]])) {
        const ti = tables.find(t => t.id === ids[i]);
        const tj = tables.find(t => t.id === ids[j]);
        overlaps.push({ a: ti?.name || ids[i], b: tj?.name || ids[j] });
      }
    }
  }
  const lines = [];
  for (const t of tables) {
    const p = positions[t.id];
    if (!p) continue;
    for (const ref of (t.refs || [])) {
      const tgt = tables.find(t2 => t2.name === ref.refTable);
      if (!tgt || !positions[tgt.id]) continue;
      const colH = 34, headerH = 40;
      const srcIdx = t.columns.findIndex(c => c.name === ref.column);
      const tgtIdx = tgt.columns.findIndex(c => c.name === ref.refColumn);
      const sx = p.x + 155;
      const sy = p.y + headerH + (srcIdx >= 0 ? srcIdx * colH + colH / 2 : colH / 2);
      const tx = positions[tgt.id].x + 155;
      const ty = positions[tgt.id].y + headerH + (tgtIdx >= 0 ? tgtIdx * colH + colH / 2 : colH / 2);
      lines.push({ p1: { x: sx, y: sy }, p2: { x: tx, y: ty } });
    }
  }
  for (let i = 0; i < lines.length; i++) {
    for (let j = i + 1; j < lines.length; j++) {
      if (segmentsCross(lines[i].p1, lines[i].p2, lines[j].p1, lines[j].p2)) {
        crossings.push({ a: i, b: j });
      }
    }
  }
  return { overlaps, crossings, total: overlaps.length + crossings.length };
}

function autoLayout(tables) {
  if (!tables.length) return {};
  const positions = {}; const byName = {};
  for (const t of tables) byName[t.name] = t.id;
  const graph = {};
  for (const t of tables) {
    if (!graph[t.name]) graph[t.name] = { refs: [], refdBy: [] };
    for (const r of (t.refs || [])) {
      if (!graph[r.refTable]) graph[r.refTable] = { refs: [], refdBy: [] };
      graph[t.name].refs.push(r.refTable); graph[r.refTable].refdBy.push(t.name);
    }
  }
  const allNames = tables.map(t => t.name); const visited = new Set(); const components = [];
  for (const name of allNames) {
    if (visited.has(name) || !graph[name]) { if (!visited.has(name)) { visited.add(name); components.push([name]); } continue; }
    const comp = []; const queue = [name]; visited.add(name);
    while (queue.length) { const cur = queue.shift(); comp.push(cur); const g = graph[cur]; for (const n of [...g.refs, ...g.refdBy]) { if (!visited.has(n) && graph[n]) { visited.add(n); queue.push(n); } } }
    components.push(comp);
  }
  const cardW = 310, cardH = 40 + 34; const padX = 60; const colGap = 50, rowGap = 60;
  let globalY = 30; const colW = cardW + colGap; const rowH = cardH + rowGap;
  for (let ci = 0; ci < components.length; ci++) {
    const comp = components[ci];
    const roots = comp.filter(n => { const g = graph[n]; return !g || !g.refs.some(r => comp.includes(r)); });
    const layers = {}; const queue = [];
    for (const r of roots.length ? roots : [comp[0]]) { layers[r] = 0; queue.push(r); }
    while (queue.length) { const cur = queue.shift(); const g = graph[cur]; if (!g) continue; for (const child of g.refdBy) { if (!comp.includes(child)) continue; const nl = layers[cur] + 1; if (layers[child] === undefined || layers[child] < nl) { layers[child] = nl; queue.push(child); } } }
    for (const n of comp) { if (layers[n] === undefined) layers[n] = 0; }
    const byLayer = {}; let maxLayer = 0;
    for (const n of comp) { const l = layers[n] || 0; if (!byLayer[l]) byLayer[l] = []; byLayer[l].push(n); maxLayer = Math.max(maxLayer, l); }
    for (let l = 0; l <= maxLayer; l++) { const names = byLayer[l]; if (l === 0) continue; names.sort((a, b) => { const pa = (graph[a]?.refs || []).filter(r => comp.includes(r))[0] || ''; const pb = (graph[b]?.refs || []).filter(r => comp.includes(r))[0] || ''; return (byLayer[l - 1] || []).indexOf(pa) - (byLayer[l - 1] || []).indexOf(pb); }); }
    let maxCols = 0; for (let l = 0; l <= maxLayer; l++) maxCols = Math.max(maxCols, (byLayer[l] || []).length);
    const compW = maxCols * colW - colGap; const compH = (maxLayer + 1) * rowH - rowGap;
    const viewW = 900; const startX = Math.max(padX, (viewW - compW) / 2);
    for (let l = 0; l <= maxLayer; l++) { const names = byLayer[l] || []; const layerW = names.length * colW - colGap; const offsetX = startX + (compW - layerW) / 2; names.forEach((name, i) => { const id = byName[name]; if (id) positions[id] = { x: offsetX + i * colW, y: globalY + l * rowH }; }); }
    globalY += compH + 80;
  }
  return positions;
}

function arrangeTables(tables, positions) {
  const newPos = {};
  const byName = {};
  for (const t of tables) byName[t.name] = t.id;
  const graph = {};
  for (const t of tables) {
    if (!graph[t.name]) graph[t.name] = { refs: [], refdBy: [] };
    for (const r of (t.refs || [])) {
      if (!graph[r.refTable]) graph[r.refTable] = { refs: [], refdBy: [] };
      graph[t.name].refs.push(r.refTable);
      graph[r.refTable].refdBy.push(t.name);
    }
  }
  const allNames = tables.map(t => t.name);
  const visited = new Set();
  const components = [];
  for (const name of allNames) {
    if (visited.has(name)) continue;
    const comp = []; const queue = [name]; visited.add(name);
    while (queue.length) {
      const cur = queue.shift(); comp.push(cur);
      const g = graph[cur];
      if (g) for (const n of [...g.refs, ...g.refdBy]) {
        if (!visited.has(n) && graph[n]) { visited.add(n); queue.push(n); }
      }
    }
    components.push(comp);
  }
  const cardW = 310;
  const colGap = 80; const rowGap = 100;
  let globalY = 30;
  for (let ci = 0; ci < components.length; ci++) {
    const compNames = components[ci];
    const layers = {}; const queue = [];
    const roots = compNames.filter(n => { const g = graph[n]; return !g || !g.refs.some(r => compNames.includes(r)); });
    for (const r of roots.length ? roots : [compNames[0]]) { layers[r] = 0; queue.push(r); }
    while (queue.length) {
      const cur = queue.shift(); const g = graph[cur];
      if (!g) continue;
      for (const child of g.refdBy) {
        if (!compNames.includes(child)) continue;
        const nl = layers[cur] + 1;
        if (layers[child] === undefined || layers[child] < nl) { layers[child] = nl; queue.push(child); }
      }
    }
    for (const n of compNames) { if (layers[n] === undefined) layers[n] = 0; }
    const byLayer = {}; let maxLayer = 0;
    for (const n of compNames) {
      const l = layers[n] || 0;
      if (!byLayer[l]) byLayer[l] = []; byLayer[l].push(n);
      maxLayer = Math.max(maxLayer, l);
    }
    for (let l = 1; l <= maxLayer; l++) {
      const prevLayer = byLayer[l - 1] || [];
      const curLayer = byLayer[l] || [];
      const barycenters = curLayer.map(name => {
        const g = graph[name];
        const preds = (g?.refs || []).filter(r => compNames.includes(r));
        if (preds.length === 0) return { name, bc: -1 };
        let sum = 0;
        for (const p of preds) { const idx = prevLayer.indexOf(p); if (idx >= 0) sum += idx; }
        return { name, bc: sum / preds.length };
      });
      barycenters.sort((a, b) => a.bc - b.bc);
      byLayer[l] = barycenters.map(b => b.name);
    }
    let maxCols = 0;
    for (let l = 0; l <= maxLayer; l++) maxCols = Math.max(maxCols, (byLayer[l] || []).length);
    const rowH = Math.max(rowGap, ...compNames.map(n => { const t = tables.find(t => t.name === n); return t ? 40 + t.columns.length * 34 + 44 + rowGap : rowGap; }));
    for (let l = 0; l <= maxLayer; l++) {
      const names = byLayer[l] || [];
      const layerW = names.length * colGap;
      const startX = Math.max(60, (900 - layerW) / 2);
      names.forEach((name, i) => {
        const id = byName[name];
        if (id) {
          const t = tables.find(t => t.id === id);
          const yOff = (rowH - (t ? 40 + t.columns.length * 34 + 44 : 200)) / 2;
          newPos[id] = { x: startX + i * colGap, y: globalY + l * rowH + yOff };
        }
      });
    }
    const compH = (maxLayer + 1) * rowH + 20;
    globalY += compH + 80;
    let anyOverlap = true; let iter = 0;
    while (anyOverlap && iter < 20) {
      anyOverlap = false; iter++;
      for (let l = 0; l <= maxLayer; l++) {
        const names = byLayer[l] || [];
        for (let i = 0; i < names.length; i++) {
          for (let j = i + 1; j < names.length; j++) {
            const idA = byName[names[i]], idB = byName[names[j]];
            if (!idA || !idB || !newPos[idA] || !newPos[idB]) continue;
            const tA = tables.find(t => t.id === idA), tB = tables.find(t => t.id === idB);
            if (!tA || !tB) continue;
            const rA = getTableRect(tA, newPos[idA]);
            const rB = getTableRect(tB, newPos[idB]);
            if (rectsOverlap(rA, rB)) { anyOverlap = true; newPos[idB] = { x: newPos[idB].x + cardW / 2, y: newPos[idB].y + 20 }; }
          }
        }
      }
    }
  }
  return newPos;
}

function sortByName(tables) {
  const sorted = [...tables].sort((a, b) => a.name.localeCompare(b.name));
  const positions = {};
  const cols = 4, gapX = 80, gapY = 100, startX = 60, startY = 30;
  sorted.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const h = 40 + t.columns.length * 34 + 44;
    positions[t.id] = { x: startX + col * (310 + gapX), y: startY + row * (h + gapY) };
  });
  return positions;
}

function sortByNameDesc(tables) {
  const sorted = [...tables].sort((a, b) => b.name.localeCompare(a.name));
  const positions = {};
  const cols = 4, gapX = 80, gapY = 100, startX = 60, startY = 30;
  sorted.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const h = 40 + t.columns.length * 34 + 44;
    positions[t.id] = { x: startX + col * (310 + gapX), y: startY + row * (h + gapY) };
  });
  return positions;
}

function sortByColumns(tables, asc = true) {
  const sorted = [...tables].sort((a, b) => asc ? a.columns.length - b.columns.length : b.columns.length - a.columns.length);
  const positions = {};
  const cols = 4, gapX = 80, gapY = 100, startX = 60, startY = 30;
  sorted.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const h = 40 + t.columns.length * 34 + 44;
    positions[t.id] = { x: startX + col * (310 + gapX), y: startY + row * (h + gapY) };
  });
  return positions;
}

function sortByCategory(tables, tableCategory, categories) {
  const catOrder = categories.map(c => c.id);
  const sorted = [...tables].sort((a, b) => {
    const ca = tableCategory[a.id], cb = tableCategory[b.id];
    if (ca && !cb) return -1;
    if (!ca && cb) return 1;
    if (ca && cb) return catOrder.indexOf(ca) - catOrder.indexOf(cb);
    return a.name.localeCompare(b.name);
  });
  const positions = {};
  const cols = 4, gapX = 80, gapY = 100, startX = 60, startY = 30;
  sorted.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const h = 40 + t.columns.length * 34 + 44;
    positions[t.id] = { x: startX + col * (310 + gapX), y: startY + row * (h + gapY) };
  });
  return positions;
}

function sortByColor(tables) {
  const sorted = [...tables].sort((a, b) => (a.color || '#6366f1').localeCompare(b.color || '#6366f1'));
  const positions = {};
  const cols = 4, gapX = 80, gapY = 100, startX = 60, startY = 30;
  sorted.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const h = 40 + t.columns.length * 34 + 44;
    positions[t.id] = { x: startX + col * (310 + gapX), y: startY + row * (h + gapY) };
  });
  return positions;
}

function sortGrid(tables, cols = 3) {
  const positions = {};
  const gapX = 80, gapY = 100, startX = 60, startY = 30;
  tables.forEach((t, i) => {
    const col = i % cols, row = Math.floor(i / cols);
    const h = 40 + t.columns.length * 34 + 44;
    positions[t.id] = { x: startX + col * (310 + gapX), y: startY + row * (h + gapY) };
  });
  return positions;
}
