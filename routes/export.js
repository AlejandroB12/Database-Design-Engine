function captureDiagram() {
  const canvas = document.querySelector('.diagram-canvas');
  if (!canvas) return Promise.reject('No se encontro el diagrama');
  const pad = 80;
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  const allCards = canvas.querySelectorAll('.table-card');
  if (allCards.length > 0) {
    allCards.forEach(el => {
      const left = parseFloat(el.style.left) || 0;
      const top = parseFloat(el.style.top) || 0;
      const w = 310;
      const h = el.offsetHeight || 200;
      minX = Math.min(minX, left);
      minY = Math.min(minY, top);
      maxX = Math.max(maxX, left + w);
      maxY = Math.max(maxY, top + h);
    });
    const svgEl = canvas.querySelector('.diagram-svg');
    if (svgEl) {
      svgEl.querySelectorAll('path').forEach(path => {
        try {
          const bbox = path.getBBox();
          if (bbox.width > 0 || bbox.height > 0) {
            minX = Math.min(minX, bbox.x);
            minY = Math.min(minY, bbox.y);
            maxX = Math.max(maxX, bbox.x + bbox.width);
            maxY = Math.max(maxY, bbox.y + bbox.height);
          }
        } catch (e) {}
      });
    }
  }
  const ox = !isFinite(minX) ? 0 : minX;
  const oy = !isFinite(minY) ? 0 : minY;
  const maxExtentX = !isFinite(maxX) ? Math.max(Math.ceil(parseInt(canvas.style.width) || 1200), 1200) : Math.ceil(maxX + pad);
  const maxExtentY = !isFinite(maxY) ? Math.max(Math.ceil(parseInt(canvas.style.height) || 800), 800) : Math.ceil(maxY + pad);
  const contentW = Math.max(maxExtentX - ox, 1200);
  const contentH = Math.max(maxExtentY - oy, 800);

  return html2canvas(canvas, {
    backgroundColor: '#0d1117',
    scale: 3,
    useCORS: true,
    logging: false,
    width: contentW + pad * 2,
    height: contentH + pad * 2,
    windowWidth: contentW + pad * 2,
    windowHeight: contentH + pad * 2,
    x: ox - pad,
    y: oy - pad,
    letterRendering: true,
    onclone: function (doc) {
      const containers = doc.querySelectorAll('.diagram-container');
      containers.forEach(c => {
        c.style.position = 'relative';
        c.style.overflow = 'visible';
        c.style.width = '100%';
        c.style.height = '100%';
      });
      const cards = doc.querySelectorAll('.table-card');
      cards.forEach(card => { card.style.position = 'absolute'; });
      const cloned = doc.querySelector('.diagram-canvas');
      if (cloned) {
        cloned.style.position = 'absolute';
        cloned.style.top = '0';
        cloned.style.left = '0';
        cloned.style.transform = 'none';
        cloned.style.transformOrigin = '0 0';
        cloned.style.width = maxExtentX + 'px';
        cloned.style.height = maxExtentY + 'px';
      }
      const svg = doc.querySelector('.diagram-svg');
      if (svg) {
        svg.setAttribute('width', String(maxExtentX));
        svg.setAttribute('height', String(maxExtentY));
        svg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
        svg.querySelectorAll('[filter]').forEach(el => el.removeAttribute('filter'));
        svg.querySelectorAll('[marker-start]').forEach(el => el.removeAttribute('marker-start'));
        svg.querySelectorAll('[marker-end]').forEach(el => el.removeAttribute('marker-end'));
        svg.querySelectorAll('path').forEach(el => {
          el.removeAttribute('filter');
          el.removeAttribute('marker-start');
          el.removeAttribute('marker-end');
          const op = parseFloat(el.getAttribute('opacity') || '1');
          if (op < 0.4) el.setAttribute('opacity', '0.7');
        });
        svg.querySelectorAll('image').forEach(el => el.remove());
        try {
          const svgStr = new XMLSerializer().serializeToString(svg);
          const dataUrl = 'data:image/svg+xml;base64,' + btoa(unescape(encodeURIComponent(svgStr)));
          const img = doc.createElement('img');
          img.src = dataUrl;
          img.style.cssText = 'position:absolute;top:0;left:0;width:' + maxExtentX + 'px;height:' + maxExtentY + 'px;pointer-events:none';
          svg.parentNode.insertBefore(img, svg);
          svg.parentNode.removeChild(svg);
        } catch(e) {}
      }
      const els = doc.querySelectorAll('[class*="truncate"]');
      els.forEach(el => {
        el.style.overflow = 'visible';
        el.style.textOverflow = 'clip';
        el.style.whiteSpace = 'normal';
      });
      const s = doc.createElement('style');
      s.textContent = 'body,body *{font-family:"Segoe UI",system-ui,-apple-system,sans-serif!important}.font-mono,pre,code,textarea{font-family:"Consolas","Courier New",monospace!important}';
      doc.head.appendChild(s);
    }
  });
}

function exportPNG(filename) {
  const btn = document.querySelector('[data-export="png"]');
  if (btn) { btn.innerHTML = '...'; btn.disabled = true; }
  captureDiagram().then(canvas => {
    canvas.toBlob(blob => {
      downloadBlob(blob, filename || 'diagrama.png');
      restoreExportBtn(btn, 'png');
    }, 'image/png');
  }).catch(() => restoreExportBtn(btn, 'png'));
}

function exportSVG(filename) {
  const btn = document.querySelector('[data-export="svg"]');
  if (btn) { btn.innerHTML = '...'; btn.disabled = true; }
  captureDiagram().then(canvas => {
    const dataUrl = canvas.toDataURL('image/png');
    const w = canvas.width;
    const h = canvas.height;
    const svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}">
      <image href="${dataUrl}" width="${w}" height="${h}" />
    </svg>`;
    const blob = new Blob([svgContent], { type: 'image/svg+xml' });
    downloadBlob(blob, filename || 'diagrama.svg');
    restoreExportBtn(btn, 'svg');
  }).catch(() => restoreExportBtn(btn, 'svg'));
}

function exportPDF(filename) {
  const btn = document.querySelector('[data-export="pdf"]');
  if (btn) { btn.innerHTML = '...'; btn.disabled = true; }
  captureDiagram().then(canvas => {
    const imgData = canvas.toDataURL('image/png');
    const { jsPDF } = window.jspdf;
    const w = canvas.width / 3;
    const h = canvas.height / 3;
    const orientation = w > h ? 'landscape' : 'portrait';
    const pdf = new jsPDF({ orientation, unit: 'px', format: [w, h], compress: true });
    pdf.addImage(imgData, 'PNG', 0, 0, w, h, undefined, 'FAST');
    pdf.save(filename || 'diagrama.pdf');
    restoreExportBtn(btn, 'pdf');
  }).catch(() => restoreExportBtn(btn, 'pdf'));
}

function restoreExportBtn(btn, type) {
  if (!btn) return;
  const icons = { png: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>', svg: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="6 9 12 15 18 9"/></svg>', pdf: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>' };
  btn.innerHTML = icons[type] || '';
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
