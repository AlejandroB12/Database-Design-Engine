const EXPORT_SCALE = 2;
const PAD = 60;

let exportPending = false;

function yieldToBrowser() {
  return new Promise(resolve => setTimeout(resolve, 4));
}

function showLoadingOverlay() {
  let el = document.getElementById('export-loading');
  if (!el) {
    el = document.createElement('div');
    el.id = 'export-loading';
    el.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(13,17,23,0.7);backdrop-filter:blur(4px)';
    el.innerHTML = '<div style="background:#21262d;border:1px solid #30363d;border-radius:12px;padding:24px 32px;text-align:center;box-shadow:0 16px 48px rgba(0,0,0,0.5)"><div style="width:32px;height:32px;border:3px solid #30363d;border-top-color:#58a6ff;border-radius:50%;animation:spin 0.8s linear infinite;margin:0 auto 12px"></div><div style="color:#c9d1d9;font-size:14px;font-family:sans-serif">Exportando diagrama...</div></div>';
    const s = document.createElement('style');
    s.textContent = '@keyframes spin{to{transform:rotate(360deg)}}';
    el.appendChild(s);
    document.body.appendChild(el);
  }
  el.style.display = 'flex';
}

function hideLoadingOverlay() {
  const el = document.getElementById('export-loading');
  if (el) el.style.display = 'none';
}

function computeBounds() {
  const canvas = document.querySelector('.diagram-canvas');
  if (!canvas) return null;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  canvas.querySelectorAll('.table-card').forEach(el => {
    const l = parseFloat(el.style.left) || 0;
    const t = parseFloat(el.style.top) || 0;
    const w = el.offsetWidth || 310;
    const h = el.offsetHeight || 100;
    minX = Math.min(minX, l);
    minY = Math.min(minY, t);
    maxX = Math.max(maxX, l + w);
    maxY = Math.max(maxY, t + h);
  });
  const svg = canvas.querySelector('.diagram-svg');
  if (svg) {
    svg.querySelectorAll('path').forEach(p => {
      try {
        const bb = p.getBBox();
        if ((bb.width > 0 || bb.height > 0) && bb.width < 2000 && bb.height < 2000) {
          minX = Math.min(minX, bb.x);
          minY = Math.min(minY, bb.y);
          maxX = Math.max(maxX, bb.x + bb.width);
          maxY = Math.max(maxY, bb.y + bb.height);
        }
      } catch (e) {}
    });
  }
  if (!isFinite(minX)) return { minX: 0, minY: 0, maxX: 1200, maxY: 800, w: 1200, h: 800 };
  return { minX, minY, maxX, maxY, w: maxX - minX + PAD * 2, h: maxY - minY + PAD * 2 };
}

const TYPE_COLOR_MAP = { INT:'#6366f1', BIGINT:'#6366f1', SMALLINT:'#6366f1', TINYINT:'#6366f1', VARCHAR:'#22c55e', CHAR:'#22c55e', TEXT:'#22c55e', MEDIUMTEXT:'#22c55e', LONGTEXT:'#22c55e', BOOLEAN:'#f59e0b', DATE:'#06b6d4', DATETIME:'#06b6d4', TIMESTAMP:'#06b6d4', FLOAT:'#ec4899', DOUBLE:'#ec4899', DECIMAL:'#ec4899', BLOB:'#8b5cf6', ENUM:'#f97316', UUID:'#14b8a6', JSON:'#84cc16' };

function getCardData(card) {
  const left = parseFloat(card.style.left) || 0;
  const top = parseFloat(card.style.top) || 0;
  const w = card.offsetWidth || 310;
  const h = card.offsetHeight || 200;

  const header = card.querySelector('.cursor-grab');
  const headerText = header ? header.querySelector('h3') : null;
  const tableName = headerText ? headerText.textContent : 'sin nombre';
  const colCount = card.querySelectorAll('[data-col-badge="true"]').length;

  const colorEl = header ? header.querySelector('.rounded-sm') : null;
  let tableColor = '#6366f1';
  if (colorEl && colorEl.style.backgroundColor) {
    tableColor = rgbToHex(colorEl.style.backgroundColor);
  }

  const headerH = header ? header.offsetHeight || 36 : 36;

  const colBadges = card.querySelectorAll('[data-col-badge="true"]');
  const columns = [];
  for (const el of colBadges) {
    const spans = el.querySelectorAll('span');
    const type = spans[0] ? spans[0].textContent.trim() : '';
    const name = spans[1] ? spans[1].textContent.trim() : '';
    let isPk = false, isFk = false, isUq = false, isNn = false, isAi = false;
    const constraintDiv = el.querySelector('[class*="shrink-0"]');
    if (constraintDiv) {
      for (const node of constraintDiv.childNodes) {
        if (node.nodeType === 1) {
          const t = node.textContent.trim();
          if (t === 'PK') isPk = true;
          else if (t === 'FK') isFk = true;
          else if (t === 'UQ') isUq = true;
          else if (t === 'NN') isNn = true;
          else if (t === 'AI') isAi = true;
        }
      }
    }
    const hasAccent = isPk || isFk || isUq;
    let accentColor = null;
    if (isPk) accentColor = '#d29922';
    else if (isFk) accentColor = '#a371f7';
    else if (isUq) accentColor = '#58a6ff';
    columns.push({ type, name, isPk, isFk, isUq, isNn, isAi, hasAccent, accentColor, typeColor: TYPE_COLOR_MAP[type] || '#8b949e', offsetY: el.offsetTop });
  }

  return { left, top, w, h, tableName, colCount, tableColor, columns, headerH };
}

function rgbToHex(rgb) {
  if (!rgb) return '#6366f1';
  const m = rgb.match(/^rgba?\((\d+),\s*(\d+),\s*(\d+)/);
  if (!m) return rgb;
  return '#' + [m[1], m[2], m[3]].map(x => parseInt(x).toString(16).padStart(2, '0')).join('');
}

function drawCard(ctx, data, tableColorOverride) {
  const { left, top, w, h, tableName, colCount, tableColor: origColor, columns } = data;
  const tableColor = tableColorOverride || origColor;
  const x = left, y = top;
  const r = 8;

  // Shadow
  ctx.save();
  ctx.shadowColor = 'rgba(0,0,0,0.4)';
  ctx.shadowBlur = 30;
  ctx.shadowOffsetY = 8;
  ctx.shadowOffsetX = 0;

  // Card background
  const grad = ctx.createLinearGradient(x, y, x, y + h);
  grad.addColorStop(0, 'rgba(22,27,34,0.88)');
  grad.addColorStop(1, 'rgba(13,17,23,0.94)');
  ctx.fillStyle = grad;
  roundRect(ctx, x, y, w, h, r);
  ctx.fill();
  ctx.restore();

  // Left accent border
  ctx.save();
  ctx.fillStyle = tableColor + '80';
  roundRect(ctx, x + 1, y + 12, 3, h - 24, 1.5);
  ctx.fill();
  ctx.restore();

  // Header gradient
  const hdrH = data.headerH;
  const hdrGrad = ctx.createLinearGradient(x, y, x, y + hdrH);
  hdrGrad.addColorStop(0, tableColor + '25');
  hdrGrad.addColorStop(1, tableColor + '05');
  ctx.save();
  ctx.fillStyle = hdrGrad;
  roundRect(ctx, x, y, w, hdrH, { tl: r, tr: r, bl: 0, br: 0 });
  ctx.fill();
  ctx.restore();

  // Color indicator dot
  ctx.save();
  ctx.shadowColor = tableColor + '50';
  ctx.shadowBlur = 8;
  ctx.fillStyle = tableColor;
  roundRect(ctx, x + 14, y + (hdrH - 10) / 2, 10, 10, 2);
  ctx.fill();
  ctx.restore();

  // Table name
  ctx.save();
  ctx.fillStyle = '#e6edf3';
  ctx.font = '600 14px "Segoe UI", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  const nameX = x + 30;
  const nameMaxW = w - 110;
  const displayName = truncateText(tableName, ctx, nameMaxW);
  ctx.fillText(displayName, nameX, y + hdrH / 2);
  ctx.restore();

  // Column count
  ctx.save();
  ctx.fillStyle = '#6e7681';
  ctx.font = '500 11px "Segoe UI", system-ui, sans-serif';
  ctx.textBaseline = 'middle';
  ctx.textAlign = 'right';
  ctx.fillText(colCount + ' col.', x + w - 14, y + hdrH / 2);
  ctx.restore();

  // Columns
  for (let ci = 0; ci < columns.length; ci++) {
    const col = columns[ci];
    const cy = y + col.offsetY;
    const isLast = ci === columns.length - 1;

    // Row background
    ctx.save();
    ctx.fillStyle = 'rgba(13,17,23,0.3)';
    ctx.fillRect(x + 1, cy, w - 2, 34);
    ctx.restore();

    // Type badge
    const badgeX = x + 16;
    const badgeText = col.type;
    ctx.save();
    ctx.font = '600 10px "Consolas", "Courier New", monospace';
    const badgeW = ctx.measureText(badgeText).width + 16;
    ctx.fillStyle = col.typeColor + '12';
    roundRect(ctx, badgeX, cy + 7, badgeW, 20, 4);
    ctx.fill();
    ctx.strokeStyle = col.typeColor + '25';
    ctx.lineWidth = 1;
    roundRect(ctx, badgeX, cy + 7, badgeW, 20, 4);
    ctx.stroke();
    ctx.fillStyle = col.typeColor;
    ctx.font = '600 10px "Consolas", "Courier New", monospace';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'center';
    ctx.fillText(badgeText, badgeX + badgeW / 2, cy + 17);
    ctx.restore();

    // Calculate constraint badges width for name positioning
    ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
    let constraintW = 0;
    const cParts = [];
    if (col.isPk) cParts.push({ label: 'PK', color: '#d29922' });
    if (col.isFk && !col.isPk) cParts.push({ label: 'FK', color: '#a371f7' });
    if (col.isUq && !col.isPk) cParts.push({ label: 'UQ', color: '#58a6ff' });
    if (col.isNn) cParts.push({ label: 'NN', color: '#f85149' });
    if (col.isAi) cParts.push({ label: 'AI', color: '#3fb950' });
    for (const cp of cParts) constraintW += ctx.measureText(cp.label).width + 16;

    // Column name
    const nameX2 = badgeX + badgeW + 10;
    const nameMaxW2 = Math.max(20, x + w - nameX2 - constraintW - 20);
    ctx.save();
    ctx.fillStyle = '#c9d1d9';
    ctx.font = '500 13px "Segoe UI", system-ui, sans-serif';
    ctx.textBaseline = 'middle';
    ctx.textAlign = 'left';
    const dispName = truncateText(col.name, ctx, nameMaxW2);
    ctx.fillText(dispName, nameX2, cy + 17);
    ctx.restore();

    // Constraint badges
    let cx2 = x + w - 14;
    for (const cp of cParts) {
      ctx.save();
      ctx.font = '700 9px "Segoe UI", system-ui, sans-serif';
      const cw = ctx.measureText(cp.label).width + 12;
      const cbx = cx2 - cw;
      ctx.fillStyle = cp.color + '18';
      roundRect(ctx, cbx, cy + 8, cw, 18, 10);
      ctx.fill();
      ctx.strokeStyle = cp.color + '35';
      ctx.lineWidth = 1;
      roundRect(ctx, cbx, cy + 8, cw, 18, 10);
      ctx.stroke();
      ctx.fillStyle = cp.color;
      ctx.textBaseline = 'middle';
      ctx.textAlign = 'center';
      ctx.fillText(cp.label, cbx + cw / 2, cy + 17);
      ctx.restore();
      cx2 = cbx - 4;
    }


  }
}

function roundRect(ctx, x, y, w, h, r) {
  if (typeof r === 'number') r = { tl: r, tr: r, bl: r, br: r };
  else if (!r) r = { tl: 0, tr: 0, bl: 0, br: 0 };
  ctx.beginPath();
  ctx.moveTo(x + r.tl, y);
  ctx.lineTo(x + w - r.tr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r.tr);
  ctx.lineTo(x + w, y + h - r.br);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r.br, y + h);
  ctx.lineTo(x + r.bl, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r.bl);
  ctx.lineTo(x, y + r.tl);
  ctx.quadraticCurveTo(x, y, x + r.tl, y);
  ctx.closePath();
}

function truncateText(text, ctx, maxWidth) {
  if (ctx.measureText(text).width <= maxWidth) return text;
  let truncated = text;
  while (truncated.length > 1 && ctx.measureText(truncated + '...').width > maxWidth) {
    truncated = truncated.slice(0, -1);
  }
  return truncated + '...';
}

async function captureDiagram(options = {}) {
  const tableColor = options.tableColor || null;
  console.log('[Export] Usando Canvas 2D nativo (sin html2canvas)');
  const diagramCanvas = document.querySelector('.diagram-canvas');
  if (!diagramCanvas) return Promise.reject('No se encontro el diagrama');

  const svgEl = diagramCanvas.querySelector('.diagram-svg');
  const cardEls = diagramCanvas.querySelectorAll('.table-card');
  const bounds = computeBounds();
  if (!bounds) return Promise.reject('No se pudieron calcular los limites');

  const outW = Math.round(bounds.w * EXPORT_SCALE);
  const outH = Math.round(bounds.h * EXPORT_SCALE);
  const outCanvas = document.createElement('canvas');
  outCanvas.width = outW;
  outCanvas.height = outH;
  const ctx = outCanvas.getContext('2d');
  ctx.scale(EXPORT_SCALE, EXPORT_SCALE);

  // Background
  ctx.fillStyle = '#21262d';
  ctx.fillRect(0, 0, bounds.w, bounds.h);

  // SVG connections
  if (svgEl) {
    const clone = svgEl.cloneNode(true);
    clone.querySelectorAll('[filter]').forEach(el => el.removeAttribute('filter'));
    clone.querySelectorAll('path').forEach(el => {
      el.removeAttribute('filter');
      const op = parseFloat(el.getAttribute('opacity') || '1');
      if (op < 0.4) el.setAttribute('opacity', '0.7');
    });
    clone.querySelectorAll('image').forEach(el => el.remove());
    clone.querySelectorAll('rect[stroke-dasharray]').forEach(el => el.remove());
    clone.querySelectorAll('g[opacity][fill="none"]').forEach(el => el.remove());
    clone.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
    clone.setAttribute('width', bounds.w);
    clone.setAttribute('height', bounds.h);
    clone.setAttribute('viewBox', `${bounds.minX - PAD} ${bounds.minY - PAD} ${bounds.w} ${bounds.h}`);

    try {
      const str = new XMLSerializer().serializeToString(clone);
      const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(str)));
      const svgImage = await new Promise(resolve => {
        const img = new Image();
        img.onload = () => resolve(img);
        img.onerror = () => resolve(null);
        img.src = dataUrl;
      });
      if (svgImage) {
        ctx.drawImage(svgImage, bounds.minX - PAD, bounds.minY - PAD, bounds.w, bounds.h);
      }
    } catch(e) {}
  }

  // Collect card data
  const cardsData = Array.from(cardEls).map(card => getCardData(card));

  // Draw cards (yield every 3 to unblock UI)
  for (let i = 0; i < cardsData.length; i++) {
    if (i % 3 === 0) await yieldToBrowser();
    drawCard(ctx, cardsData[i], tableColor);
  }

  return outCanvas;
}

function showPreview(canvas, format) {
  return new Promise(resolve => {
    const dataUrl = canvas.toDataURL('image/png');
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99999;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,0.8)';

    const maxW = window.innerWidth * 0.85;
    const maxH = window.innerHeight * 0.75;
    let imgW = canvas.width / EXPORT_SCALE;
    let imgH = canvas.height / EXPORT_SCALE;
    if (imgW > maxW) { imgH = imgH * maxW / imgW; imgW = maxW; }
    if (imgH > maxH) { imgW = imgW * maxH / imgH; imgH = maxH; }

    let zoom = 1;
    const minZoom = 1;
    const maxZoom = 4;

    function btnStyle(bg, text, border) {
      return `padding:6px 14px;border:${border || 'none'};border-radius:6px;background:${bg};color:${text};font-size:13px;font-weight:600;cursor:pointer;font-family:sans-serif;display:flex;align-items:center;gap:4px`;
    }
    const box = document.createElement('div');
    box.style.cssText = 'background:transparent;border:1px solid #30363d;border-radius:12px;padding:20px;max-width:92vw;max-height:92vh;display:flex;flex-direction:column;box-shadow:0 24px 80px rgba(0,0,0,0.6)';

    const title = document.createElement('div');
    title.style.cssText = 'color:#c9d1d9;font-size:14px;font-family:sans-serif;font-weight:600;margin-bottom:10px;text-align:center';
    title.textContent = 'Vista previa - ' + format.toUpperCase();

    const imgWrap = document.createElement('div');
    imgWrap.style.cssText = `overflow:hidden;max-width:${maxW}px;max-height:${maxH}px;border-radius:8px;border:1px solid #30363d;cursor:grab;position:relative`;
    imgWrap.style.userSelect = 'none';

    const img = document.createElement('img');
    img.src = dataUrl;
    img.draggable = false;
    img.style.cssText = `display:block;transform-origin:0 0;width:${imgW}px;height:${imgH}px`;

    let isDragging = false, startX, startY, startScrollLeft, startScrollTop;

    imgWrap.addEventListener('wheel', e => {
      e.preventDefault();
      const rect = imgWrap.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const prev = zoom;
      zoom = Math.max(minZoom, Math.min(maxZoom, zoom * (e.deltaY < 0 ? 1.2 : 1 / 1.2)));
      img.style.transform = `scale(${zoom})`;
      zoomLabel.textContent = Math.round(zoom * 100) + '%';
      imgWrap.scrollLeft = (mx + imgWrap.scrollLeft) * (zoom / prev) - mx;
      imgWrap.scrollTop = (my + imgWrap.scrollTop) * (zoom / prev) - my;
    }, { passive: false });

    imgWrap.addEventListener('mousedown', e => {
      if (e.button !== 0) return;
      isDragging = true;
      startX = e.clientX;
      startY = e.clientY;
      startScrollLeft = imgWrap.scrollLeft;
      startScrollTop = imgWrap.scrollTop;
      imgWrap.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', e => {
      if (!isDragging) return;
      e.preventDefault();
      imgWrap.scrollLeft = startScrollLeft - (e.clientX - startX);
      imgWrap.scrollTop = startScrollTop - (e.clientY - startY);
    });

    window.addEventListener('mouseup', () => {
      if (isDragging) {
        isDragging = false;
        imgWrap.style.cursor = 'grab';
      }
    });

    imgWrap.appendChild(img);

    const btnRow = document.createElement('div');
    btnRow.style.cssText = 'display:flex;gap:8px;justify-content:center;margin-top:10px;align-items:center;flex-wrap:wrap';

    function updateZoom() {
      img.style.transform = `scale(${zoom})`;
      zoomLabel.textContent = Math.round(zoom * 100) + '%';
      imgWrap.scrollLeft = (imgWrap.scrollWidth - imgWrap.clientWidth) / 2;
      imgWrap.scrollTop = (imgWrap.scrollHeight - imgWrap.clientHeight) / 2;
    }

    const zoomOutBtn = document.createElement('button');
    zoomOutBtn.innerHTML = '−';
    zoomOutBtn.title = 'Alejar';
    zoomOutBtn.style.cssText = btnStyle('#21262d', '#c9d1d9', '1px solid #30363d');
    zoomOutBtn.onclick = () => { zoom = Math.max(minZoom, zoom / 1.4); updateZoom(); };

    const zoomInBtn = document.createElement('button');
    zoomInBtn.innerHTML = '+';
    zoomInBtn.title = 'Acercar';
    zoomInBtn.style.cssText = btnStyle('#21262d', '#c9d1d9', '1px solid #30363d');
    zoomInBtn.onclick = () => { zoom = Math.min(maxZoom, zoom * 1.4); updateZoom(); };

    const zoomLabel = document.createElement('span');
    zoomLabel.style.cssText = 'color:#8b949e;font-size:12px;font-family:sans-serif;min-width:36px;text-align:center';
    zoomLabel.textContent = '100%';

    const dlBtn = document.createElement('button');
    dlBtn.textContent = 'Descargar ' + format.toUpperCase();
    dlBtn.style.cssText = btnStyle('#238636', '#fff');
    dlBtn.onmouseover = () => dlBtn.style.background = '#2ea043';
    dlBtn.onmouseout = () => dlBtn.style.background = '#238636';

    const cancelBtn = document.createElement('button');
    cancelBtn.textContent = 'Cancelar';
    cancelBtn.style.cssText = btnStyle('transparent', '#8b949e', '1px solid #30363d');
    cancelBtn.onmouseover = () => cancelBtn.style.background = '#21262d';
    cancelBtn.onmouseout = () => cancelBtn.style.background = 'transparent';

    btnRow.appendChild(zoomOutBtn);
    btnRow.appendChild(zoomLabel);
    btnRow.appendChild(zoomInBtn);
    btnRow.appendChild(dlBtn);
    btnRow.appendChild(cancelBtn);
    box.appendChild(title);
    box.appendChild(imgWrap);
    box.appendChild(btnRow);
    overlay.appendChild(box);
    document.body.appendChild(overlay);

    dlBtn.onclick = () => {
      document.body.removeChild(overlay);
      resolve(canvas);
    };
    cancelBtn.onclick = () => { document.body.removeChild(overlay); resolve(null); };
    overlay.onclick = (e) => { if (e.target === overlay) { document.body.removeChild(overlay); resolve(null); } };
  });
}

async function exportPNG(filename) {
  if (exportPending) return;
  const btn = document.querySelector('[data-export="png"]');
  if (btn) { btn.dataset.originalHtml = btn.innerHTML; btn.innerHTML = '...'; btn.disabled = true; }
  exportPending = true;
  showLoadingOverlay();
  await yieldToBrowser();
  captureDiagram().then(async canvas => {
    hideLoadingOverlay();
    const resultCanvas = await showPreview(canvas, 'png');
    if (resultCanvas) {
      resultCanvas.toBlob(blob => {
        downloadBlob(blob, filename || 'diagrama.png');
        restoreExportBtn(btn, 'png');
        exportPending = false;
      }, 'image/png');
    } else {
      restoreExportBtn(btn, 'png');
      exportPending = false;
    }
  }).catch(() => { restoreExportBtn(btn, 'png'); exportPending = false; hideLoadingOverlay(); });
}

async function exportPDF(filename) {
  if (exportPending) return;
  const btn = document.querySelector('[data-export="pdf"]');
  if (btn) { btn.dataset.originalHtml = btn.innerHTML; btn.innerHTML = '...'; btn.disabled = true; }
  exportPending = true;
  showLoadingOverlay();
  await yieldToBrowser();
  captureDiagram().then(async canvas => {
    hideLoadingOverlay();
    const resultCanvas = await showPreview(canvas, 'pdf');
    if (resultCanvas) {
      const imgData = resultCanvas.toDataURL('image/png');
      const { PDFDocument } = PDFLib;
      const w = resultCanvas.width / EXPORT_SCALE;
      const h = resultCanvas.height / EXPORT_SCALE;
      const pdfDoc = await PDFDocument.create();
      const pngImageBytes = await fetch(imgData).then(r => r.arrayBuffer());
      const pngImage = await pdfDoc.embedPng(pngImageBytes);
      const page = pdfDoc.addPage([w, h]);
      page.drawImage(pngImage, { x: 0, y: 0, width: w, height: h });
      const pdfBytes = await pdfDoc.save();
      downloadBlob(new Blob([pdfBytes], { type: 'application/pdf' }), filename || 'diagrama.pdf');
    }
    restoreExportBtn(btn, 'pdf');
    exportPending = false;
  }).catch(() => { restoreExportBtn(btn, 'pdf'); exportPending = false; hideLoadingOverlay(); });
}

function restoreExportBtn(btn, type) {
  if (!btn) return;
  if (btn.dataset.originalHtml) { btn.innerHTML = btn.dataset.originalHtml; delete btn.dataset.originalHtml; }
  else {
    const icons = { png: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>', pdf: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' };
    btn.innerHTML = icons[type] || '';
  }
  btn.disabled = false;
}

function downloadBlob(blob, filename) {
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(a.href);
}
