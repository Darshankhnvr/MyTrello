import React, { useState, useContext, useEffect } from 'react';
import { ThemeProvider } from './context/ThemeContext';
import Board from './components/Board';
import ThemeToggle from './components/ThemeToggle';
import SearchBar from './components/SearchBar';
import { UndoRedoProvider, UndoRedoContext } from './context/UndoRedoContext';
import ErrorBoundary from './components/ErrorBoundary';

const App: React.FC = () => {
  const [query, setQuery] = useState('');

  return (
    <ThemeProvider>
      <UndoRedoProvider>
        <ErrorBoundary>
          <div className="relative min-h-screen flex flex-col bg-gray-100 dark:bg-gray-900 text-gray-900 dark:text-gray-100 transition-colors duration-200">
            <Header query={query} setQuery={setQuery} />
            <Board searchQuery={query} />
          </div>
        </ErrorBoundary>
      </UndoRedoProvider>
    </ThemeProvider>
  );
};

export default App;

const Header: React.FC<{ query: string; setQuery: (s: string) => void }> = ({ query, setQuery }) => {
  const undoRedo = useContext(UndoRedoContext);
  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const handleExport = () => {
    try {
      const state = window.localStorage.getItem('kanban_board_state_v1');
      const history = window.localStorage.getItem('kanban_board_history_v1');
      const payload = { state: state ? JSON.parse(state) : null, history: history ? JSON.parse(history) : null, exportedAt: new Date().toISOString() };
      const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `kanban-backup-${new Date().toISOString().slice(0,19).replace(/[:T]/g,'-')}.json`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      // ignore
    }
  };

  const handleImportClick = () => fileInputRef.current?.click();

  const handleFile = async (file?: File | null) => {
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      // basic validation
      const cols = parsed?.state?.columns || parsed?.columns || parsed?.board?.columns;
      const history = parsed?.history || parsed?.history_v1 || parsed?.board?.history;
      if (!Array.isArray(cols)) {
        alert('Invalid import file: missing columns');
        return;
      }
      // write to localStorage and notify board
      window.localStorage.setItem('kanban_board_state_v1', JSON.stringify({ columns: cols }));
      if (Array.isArray(history)) window.localStorage.setItem('kanban_board_history_v1', JSON.stringify(history));
      const ev = new CustomEvent('kanban:import', { detail: { data: { columns: cols, history: history || [] } } });
      window.dispatchEvent(ev);
      alert('Import successful');
    } catch (err) {
      alert('Failed to import file: ' + (err as Error).message);
    }
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const z = e.key.toLowerCase() === 'z';
      const y = e.key.toLowerCase() === 'y';
      const mod = e.ctrlKey || e.metaKey;
      if (!mod) return;
      if (z && e.shiftKey) {
        // redo: Ctrl+Shift+Z
        e.preventDefault();
        undoRedo.redo();
      } else if (z) {
        // undo: Ctrl+Z
        e.preventDefault();
        undoRedo.undo();
      } else if (y) {
        // redo alternate: Ctrl+Y
        e.preventDefault();
        undoRedo.redo();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [undoRedo]);

  return (
    <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm">
      <div className="flex items-center space-x-2">
        <span className="text-lg font-semibold text-gray-900 dark:text-gray-100">MyToDO</span>
      </div>
      <div className="flex-1 px-4 hidden sm:block">
        <SearchBar query={query} onChange={setQuery} />
      </div>
      <div className="flex items-center space-x-2">
        <button
          onClick={() => undoRedo.undo()}
          disabled={!undoRedo.canUndo}
          title="Undo (Ctrl/Cmd+Z)"
          className={`px-3 py-1 rounded-md text-sm font-medium border ${undoRedo.canUndo ? 'bg-white dark:bg-gray-700 hover:border-blue-400' : 'opacity-50 cursor-not-allowed'} dark:border-gray-600`}
        >
          Undo
        </button>
        <button
          onClick={() => undoRedo.redo()}
          disabled={!undoRedo.canRedo}
          title="Redo (Ctrl+Y / Ctrl+Shift+Z)"
          className={`px-3 py-1 rounded-md text-sm font-medium border ${undoRedo.canRedo ? 'bg-white dark:bg-gray-700 hover:border-blue-400' : 'opacity-50 cursor-not-allowed'} dark:border-gray-600`}
        >
          Redo
        </button>
        <button
          onClick={handleExport}
          title="Export board JSON"
          className="px-3 py-1 rounded-md text-sm font-medium border bg-white dark:bg-gray-700 hover:border-green-400 dark:border-gray-600"
        >
          Export
        </button>
        <button
          onClick={handleImportClick}
          title="Import board JSON"
          className="px-3 py-1 rounded-md text-sm font-medium border bg-white dark:bg-gray-700 hover:border-yellow-400 dark:border-gray-600"
        >
          Import
        </button>
        <input ref={fileInputRef} type="file" accept="application/json" className="hidden" onChange={(e) => handleFile(e.target.files?.[0] || null)} />
        <ThemeToggle />
      </div>
    </header>
  );
};