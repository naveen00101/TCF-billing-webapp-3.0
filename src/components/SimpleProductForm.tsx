import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Copy } from "lucide-react";
import { Product, SimpleVariant } from "../types";

interface SimpleProductFormProps {
  initialProduct: Product | null;
  allProducts: Product[];
  onSave: (product: Product) => void;
  onCancel: () => void;
}

export function SimpleProductForm({ initialProduct, allProducts, onSave, onCancel }: SimpleProductFormProps) {
  const [name, setName] = useState(initialProduct?.name || "");
  const [hsnCode, setHsnCode] = useState(initialProduct?.hsnCode || "");
  const [category, setCategory] = useState(initialProduct?.category || "");
  
  const [variants, setVariants] = useState<SimpleVariant[]>(
    initialProduct?.simpleVariants?.length 
      ? initialProduct.simpleVariants 
      : [{ id: `var_${Date.now()}`, name: "Standard", price: initialProduct?.price || 0 }]
  );

  const [colors, setColors] = useState<string[]>(initialProduct?.colors || []);
  const [colorInput, setColorInput] = useState("");
  const [sizes, setSizes] = useState<{name: string, price: number}[]>(initialProduct?.sizes || []);
  const [showCopyModal, setShowCopyModal] = useState(false);

  const handleAddColor = () => {
    if (colorInput.trim() && !colors.includes(colorInput.trim())) {
      setColors([...colors, colorInput.trim()]);
    }
    setColorInput("");
  };

  const handleRemoveColor = (color: string) => {
    setColors(colors.filter(c => c !== color));
  };

  const handleAddVariant = () => {
    setVariants([...variants, { id: `var_${Date.now()}_${Math.random()}`, name: "New Variant", price: 0 }]);
  };

  const handleRemoveVariant = (id: string) => {
    if (variants.length === 1) return; // Prevent removing last variant
    setVariants(variants.filter(v => v.id !== id));
  };

  const handleUpdateVariant = (id: string, field: keyof SimpleVariant, value: string | number) => {
    setVariants(variants.map(v => v.id === id ? { ...v, [field]: value } : v));
  };

  const handleAddSize = () => {
    setSizes([...sizes, { name: "", price: 0 }]);
  };

  const handleRemoveSize = (index: number) => {
    setSizes(sizes.filter((_, i) => i !== index));
  };

  const handleUpdateSize = (index: number, field: "name" | "price", value: string | number) => {
    setSizes(sizes.map((s, i) => i === index ? { ...s, [field]: value } : s));
  };

  const handleCopyFromProduct = (prodToCopy: Product) => {
    if (prodToCopy.simpleVariants && prodToCopy.simpleVariants.length > 0) {
      // Generate new IDs for the copied variants
      const copiedVariants = prodToCopy.simpleVariants.map(v => ({
        ...v,
        id: `var_${Date.now()}_${Math.random()}`
      }));
      setVariants(copiedVariants);
    }
    if (prodToCopy.colors && prodToCopy.colors.length > 0) {
      setColors(prodToCopy.colors);
    }
    if (prodToCopy.sizes && prodToCopy.sizes.length > 0) {
      setSizes(prodToCopy.sizes);
    }
    setShowCopyModal(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Product name is required.");
    
    // Ensure we have at least one variant and it has a valid price
    const safeVariants = variants.map(v => ({
      ...v,
      name: v.name.trim() || "Standard",
      price: Number(v.price) || 0
    }));

    const productToSave: Product = {
      ...(initialProduct || { 
        id: `PROD-${Date.now()}`,
        unit: "Pcs",
        inventoryType: "Stock Item"
      }),
      name: name.trim(),
      category: category.trim() || "General",
      hsnCode: hsnCode.trim(),
      price: safeVariants[0].price, // Base price is the first variant's price
      simpleVariants: safeVariants,
      colors: colors,
      sizes: sizes.filter(s => s.name.trim() !== "").map(s => ({
        name: s.name.trim(),
        price: Number(s.price) || 0
      })),

    };

    onSave(productToSave);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-default p-6 max-w-3xl mx-auto w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-primary dark:text-gray-100">
          {initialProduct ? "Edit Product" : "New Product"}
        </h2>
        <button onClick={onCancel} className="p-2 rounded-lg text-muted hover:bg-surface">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-secondary dark:text-zinc-300 border-b pb-2 border-default">Basic Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted">Product Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full px-3 py-2 border border-default rounded-lg text-sm bg-surface outline-none focus:border-blue-500 text-primary" 
                placeholder="e.g. Elegant Sofa" 
                required 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted">Category</label>
              <input 
                type="text" 
                value={category} 
                onChange={(e) => setCategory(e.target.value)} 
                className="w-full px-3 py-2 border border-default rounded-lg text-sm bg-surface outline-none focus:border-blue-500 text-primary" 
                placeholder="e.g. Chairs" 
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs font-bold text-muted">HSN Code</label>
              <input 
                type="text" 
                value={hsnCode} 
                onChange={(e) => setHsnCode(e.target.value)} 
                className="w-full px-3 py-2 border border-default rounded-lg text-sm bg-surface outline-none focus:border-blue-500 text-primary" 
              />
            </div>
          </div>
        </div>

        {/* Variants */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-default">
            <h3 className="text-sm font-bold text-secondary dark:text-zinc-300">Variants & Prices</h3>
            <button 
              type="button"
              onClick={() => setShowCopyModal(true)}
              className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700"
            >
              <Copy className="w-3 h-3" />
              Copy from existing Product
            </button>
          </div>

          <div className="bg-surface border border-default rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-card border-b border-default text-muted text-xs">
                <tr>
                  <th className="px-4 py-2 font-bold">Variant Name</th>
                  <th className="px-4 py-2 font-bold w-32">Price (₹)</th>
                  <th className="px-4 py-2 font-bold w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {variants.map((v, idx) => (
                  <tr key={v.id} className="border-b border-default/50 last:border-0">
                    <td className="px-4 py-2">
                      <input 
                        type="text" 
                        value={v.name} 
                        onChange={(e) => handleUpdateVariant(v.id, "name", e.target.value)}
                        className="w-full bg-transparent outline-none font-medium text-primary placeholder-muted"
                        placeholder="e.g. Standard"
                      />
                    </td>
                    <td className="px-4 py-2">
                      <input 
                        type="number" 
                        value={Number.isNaN(v.price) ? "" : v.price} 
                        onChange={(e) => handleUpdateVariant(v.id, "price", e.target.value === "" ? "" : parseFloat(e.target.value))}
                        className="w-full bg-transparent outline-none font-mono text-primary"
                        min="0"
                      />
                    </td>
                    <td className="px-4 py-2 text-center">
                      <button 
                        type="button" 
                        onClick={() => handleRemoveVariant(v.id)}
                        disabled={variants.length === 1}
                        className="text-red-500 hover:text-red-600 disabled:opacity-30 disabled:cursor-not-allowed"
                      >
                        <Trash2 className="w-4 h-4 mx-auto" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <div className="p-2 bg-card border-t border-default">
              <button 
                type="button" 
                onClick={handleAddVariant}
                className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50/50"
              >
                <Plus className="w-3 h-3" />
                Add Variant Row
              </button>
            </div>
          </div>
        </div>

        {/* Colors (Tags) */}
        <div className="space-y-4">
          <div className="border-b pb-2 border-default">
            <h3 className="text-sm font-bold text-secondary dark:text-zinc-300">Available Colors</h3>
            <p className="text-[10px] text-muted mt-0.5">Colors do not affect the base price. They are labels selected during billing.</p>
          </div>
          
          <div className="flex items-center gap-2">
            <input 
              type="text" 
              value={colorInput}
              onChange={(e) => setColorInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), handleAddColor())}
              className="flex-1 px-3 py-2 border border-default rounded-lg text-sm bg-surface outline-none focus:border-blue-500 text-primary" 
              placeholder="Type a color and press Enter (e.g. Red)" 
            />
            <button 
              type="button" 
              onClick={handleAddColor}
              className="px-4 py-2 bg-card border border-default rounded-lg text-sm font-bold text-secondary hover:bg-surface"
            >
              Add Color
            </button>
          </div>

          {colors.length > 0 && (
            <div className="flex flex-wrap gap-2 pt-2">
              {colors.map(color => (
                <div key={color} className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-400 rounded-full text-xs font-bold border border-blue-200 dark:border-blue-800">
                  {color}
                  <button type="button" onClick={() => handleRemoveColor(color)} className="hover:text-red-500 ml-1">
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Sizes */}
        <div className="space-y-4">
          <div className="border-b pb-2 border-default">
            <h3 className="text-sm font-bold text-secondary dark:text-zinc-300">Available Sizes</h3>
            <p className="text-[10px] text-muted mt-0.5">Sizes can optionally add a price modifier to the main product.</p>
          </div>

          <div className="bg-surface border border-default rounded-lg overflow-hidden">
            {sizes.length > 0 && (
              <table className="w-full text-left text-sm">
                <thead className="bg-card border-b border-default text-muted text-xs">
                  <tr>
                    <th className="px-4 py-2 font-bold">Size Name</th>
                    <th className="px-4 py-2 font-bold w-32">Price Modifier (+₹)</th>
                    <th className="px-4 py-2 font-bold w-12 text-center"></th>
                  </tr>
                </thead>
                <tbody>
                  {sizes.map((s, idx) => (
                    <tr key={idx} className="border-b border-default/50 last:border-0">
                      <td className="px-4 py-2">
                        <input 
                          type="text" 
                          value={s.name} 
                          onChange={(e) => handleUpdateSize(idx, "name", e.target.value)}
                          className="w-full bg-transparent outline-none font-medium text-primary placeholder-muted"
                          placeholder="e.g. 6 x 6"
                        />
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          value={Number.isNaN(s.price) ? "" : s.price} 
                          onChange={(e) => handleUpdateSize(idx, "price", e.target.value === "" ? "" : parseFloat(e.target.value))}
                          className="w-full bg-transparent outline-none font-mono text-primary"
                          min="0"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveSize(idx)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
            <div className="p-2 bg-card border-t border-default">
              <button 
                type="button" 
                onClick={handleAddSize}
                className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 px-2 py-1 rounded hover:bg-blue-50/50"
              >
                <Plus className="w-3 h-3" />
                Add Size
              </button>
            </div>
          </div>
        </div>

        {/* Submit Actions */}
        <div className="pt-6 border-t border-default flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onCancel}
            className="px-5 py-2.5 rounded-lg font-bold text-sm text-secondary bg-card border border-default hover:bg-surface"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-5 py-2.5 rounded-lg font-bold text-sm text-white bg-blue-600 hover:bg-blue-700 shadow-sm"
          >
            Save Product
          </button>
        </div>
      </form>

      {/* Copy Variants Modal */}
      {showCopyModal && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden flex flex-col max-h-[80vh]">
            <div className="p-4 border-b border-default flex items-center justify-between">
              <h3 className="font-bold text-primary">Copy Variants From...</h3>
              <button onClick={() => setShowCopyModal(false)}><X className="w-4 h-4 text-muted" /></button>
            </div>
            <div className="overflow-y-auto p-2">
              {allProducts.filter(p => p.simpleVariants && p.simpleVariants.length > 0).length === 0 ? (
                <p className="text-center text-sm text-muted py-8">No products with variants found to copy from.</p>
              ) : (
                <div className="space-y-1">
                  {allProducts.filter(p => p.simpleVariants && p.simpleVariants.length > 0).map(p => (
                    <button 
                      key={p.id}
                      type="button"
                      onClick={() => handleCopyFromProduct(p)}
                      className="w-full text-left p-3 hover:bg-surface rounded-lg border border-transparent hover:border-default transition-all flex items-center justify-between"
                    >
                      <span className="font-bold text-sm text-primary">{p.name}</span>
                      <span className="text-[10px] bg-blue-50 text-blue-600 px-2 py-1 rounded font-bold">{p.simpleVariants?.length} Variants</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
