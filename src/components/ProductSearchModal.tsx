import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';
import { Product } from '../types';

interface ProductSearchModalProps {
  products: Product[];
  onSelectProduct: (product: Product) => void;
  onClose: () => void;
}

// Helper to highlight a matched abbreviation
function renderAbbreviationHighlight(abbrev: string, query: string) {
  if (!abbrev) return null;
  const qClean = query.trim().toUpperCase();
  if (!qClean) {
    return (
      <span className="text-[10px] font-bold font-mono bg-card-secondary dark:bg-zinc-800 text-muted py-0.5 px-2 rounded-md">
        {abbrev}
      </span>
    );
  }

  const index = abbrev.indexOf(qClean);
  if (index === -1) {
    return (
      <span className="text-[10px] font-bold font-mono bg-card-secondary dark:bg-zinc-800 text-muted py-0.5 px-2 rounded-md">
        {abbrev}
      </span>
    );
  }

  const before = abbrev.substring(0, index);
  const match = abbrev.substring(index, index + qClean.length);
  const after = abbrev.substring(index + qClean.length);

  return (
    <span className="text-[10px] font-bold font-mono bg-blue-50 text-blue-700 dark:text-blue-300 py-0.5 px-2 rounded-md border border-blue-200/50 dark:border-blue-800/35">
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-800/60 dark:text-yellow-105 font-black px-0.5 rounded shadow-sm">{match}</mark>
      {after}
    </span>
  );
}

export function ProductSearchModal({ products, onSelectProduct, onClose }: ProductSearchModalProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const resultsContainerRef = useRef<HTMLDivElement>(null);

  // Debounce search query
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setSelectedIndex(0);
    }, 150);
    return () => clearTimeout(timer);
  }, [searchQuery]);

  useEffect(() => {
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 100);
  }, []);

  // Compute search results only over leaf products or configurations
  const searchResults = useMemo(() => {
    const q = debouncedQuery.toLowerCase().trim();
    const availableProducts = products.filter(p => !p.nodeType || p.nodeType === "Product"); // Only show top-level products now
    
    if (!q) {
      return availableProducts.slice(0, 50); // Show max 50 default
    }
    
    // Sort logic to match abbreviations closely
    const matchScores = availableProducts.map(p => {
      let score = 0;
      const lowerName = p.name.toLowerCase();
      const lowerCat = (p.category || "").toLowerCase();
      const isAbbrevMatch = (p as any).abbreviation?.toLowerCase() === q;
      
      if (isAbbrevMatch) score += 100;
      if (lowerName === q) score += 50;
      else if (lowerName.startsWith(q)) score += 30;
      else if (lowerName.includes(q)) score += 10;
      
      if (lowerCat.includes(q)) score += 5;
      
      return { p, score };
    });
    
    return matchScores
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .map(x => x.p)
      .slice(0, 50);
  }, [debouncedQuery, products]);

  // Keyboard navigation
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setSelectedIndex(prev => Math.min(prev + 1, searchResults.length - 1));
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setSelectedIndex(prev => Math.max(prev - 1, 0));
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (searchResults.length > 0) {
          onSelectProduct(searchResults[selectedIndex]);
        }
      } else if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [searchResults, selectedIndex, onClose, onSelectProduct]);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (resultsContainerRef.current) {
      const container = resultsContainerRef.current;
      const activeItem = container.children[selectedIndex] as HTMLElement;
      if (activeItem) {
        const itemTop = activeItem.offsetTop;
        const itemBottom = itemTop + activeItem.offsetHeight;
        const containerTop = container.scrollTop;
        const containerBottom = containerTop + container.offsetHeight;

        if (itemTop < containerTop) {
          container.scrollTop = itemTop - 16;
        } else if (itemBottom > containerBottom) {
          container.scrollTop = itemBottom - container.offsetHeight + 16;
        }
      }
    }
  }, [selectedIndex]);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-card/60 backdrop-blur-sm animate-in fade-in duration-200" onClick={onClose}>
      <div className="w-full max-w-xl bg-card rounded-xl shadow-xl overflow-hidden flex flex-col h-[70vh] border border-default" onClick={e => e.stopPropagation()}>
        <div className="relative border-b border-default bg-card shrink-0">
          <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-muted" />
          </div>
          <input
            ref={searchInputRef}
            type="text"
            className="block w-full pl-11 pr-10 py-5 bg-transparent border-none text-base placeholder-muted focus:ring-0 outline-none text-primary dark:text-primary font-semibold"
            placeholder="Search by product name, category, or initials..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <button
            onClick={onClose}
            className="absolute inset-y-0 right-0 pr-4 flex items-center text-muted hover:text-secondary dark:hover:text-gray-300 border-none bg-transparent cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-2" ref={resultsContainerRef}>
          {searchResults.length > 0 ? (
            <div className="space-y-1">
              {searchResults.map((p, idx) => {
                const isActive = idx === selectedIndex;
                return (
                  <button
                    key={p.id}
                    onClick={() => onSelectProduct(p)}
                    onMouseEnter={() => setSelectedIndex(idx)}
                    className={`w-full text-left p-3 rounded-lg flex items-center justify-between gap-3 transition-all border outline-none cursor-pointer ${isActive
                        ? 'bg-blue-50 dark:bg-blue-900/40 border-blue-400 shadow-sm'
                        : 'hover:bg-surface dark:hover:bg-zinc-800/50 border-transparent'
                      }`}
                  >
                    <div className="flex-1 min-w-0">
                      <div className={`font-bold leading-snug truncate ${isActive ? 'text-blue-700 dark:text-blue-200' : 'text-primary dark:text-zinc-100'}`}>
                        {p.name}
                      </div>
                      <div className="flex items-center gap-2 text-[10px] text-muted dark:text-muted font-bold mt-1">
                        {p.category && (
                          <span className="bg-gray-150 dark:bg-zinc-800 text-muted dark:text-zinc-300 px-1.5 py-0.5 rounded">
                            {p.category}
                          </span>
                        )}
                        {p.simpleVariants && p.simpleVariants.length > 0 && (
                          <span className="text-blue-600 dark:text-blue-400 font-mono">
                            ({p.simpleVariants.length} Variants)
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Highlight matched initials */}
                    <div className="text-xs text-blue-500 font-mono font-medium">
                      {renderAbbreviationHighlight((p as any).abbreviation || "", debouncedQuery)}
                    </div>
                  </button>
                );
              })}
            </div>
          ) : (
            <div className="p-12 text-center text-muted">
              No products found for"{searchQuery}".
            </div>
          )}
        </div>
        <div className="px-4 py-2 bg-surface/50 border-t border-default text-[10px] text-muted font-semibold flex justify-between items-center shrink-0">
          <span>↑↓ Arrow keys to navigate • Enter to select</span>
          <span>{searchResults.length} matches</span>
        </div>
      </div>
    </div>
  );
}
