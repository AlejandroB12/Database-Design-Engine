const { useState, useCallback, useMemo, useRef, useEffect } = React;

function App() {
  const [sql, setSql] = useState('');
  const [tables, setTables] = useState([]);
  const [selectedTables, setSelectedTables] = useState({});
  const [error, setError] = useState(null);
  const [zoom, setZoom] = useState(1);
  const [multiDragMode, setMultiDragMode] = useState(false);
  const [positions, setPositions] = useState({});
  const [showLeft, setShowLeft] = useState(true);
  const [layers, setLayers] = useState([]);
  const [linePaths, setLinePaths] = useState({});
  const [linePathHistory, setLinePathHistory] = useState({});
  const [showLayers, setShowLayers] = useState(false);
  const [leftTab, setLeftTab] = useState('sql');
  const parseTimeoutRef = useRef(null);
  const fileInputRef = useRef(null);

  const issues = useMemo(() => detectIssues(tables, positions), [tables, positions]);

  const handleArrange = useCallback(() => {
    if (tables.length === 0) return;
    const newPos = arrangeTables(tables, positions);
    setPositions(newPos);
    setLinePaths({});
  }, [tables, positions]);

  const syncSqlToTables = useCallback((value) => {
    setSql(value); setError(null);
    if (parseTimeoutRef.current) clearTimeout(parseTimeoutRef.current);
    parseTimeoutRef.current = setTimeout(() => {
      try {
        if (!value.trim()) { setTables([]); setSelectedTables({}); setPositions({}); setLayers([]); return; }
        const parsed = parseSQL(value);
        if (parsed.length === 0 && value.trim()) { setError('No se detectaron tablas.'); return; }
        setPositions(autoLayout(parsed)); setTables(parsed); setSelectedTables({}); setError(null);
      } catch (e) { setError('Error: ' + e.message); }
    }, 400);
  }, []);

  useEffect(() => { return () => { if (parseTimeoutRef.current) clearTimeout(parseTimeoutRef.current); }; }, []);

  useEffect(() => {
    const handler = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === 'b') { e.preventDefault(); setShowLeft(s => !s); } };
    window.addEventListener('keydown', handler); return () => window.removeEventListener('keydown', handler);
  }, []);

  const handleImportFile = useCallback((e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = function (ev) {
      syncSqlToTables(ev.target.result);
    };
    reader.readAsText(file);
    e.target.value = '';
  }, [syncSqlToTables]);

  const commitTables = useCallback((nextTables) => {
    setTables(nextTables);
    const newSql = generateMySQL(nextTables);
    setSql(newSql);
    setError(null);
  }, []);

  const updateTable = useCallback((updated) => { commitTables(tables.map(t => t.id === updated.id ? updated : t)); }, [tables, commitTables]);
  const deleteTable = useCallback((id) => {
    const next = tables.filter(t => t.id !== id);
    setSelectedTables(prev => { const p = { ...prev }; delete p[id]; return p; });
    setPositions(prev => { const p = { ...prev }; delete p[id]; return p; });
    setLayers(prev => prev.map(l => ({ ...l, tableIds: l.tableIds.filter(tid => tid !== id) })));
    commitTables(next);
  }, [tables, commitTables]);
  const addColumnToTable = useCallback((tid) => {
    const nc = { id: uid(), name: '', type: 'VARCHAR', length: 255, values: '', pk: false, nn: false, uq: false, ai: false, fk: false, refTable: '', refColumn: '', defaultValue: '' };
    commitTables(tables.map(t => t.id === tid ? { ...t, columns: [...t.columns, nc] } : t));
  }, [tables, commitTables]);

  const updateRef = useCallback((tableId, column, refTable, cardinality) => {
    const next = tables.map(t => {
      if (t.id !== tableId) return t;
      return { ...t, refs: (t.refs || []).map(r => r.column === column && r.refTable === refTable ? { ...r, cardinality } : r) };
    });
    commitTables(next);
  }, [tables, commitTables]);

  const handleZoomOrPos = useCallback((tid, key, val) => {
    if (key === null && val === null) return;
    if (tid === null && key === null) {
      if (typeof val === 'number') { setZoom(z => Math.max(0.25, Math.min(3, z + val))); return; }
      if (val && typeof val === 'object' && val.abs !== undefined) { setZoom(Math.max(0.25, Math.min(3, val.abs))); return; }
      return;
    }
    if (val === 'fit') {
      const vals = Object.values(positions);
      if (vals.length === 0) return;
      const minX = Math.min(...vals.map(p => p.x)), minY = Math.min(...vals.map(p => p.y));
      const maxX = Math.max(...vals.map(p => p.x + 310)), maxY = Math.max(...vals.map(p => p.y + 300));
      const container = document.querySelector('.diagram-container');
      if (!container) return;
      const cw = container.clientWidth - 40, ch = container.clientHeight - 40;
      const scale = Math.min(cw / (maxX - minX + 280), ch / (maxY - minY + 200), 1.5);
      setZoom(Math.max(0.25, Math.min(3, scale))); return;
    }
    setPositions(prev => { const p = prev[tid]; if (!p) return prev; return { ...prev, [tid]: { x: p.x + (key === 'x' ? val - p.x : 0), y: p.y + (key === 'y' ? val - p.y : 0) } }; });
  }, [positions]);

  const handlePositionChange = useCallback((tid, x, y) => { setPositions(prev => ({ ...prev, [tid]: { x, y } })); }, []);

  const handleLinePathChange = useCallback((key, points) => {
    setLinePaths(prev => ({ ...prev, [key]: points }));
  }, []);

  const handleResetLinePath = useCallback((key) => {
    setLinePaths(prev => { const next = { ...prev }; delete next[key]; return next; });
  }, []);

  const handleSaveLinePathState = useCallback((key) => {
    setLinePathHistory(prev => {
      const current = linePaths[key];
      if (!current) return prev;
      const history = prev[key] || [];
      return { ...prev, [key]: [...history.slice(-20), current.map(p => ({ ...p }))] };
    });
  }, [linePaths]);

  const handleUndoLinePath = useCallback((key) => {
    setLinePathHistory(prev => {
      const history = prev[key];
      if (!history || history.length === 0) return prev;
      const restored = history[history.length - 1];
      const newHistory = history.slice(0, -1);
      setLinePaths(p => ({ ...p, [key]: restored }));
      return { ...prev, [key]: newHistory.length > 0 ? newHistory : undefined };
    });
  }, []);

  const selectedTableData = useMemo(() => { const ids = Object.keys(selectedTables); return ids.length === 1 ? tables.find(t => t.id === ids[0]) || null : null; }, [tables, selectedTables]);

  const handleSelectTable = useCallback((id, ctrlKey) => {
    setSelectedTables(prev => {
      if (ctrlKey) { const next = { ...prev }; if (next[id]) { delete next[id]; return next; } next[id] = true; return next; }
      return { [id]: true };
    });
  }, []);

  const handleSelectTables = useCallback((ids) => {
    setSelectedTables(prev => {
      const next = {};
      for (const id of ids) next[id] = true;
      return next;
    });
  }, []);

  const addLayer = useCallback(() => {
    const colors = ['#6366f1','#ec4899','#22c55e','#f59e0b','#06b6d4','#8b5cf6','#f97316','#84cc16'];
    setLayers(prev => { const idx = prev.length; return [...prev, { id: uid(), name: `Capa ${idx + 1}`, color: colors[idx % colors.length], tableIds: [], x: 150 + idx * 40, y: 100 + idx * 40, w: 350, h: 250 }]; });
  }, []);

  const removeLayer = useCallback((id) => setLayers(prev => prev.filter(l => l.id !== id)), []);
  const updateLayer = useCallback((id, updates) => setLayers(prev => prev.map(l => l.id === id ? { ...l, ...updates } : l)), []);
  const assignSelectedToLayer = useCallback((layerId) => {
    const selectedIds = Object.keys(selectedTables);
    if (selectedIds.length === 0) return;
    setLayers(prev => prev.map(l => l.id !== layerId ? l : { ...l, tableIds: [...new Set([...l.tableIds, ...selectedIds])] }));
  }, [selectedTables]);

  return (
    <div className="h-screen flex flex-col bg-[#0d1117]">
      <header className="bg-[#161b22]/80 border-b border-[#21262d]/50 px-5 py-3 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-[#1f6feb]/20 rounded-lg p-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-[#58a6ff]">
              <ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/>
            </svg>
          </div>
          <h1 className="text-lg font-bold text-[#c9d1d9]">DB Modeler</h1>
        </div>
        <div className="flex items-center gap-2">
          <input ref={fileInputRef} type="file" accept=".sql" onChange={handleImportFile} className="hidden" />
          <button onClick={() => fileInputRef.current?.click()}
            className="text-[12px] text-[#6e7681] hover:text-[#3fb950] bg-[#21262d]/80 hover:bg-[#30363d] rounded-lg px-3 h-8 flex items-center transition border border-[#30363d]/50" title="Importar archivo SQL">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 shrink-0"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
            Importar SQL
          </button>

          {tables.length > 0 && <>
            <div className="w-px h-6 bg-[#30363d]/50 mx-1" />
            <div className="flex bg-[#21262d]/80 rounded-lg border border-[#30363d]/50 overflow-hidden">
              <button data-export="png" onClick={() => exportPNG(`diagrama-${Date.now()}.png`)}
                className="tab-btn text-[11px] px-2.5 py-1.5 font-medium text-[#6e7681] hover:text-[#58a6ff] transition border-x border-[#30363d]/50 flex items-center gap-1" title="Exportar PNG">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              </button>
              <button data-export="pdf" onClick={() => exportPDF(`diagrama-${Date.now()}.pdf`)}
                className="tab-btn text-[11px] px-2.5 py-1.5 font-medium text-[#6e7681] hover:text-[#f85149] transition flex items-center gap-1" title="Exportar PDF">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
              </button>
            </div>
          </>}
          {tables.length > 0 && <button onClick={handleArrange}
            className="text-[12px] text-[#6e7681] hover:text-[#3fb950] bg-[#21262d]/80 hover:bg-[#30363d] rounded-lg px-3 h-8 flex items-center transition border border-[#30363d]/50 gap-1.5 mr-1"
            title="Ordenar tablas automáticamente (resuelve solapamientos y cruces)">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="16 3 21 3 21 8"/><line x1="4" y1="20" x2="21" y2="3"/>
              <polyline points="21 16 21 21 16 21"/><line x1="15" y1="15" x2="21" y2="21"/>
              <line x1="4" y1="4" x2="9" y2="9"/>
            </svg>
            Ordenar
            {issues.total > 0 && (
              <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#d29922]/20 text-[#d29922] ml-1">{issues.total}</span>
            )}
          </button>}
          {tables.length > 0 && <button onClick={() => setShowLayers(s => !s)}
            className={`text-[12px] rounded-lg px-3 h-8 flex items-center transition border ${showLayers || layers.length > 0 ? 'text-[#a371f7] bg-[#a371f7]/15 border-[#a371f7]/30' : 'text-[#6e7681] hover:text-[#a371f7] bg-[#21262d]/80 hover:bg-[#30363d] border-[#30363d]/50'}`}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="mr-1.5 shrink-0"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
            Capas {layers.length > 0 && <span className="ml-1 text-[10px] opacity-60">({layers.length})</span>}
          </button>}
          {error && <span className="text-[12px] text-[#f85149] bg-[#f85149]/10 rounded-full px-3 py-1">{error}</span>}
        </div>
      </header>

      <div className="flex-1 flex overflow-hidden relative">
        <div className={`${showLeft ? 'w-[460px]' : 'w-0'} transition-all duration-300 overflow-hidden shrink-0 border-r border-[#21262d]/50 bg-[#161b22]/30`}>
          <div className="w-[460px] p-2.5 h-full flex flex-col">
            {leftTab === 'sql' && <SqlEditor sql={sql} onChange={syncSqlToTables} />}
          </div>
        </div>

        <button onClick={() => setShowLeft(!showLeft)}
          className="absolute top-3 z-20 bg-[#21262d]/90 border border-[#30363d]/60 rounded-r-lg p-2 hover:bg-[#30363d] hover:text-[#c9d1d9] transition-all shadow-lg cursor-pointer group"
          style={{ left: showLeft ? '460px' : '0' }}
          title={showLeft ? 'Ocultar panel (Ctrl+B)' : 'Mostrar panel (Ctrl+B)'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-[#8b949e] group-hover:text-[#c9d1d9] transition-colors">
            <path d={showLeft ? "M15 18l-6-6 6-6" : "M9 18l6-6-6-6"} />
          </svg>
        </button>

        {tables.length > 0 && (
        <div className="flex-1 flex flex-col overflow-hidden animate-fade-in">
          <div className="flex-1 relative flex overflow-hidden">
            <div className="flex-1 relative diagram-container overflow-hidden">
              <Diagram
                tables={tables}
                selectedTables={selectedTables}
                onSelectTable={handleSelectTable}
                onAddColumn={addColumnToTable}
                onDeleteTable={deleteTable}
                onUpdateTable={handleZoomOrPos}
                onPositionsChange={handlePositionChange}
                positions={positions}
                zoom={zoom}
                layers={layers}
                linePaths={linePaths}
                onUpdateLinePath={handleLinePathChange}
                onResetLinePath={handleResetLinePath}
                onSaveLinePathState={handleSaveLinePathState}
                onUndoLinePath={handleUndoLinePath}
                onUpdateLayer={updateLayer}
                onRemoveLayer={removeLayer}
                onShowLayerPanel={setShowLayers}
                onUpdateRef={updateRef}
                multiDragMode={multiDragMode}
                onToggleMultiDrag={() => setMultiDragMode(m => !m)}
                onSelectTables={handleSelectTables}
              />
              {tables.length > 0 && showLayers && (
                <LayerPanel
                  layers={layers}
                  tables={tables}
                  selectedTables={selectedTables}
                  onAddLayer={addLayer}
                  onRemoveLayer={removeLayer}
                  onUpdateLayer={updateLayer}
                  onAssignSelected={assignSelectedToLayer}
                  onClose={() => setShowLayers(false)}
                />
              )}
            </div>

          </div>

          {selectedTableData && (
            <TableEditor table={selectedTableData} onUpdateTable={updateTable} onClose={() => setSelectedTables({})} />
          )}
          {Object.keys(selectedTables).length > 1 && (
            <div className="bg-[#21262d]/95 border-t border-[#30363d]/50 p-4 slide-in">
              <p className="text-sm text-[#8b949e] text-center">{Object.keys(selectedTables).length} tablas seleccionadas</p>
            </div>
          )}
        </div>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);
