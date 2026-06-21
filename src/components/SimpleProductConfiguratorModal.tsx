import React, { useState } from 'react';
import { X, CheckCircle, Package } from 'lucide-react';
import { Product, SimpleVariant, ProductSize } from '../types';

interface SimpleProductConfiguratorModalProps {
  product: Product;
  onClose: () => void;
  onSelect: (variant: SimpleVariant, color: string | undefined, size: ProductSize | undefined) => void;
}

export function SimpleProductConfiguratorModal({ product, onClose, onSelect }: SimpleProductConfiguratorModalProps) {
  const variants = product.simpleVariants || [];
  const colors = product.colors || [];
  const sizes = product.sizes || [];
  
  const [selectedVariant, setSelectedVariant] = useState<SimpleVariant | null>(variants.length === 1 ? variants[0] : null);
  const [selectedColor, setSelectedColor] = useState<string | undefined>(colors.length === 1 ? colors[0] : undefined);
  const [selectedSize, setSelectedSize] = useState<ProductSize | undefined>(sizes.length === 1 ? sizes[0] : undefined);

  const handleConfirm = () => {
    if (!selectedVariant) return;
    onSelect(selectedVariant, selectedColor, selectedSize);
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden border border-default flex flex-col max-h-[90vh]">
        <div className="p-5 border-b border-default flex items-center justify-between bg-surface">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 rounded-lg">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-primary dark:text-gray-100 text-lg">{product.name}</h3>
              <p className="text-xs text-muted">Configure your item</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-muted hover:bg-card-secondary dark:hover:bg-zinc-800 rounded-lg transition-colors">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6">
          {/* Variants Selection */}
          <div className="space-y-3">
            <label className="text-xs font-extrabold uppercase tracking-widest text-muted">Select Variant <span className="text-red-500">*</span></label>
            {variants.length === 0 ? (
              <p className="text-sm text-red-500">No variants available for this product.</p>
            ) : (
              <div className="grid gap-2">
                {variants.map(v => (
                  <button
                    key={v.id}
                    onClick={() => setSelectedVariant(v)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedVariant?.id === v.id 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' 
                        : 'border-default bg-card hover:border-blue-300'
                    }`}
                  >
                    <div>
                      <div className="font-bold text-primary dark:text-zinc-100">{v.name}</div>

                    </div>
                    <div className="font-mono font-bold text-blue-700 dark:text-blue-400">
                      ₹{v.price.toLocaleString()}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Colors Selection */}
          {colors.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-extrabold uppercase tracking-widest text-muted">Select Color (Optional)</label>
              <div className="flex flex-wrap gap-2">
                {colors.map(c => (
                  <button
                    key={c}
                    onClick={() => setSelectedColor(c === selectedColor ? undefined : c)}
                    className={`px-4 py-2 rounded-lg text-sm font-bold transition-all border ${
                      selectedColor === c 
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-105' 
                        : 'bg-card text-secondary border-default hover:border-emerald-300 hover:bg-surface'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Sizes Selection */}
          {sizes.length > 0 && (
            <div className="space-y-3 pt-2">
              <label className="text-xs font-extrabold uppercase tracking-widest text-muted">Select Size (Optional)</label>
              <div className="grid gap-2">
                {sizes.map((s, idx) => (
                  <button
                    key={idx}
                    onClick={() => setSelectedSize(selectedSize?.name === s.name ? undefined : s)}
                    className={`flex items-center justify-between p-3 rounded-xl border text-left transition-all ${
                      selectedSize?.name === s.name 
                        ? 'border-blue-500 bg-blue-50 dark:bg-blue-900/20 ring-2 ring-blue-500/20' 
                        : 'border-default bg-card hover:border-blue-300'
                    }`}
                  >
                    <div className="font-bold text-primary dark:text-zinc-100">{s.name}</div>
                    {s.price > 0 && (
                      <div className="font-mono font-bold text-blue-700 dark:text-blue-400">
                        +₹{s.price.toLocaleString()}
                      </div>
                    )}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-default bg-surface flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-sm font-medium text-secondary">
            Total Price: <span className="text-lg font-bold text-primary dark:text-white">
              ₹{((selectedVariant?.price || 0) + (selectedSize?.price || 0)).toLocaleString()}
            </span>
          </div>
          <div className="flex justify-end gap-3 w-full sm:w-auto">
            <button 
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl font-bold text-sm text-secondary bg-card border border-default hover:bg-gray-50 transition-colors w-full sm:w-auto"
            >
            Cancel
          </button>
          <button 
            onClick={handleConfirm}
            disabled={!selectedVariant}
            className="px-6 py-2.5 rounded-xl font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 transition-all"
          >
            <CheckCircle className="w-4 h-4" />
            Confirm Selection
          </button>
        </div>
      </div>
    </div>
  </div>
  );
}
