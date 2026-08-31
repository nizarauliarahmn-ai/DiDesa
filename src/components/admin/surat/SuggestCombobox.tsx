import { useState, useRef, useEffect } from 'react';

interface SuggestComboboxProps {
  value: string;
  onChange: (value: string) => void;
  options: string[];
  placeholder?: string;
}

export function SuggestCombobox({ value, onChange, options, placeholder }: SuggestComboboxProps) {
  const [showDropdown, setShowDropdown] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
        setHighlightedIndex(-1);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const query = (value || '').trim().toLowerCase();
  const suggestions = query
    ? options.filter(o => (o || '').toLowerCase().includes(query)).slice(0, 6)
    : [];

  useEffect(() => {
    setHighlightedIndex(-1);
  }, [query]);

  useEffect(() => {
    if (highlightedIndex >= 0 && listRef.current) {
      const item = listRef.current.children[highlightedIndex] as HTMLElement;
      if (item) item.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex]);

  const selectOption = (opt: string) => {
    onChange(opt);
    setShowDropdown(false);
    setHighlightedIndex(-1);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showDropdown || suggestions.length === 0) return;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setHighlightedIndex(prev => (prev < suggestions.length - 1 ? prev + 1 : 0));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setHighlightedIndex(prev => (prev > 0 ? prev - 1 : suggestions.length - 1));
        break;
      case 'Enter':
        if (highlightedIndex >= 0 && highlightedIndex < suggestions.length) {
          e.preventDefault();
          selectOption(suggestions[highlightedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        setShowDropdown(false);
        setHighlightedIndex(-1);
        break;
    }
  };

  return (
    <div className="relative w-full" ref={dropdownRef}>
      <input
        type="text"
        data-no-cap
        className="w-full px-4 py-3 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl outline-none focus:ring-2 focus:ring-emerald-500 transition-all"
        placeholder={placeholder || "Ketik..."}
        value={value || ''}
        onChange={(e) => {
          onChange(e.target.value);
          setShowDropdown(true);
        }}
        onFocus={() => {
          if ((value || '').trim()) setShowDropdown(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {showDropdown && suggestions.length > 0 && (
        <div ref={listRef} className="absolute top-full left-0 right-0 z-50 mt-1 bg-white dark:bg-slate-900 rounded-2xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-y-auto max-h-60">
          {suggestions.map((opt, index) => (
            <button
              key={opt}
              type="button"
              onClick={() => selectOption(opt)}
              onMouseEnter={() => setHighlightedIndex(index)}
              className={`w-full py-2 px-3 flex items-center text-left text-sm transition-colors border-b border-slate-100 dark:border-slate-800 last:border-0 cursor-pointer ${
                index === highlightedIndex
                  ? 'bg-emerald-50 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-300'
                  : 'text-slate-800 dark:text-slate-100 hover:bg-slate-50 dark:hover:bg-slate-800'
              }`}
            >
              {opt}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}