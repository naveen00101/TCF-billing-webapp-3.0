import React, { useState, useMemo, useEffect, useRef } from 'react';
import { Search, X, Package, ChevronRight, CheckCircle2, ShoppingCart } from 'lucide-react';
import { Product, InventorySKU } from '../types';

interface ConfiguratorProps {
  products: Product[];
  onSelectSku: (product: Product, sku?: InventorySKU) => void;
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
    <span className="text-[10px] font-bold font-mono bg-blue-50  text-blue-700 dark:text-blue-300 py-0.5 px-2 rounded-md border border-blue-200/50 dark:border-blue-800/35">
      {before}
      <mark className="bg-yellow-200 dark:bg-yellow-800/60 dark:text-yellow-105 font-black px-0.5 rounded shadow-sm">{match}</mark>
      {after}
    </span>
  );
}

export function ProductConfiguratorModal({ products, onSelectSku, onClose }: ConfiguratorProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [debouncedQuery, setDebouncedQuery] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [selectedVariant, setSelectedVariant] = useState<any | null>(null);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, { value: string, priceModifier: number }>>({});

  // Keyboard index highlight
  const [activeIndex, setActiveIndex] = useState(-1);
  const listContainerRef = useRef<HTMLDivElement>(null);

  // Debouncing search query for high efficiency under 10,000+ data nodes
  useEffect(() => {
    if (!searchQuery.trim()) {
      setDebouncedQuery("");
      setActiveIndex(-1);
      return;
    }
    const timer = setTimeout(() => {
      setDebouncedQuery(searchQuery);
      setActiveIndex(0); // auto-highlight first result on query update
    }, 120);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  // Pre-process and memoize products to calculate attributes, Lowercase matches and Acronym abbreviations once
  const memoizedStockProducts = useMemo(() => {
    return products
      .filter(p => p.nodeType === "Product")
      .map(p => {
        const name = p.name || "";
        const words = name.split(/[^a-zA-Z0-9]+/).filter(Boolean);
        const abbreviation = words.map(w => w.charAt(0)).join("").toUpperCase();

        return {
          ...p,
          abbreviation,
          nameLower: name.toLowerCase(),
          skuLower: (p.sku || "").toLowerCase(),
          categoryLower: (p.category || "").toLowerCase()
        };
      });
  }, [products]);

  // Run scoring and ranking matching logic instantly on debounced input change
  const searchResults = useMemo(() => {
    const q = debouncedQuery.trim().toLowerCase();
    if (!q) return memoizedStockProducts.slice(0, 15);

    const qUpper = q.toUpperCase();
    const matches: { item: typeof memoizedStockProducts[0]; rank: number }[] = [];

    for (let i = 0; i < memoizedStockProducts.length; i++) {
      const item = memoizedStockProducts[i];
      let rank = Infinity;

      // 1. Exact abbreviation match
      if (item.abbreviation === qUpper) {
        rank = Math.min(rank, 1);
      }
      // 2. Abbreviation startsWith
      else if (item.abbreviation.startsWith(qUpper)) {
        rank = Math.min(rank, 2);
      }
      // 3. Product name startsWith
      else if (item.nameLower.startsWith(q)) {
        rank = Math.min(rank, 3);
      }
      // 4. Product name contains / Sku / Category match
      else if (
        item.nameLower.includes(q) ||
        item.skuLower.includes(q) ||
        item.categoryLower.includes(q)
      ) {
        rank = Math.min(rank, 4);
      }

      if (rank !== Infinity) {
        matches.push({ item, rank });
      }
    }

    // Sort: Score Rank first, then alphabetically for stability
    matches.sort((a, b) => {
      if (a.rank !== b.rank) {
        return a.rank - b.rank;
      }
      return a.item.nameLower.localeCompare(b.item.nameLower);
    });

    return matches.map(m => m.item).slice(0, 15);
  }, [debouncedQuery, memoizedStockProducts]);

  // Scroll active list item into view if it changes
  useEffect(() => {
    if (activeIndex >= 0 && listContainerRef.current) {
      const activeEl = listContainerRef.current.querySelector(`[data-index="${activeIndex}"]`);
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
      }
    }
  }, [activeIndex]);

  // Handle keyboard arrow keys navigation & hotkey selections for high operator speed
  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (searchResults.length === 0) return;

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(prev => (prev + 1) % searchResults.length);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(prev => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const finalIndex = activeIndex >= 0 ? activeIndex : 0;
      const chosen = searchResults[finalIndex];
      if (chosen) {
        setSelectedProduct(chosen);
        setSelectedVariant(null);
        setSelectedOptions({});
        setActiveIndex(-1);
      }
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  // Tree-mode state traversal helpers
  const [configPath, setConfigPath] = useState<Product[]>([]);
  const [selectedTreeSku, setSelectedTreeSku] = useState<Product | null>(null);

  useEffect(() => {
    setConfigPath([]);
    setSelectedTreeSku(null);
  }, [selectedProduct]);

  const isTreeMode = useMemo(() => {
    if (!selectedProduct) return false;
    return products.some(p => p.parentId === selectedProduct.id && (p.nodeType === "Configuration" || p.nodeType === "SKU" || p.isLeaf));
  }, [selectedProduct, products]);

  const currentParentId = configPath.length > 0 ? configPath[configPath.length - 1].id : (selectedProduct?.id || "");

  const currentConfigs = useMemo(() => {
    if (!selectedProduct) return [];
    return products.filter(p => p.parentId === currentParentId && p.nodeType === "Configuration");
  }, [products, selectedProduct, currentParentId]);

  const currentSkus = useMemo(() => {
    if (!selectedProduct) return [];
    return products.filter(p => p.parentId === currentParentId && (p.nodeType === "SKU" || p.isLeaf));
  }, [products, selectedProduct, currentParentId]);

  // Next Steps View (Legacy mode calculations)
  const productVariants = selectedProduct ? (selectedProduct.variants || []) : [];
  const hasVariants = productVariants.length > 0;
  const productOptions = selectedProduct ? (selectedProduct.optionGroups || selectedProduct.productOptions || []) : [];
  const hasOptions = productOptions.length > 0;

  const missingVariant = hasVariants && !selectedVariant;
  const missingOptions = hasOptions
    ? productOptions.filter(opt => !selectedOptions[opt.name])
    : [];

  const isReady = isTreeMode
    ? !!selectedTreeSku
    : (!missingVariant && missingOptions.length === 0);

  const handleOptionSelect = (name: string, value: string, priceModifier: number) => {
    setSelectedOptions(prev => ({ ...prev, [name]: { value, priceModifier } }));
  };

  // Calculate Price
  let finalPrice = selectedProduct ? (selectedProduct.price || 0) : 0;
  if (isTreeMode) {
    finalPrice = selectedTreeSku ? (selectedTreeSku.price || 0) : 0;
  } else if (selectedVariant) {
    finalPrice = selectedVariant.price || 0;
  }

  if (!isTreeMode) {
    let optionPriceOffset = 0;
    Object.values(selectedOptions).forEach(opt => {
      optionPriceOffset += opt.priceModifier;
    });
    finalPrice += optionPriceOffset;
  }

  // Build a mock SKU to pass back
  const resolvedSku: InventorySKU | undefined = isTreeMode && selectedTreeSku ? {
    id: selectedTreeSku.id,
    skuCode: selectedTreeSku.sku || selectedTreeSku.id,
    skuId: selectedTreeSku.id,
    price: finalPrice,
    stock: selectedTreeSku.stockAvailable || 0,
    attributes: []
  } as any : (isReady ? {
    id: selectedVariant ? selectedVariant.id : selectedProduct?.id,
    skuCode: selectedVariant ? selectedVariant.name : selectedProduct?.name,
    skuId: selectedVariant ? selectedVariant.id : selectedProduct?.id,
    price: finalPrice,
    stock: selectedVariant ? (selectedVariant.stock !== undefined ? selectedVariant.stock : selectedVariant.stockAvailable || 0) : (selectedProduct?.stockAvailable || 0),
    attributes: Object.entries(selectedOptions).map(([k, v]) => ({ name: k, value: v.value }))
  } as any : undefined);

  if (!selectedProduct) {
    return (
      <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-card/60 backdrop-blur-sm animate-in fade-in duration-200">
        <div className="w-full max-w-xl bg-card rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
          <div className="flex items-center justify-between p-4 border-b border-default bg-surface/50 /50">
            <h3 className="font-bold text-primary dark:text-zinc-100 flex items-center gap-2">
              <Package className="w-5 h-5 text-blue-600" />
              Find a Product
            </h3>
            <button onClick={onClose} className="p-1.5 text-muted hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg">
              <X className="w-5 h-5" />
            </button>
          </div>

          <div className="p-4 border-b border-default">
            <div className="relative">
              <input
                autoFocus
                type="text"
                placeholder="Type name, or initials e.g. 'RCSB', 'RCHB'..."
                value={searchQuery}
                onKeyDown={handleKeyDown}
                onChange={e => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-3 text-sm rounded-xl border-2 border-default focus:border-blue-500 bg-input dark:border-zinc-700 outline-none transition-colors dark:text-primary font-medium shadow-inner"
              />
              <Search className="w-5 h-5 text-muted absolute left-3 top-3.5" />
            </div>
            {searchQuery && debouncedQuery !== searchQuery && (
              <p className="text-[10px] text-blue-500 font-medium animate-pulse mt-1 ml-0.5 font-mono">Indexing...</p>
            )}
          </div>

          <div
            ref={listContainerRef}
            className="max-h-[400px] overflow-y-auto"
          >
            {searchResults.length > 0 ? (
              <div className="p-2 space-y-1">
                {searchResults.map((p, idx) => {
                  const isActive = idx === activeIndex;
                  return (
                    <button
                      key={p.id}
                      data-index={idx}
                      type="button"
                      onClick={() => {
                        setSelectedProduct(p);
                        setSelectedVariant(null);
                        setSelectedOptions({});
                      }}
                      className={`w-full text-left p-3 rounded-lg flex items-center justify-between gap-3 transition-all border outline-none ${isActive
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
                          {p.attributes && p.attributes.length > 0 && (
                            <span className="text-blue-600 dark:text-blue-400 font-mono">
                              ({p.attributes.length} Config Attributes)
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Highlight matched initials */}
                      <div className="shrink-0 flex items-center">
                        {renderAbbreviationHighlight(p.abbreviation, searchQuery)}
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
          <div className="px-4 py-2 bg-surface/50 border-t border-default text-[10px] text-muted font-semibold flex justify-between items-center">
            <span>↑↓ Arrow keys to navigate • Enter to select</span>
            <span>{searchResults.length} matches</span>
          </div>
        </div>
      </div>
    );
  }



  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-card/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-xl bg-card rounded-2xl shadow-xl overflow-hidden animate-in zoom-in-95 duration-200">
        <div className="flex items-start p-6 bg-input/50">
          <div className="flex-1">
            <div className="text-xs font-bold text-blue-600 mb-1 flex items-center gap-1">
              <button type="button" className="hover:underline border-none bg-transparent cursor-pointer text-blue-600 font-bold p-0" onClick={() => setSelectedProduct(null)}>Search</button>
              <ChevronRight className="w-3 h-3" />
              <span>{selectedProduct.category}</span>
            </div>
            <h2 className="text-xl font-bold text-primary dark:text-primary leading-tight">{selectedProduct.name}</h2>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:bg-gray-200 dark:hover:bg-zinc-800 rounded-lg">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {isTreeMode ? (
            <div className="space-y-4 animate-in fade-in duration-200">
              {/* Traversal Breadcrumbs */}
              {configPath.length > 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-muted font-bold pb-2 border-b border-default">
                  <button
                    type="button"
                    onClick={() => { setConfigPath([]); setSelectedTreeSku(null); }}
                    className="hover:underline text-blue-600 font-bold bg-transparent border-none cursor-pointer"
                  >
                    {selectedProduct.name}
                  </button>
                  {configPath.map((cfg, idx) => (
                    <React.Fragment key={cfg.id}>
                      <ChevronRight className="w-3 h-3 text-muted" />
                      <button
                        type="button"
                        onClick={() => { setConfigPath(configPath.slice(0, idx + 1)); setSelectedTreeSku(null); }}
                        className={`hover:underline font-bold bg-transparent border-none cursor-pointer ${idx === configPath.length - 1 ? 'text-secondary dark:text-zinc-200 font-black' : 'text-blue-600'}`}
                      >
                        {cfg.name}
                      </button>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Configurations Layer Selection */}
              {currentConfigs.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider">Select Option Layer</div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {currentConfigs.map(cfg => (
                      <button
                        key={cfg.id}
                        type="button"
                        onClick={() => {
                          setConfigPath(prev => [...prev, cfg]);
                          setSelectedTreeSku(null);
                        }}
                        className="p-3 rounded-xl text-left border-2 border-default dark:border-zinc-700 bg-surface hover:border-blue-400 cursor-pointer transition-colors font-bold text-xs"
                      >
                        {cfg.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Sellable SKUs Selection */}
              {currentSkus.length > 0 && (
                <div className="space-y-3">
                  <div className="text-xs font-bold text-muted uppercase tracking-wider">Select Specific SKU</div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {currentSkus.map(sku => {
                      const isSelected = selectedTreeSku?.id === sku.id;
                      return (
                        <button
                          key={sku.id}
                          type="button"
                          onClick={() => setSelectedTreeSku(sku)}
                          className={`p-3 rounded-xl text-left border-2 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-600 dark:bg-blue-950 dark:border-blue-500' : 'bg-surface border-default dark:border-zinc-700 hover:border-blue-400'}`}
                        >
                          <div className={`text-xs font-bold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-secondary dark:text-zinc-200'}`}>
                            {sku.name.replace(`${selectedProduct.name} - `, '')}
                          </div>
                          <div className="text-xs font-mono font-bold text-muted mt-1">₹{sku.price}</div>
                          {sku.stockAvailable !== undefined && (
                            <div className="text-[10px] text-muted font-semibold mt-1">Stock: {sku.stockAvailable} pcs</div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {configPath.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setConfigPath(prev => prev.slice(0, -1));
                    setSelectedTreeSku(null);
                  }}
                  className="text-[11px] font-bold text-blue-650 hover:underline border-none bg-transparent cursor-pointer"
                >
                  &larr; Go Back to parent level
                </button>
              )}

              {currentConfigs.length === 0 && currentSkus.length === 0 && (
                <p className="text-xs text-muted italic">No sub-options or SKUs found in this folder path.</p>
              )}
            </div>
          ) : (
            <>
              {hasVariants && (
                <div className="space-y-3">
                  <div className="text-sm font-bold text-secondary dark:text-zinc-200">Select Variant Model</div>
                  <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    {productVariants.map(vr => {
                      const isSelected = selectedVariant?.id === vr.id;
                      return (
                        <button
                          key={vr.id}
                          type="button"
                          onClick={() => setSelectedVariant(vr)}
                          className={`p-3 rounded-xl text-left border-2 transition-colors cursor-pointer ${isSelected ? 'bg-blue-50 border-blue-600 dark:bg-blue-950 dark:border-blue-500' : 'bg-surface border-default dark:border-zinc-700 hover:border-blue-400'}`}
                        >
                          <div className={`text-sm font-bold truncate ${isSelected ? 'text-blue-700 dark:text-blue-300' : 'text-secondary dark:text-zinc-200'}`}>
                            {vr.name.startsWith(`${selectedProduct.name} - `) ? vr.name.substring(selectedProduct.name.length + 3) : vr.name}
                          </div>
                          <div className="text-xs font-mono font-bold text-muted mt-1">₹{vr.price}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {hasOptions && productOptions.map(opt => (
                <div key={opt.id} className="space-y-3">
                  <div className="text-sm font-bold text-secondary dark:text-zinc-200">{opt.name}</div>
                  <div className="flex flex-wrap gap-2">
                    {opt.values.map(val => {
                      const optValue = val.name || val.value || "";
                      const optPrice = val.priceAdjustment || val.priceModifier || 0;
                      const isSelected = selectedOptions[opt.name]?.value === optValue;
                      return (
                        <button
                          key={optValue}
                          type="button"
                          onClick={() => handleOptionSelect(opt.name, optValue, optPrice)}
                          className={`px-4 py-2 rounded-lg text-sm font-semibold transition-colors border-2 cursor-pointer flex items-center gap-2 ${isSelected ? 'bg-blue-50 border-blue-600 text-blue-700 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-500' : 'bg-surface border-default dark:border-zinc-700 text-muted hover:border-blue-400 dark:text-muted'}`}
                        >
                          {optValue}
                          {optPrice > 0 && <span className="opacity-60 text-[10px]">+₹{optPrice}</span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}

              {!hasVariants && !hasOptions && (
                <div className="text-sm text-muted py-4 font-semibold">Standard item. No configuration required.</div>
              )}
            </>
          )}
        </div>

        <div className="p-4 border-t border-default bg-surface flex justify-between items-center">
          {isReady ? (
            <div className="flex-1 flex justify-between items-center">
              <div className="flex gap-6">
                <div className="space-y-0.5">
                  <span className="text-[10px] text-muted font-bold uppercase">Final Price</span>
                  <div className="text-sm font-black text-primary dark:text-primary font-mono">₹{finalPrice}</div>
                </div>
                {(isTreeMode ? selectedTreeSku : selectedVariant) && (
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-muted font-bold uppercase">Stock</span>
                    <div className={`text-sm font-black font-mono ${(isTreeMode ? (selectedTreeSku?.stockAvailable || 0) : (selectedVariant?.stock !== undefined ? selectedVariant.stock : selectedVariant?.stockAvailable || 0)) > 0 ? 'text-emerald-600 dark:text-emerald-455' : 'text-red-500'}`}>
                      {isTreeMode ? (selectedTreeSku?.stockAvailable || 0) : (selectedVariant?.stock !== undefined ? selectedVariant.stock : selectedVariant?.stockAvailable || 0)} left
                    </div>
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={() => {
                  onSelectSku(selectedProduct, resolvedSku);
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-primary font-bold px-6 py-2.5 rounded-xl shadow-md transition-colors cursor-pointer border-none active:scale-95"
              >
                <ShoppingCart className="w-4 h-4" />
                Add to Bill
              </button>
            </div>
          ) : (
            <div className="text-xs text-muted dark:text-muted flex items-center gap-2 font-bold select-none">
              <CheckCircle2 className="w-4 h-4 text-muted opacity-60" />
              {isTreeMode ? "Select an Option or SKU" : (missingVariant ? "Select a Variant" : `Select ${missingOptions[0]?.name} to continue`)}
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
