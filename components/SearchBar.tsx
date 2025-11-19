import React, { useRef, useEffect } from 'react';

interface SearchBarProps {
  query: string;
  onChange: (q: string) => void;
}

const SearchBar: React.FC<SearchBarProps> = ({ query, onChange }) => {
  const ref = useRef<HTMLInputElement | null>(null);

  // expose focusing with '/'
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === '/') {
        const active = document.activeElement as HTMLElement | null;
        if (active && (active.tagName === 'INPUT' || active.tagName === 'TEXTAREA')) return;
        e.preventDefault();
        ref.current?.focus();
      }
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className="max-w-md w-full">
      <input
        ref={ref}
        value={query}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Search tasks, tags... (press / to focus)"
        className="w-full px-3 py-2 border rounded-md bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-gray-100 border-gray-300 dark:border-gray-600 focus:ring-2 focus:ring-blue-500"
      />
    </div>
  );
};

export default SearchBar;
