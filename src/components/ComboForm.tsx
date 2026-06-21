import React, { useState } from "react";
import { X, Plus, Trash2, Search } from "lucide-react";
import { Product, SimpleVariant } from "../types";
import { ProductSearchModal } from "./ProductSearchModal";
import { SimpleProductConfiguratorModal } from "./SimpleProductConfiguratorModal";

interface ComboItemInput {
  id: string;
  productId: string;
  variantId: string;
  productName: string;
  variantName: string;
  quantity: number;
}

interface ComboFormProps {
  initialProduct: Product | null;
  allProducts: Product[];
  onSave: (product: Product) => void;
  onCancel: () => void;
}

export function ComboForm({ initialProduct, allProducts, onSave, onCancel }: ComboFormProps) {
  const [name, setName] = useState(initialProduct?.name || "");
  const [hsnCode, setHsnCode] = useState(initialProduct?.hsnCode || "");
  const [price, setPrice] = useState(initialProduct?.price || 0);

  const initialItems = (initialProduct?.comboItems || []).map((item, idx) => ({
    id: `ci_${Date.now()}_${idx}`,
    productId: item.productId,
    variantId: item.variantId,
    productName: item.productName || "Unknown",
    variantName: item.variantName || "Unknown",
    quantity: item.quantity || 1
  }));

  const [comboItems, setComboItems] = useState<ComboItemInput[]>(initialItems);

  const [showProductSearch, setShowProductSearch] = useState(false);
  const [configuringProduct, setConfiguringProduct] = useState<Product | null>(null);

  const handleSelectProduct = (product: Product) => {
    setShowProductSearch(false);
    setConfiguringProduct(product);
  };

  const handleSelectVariant = (variant: SimpleVariant) => {
    if (!configuringProduct) return;
    
    setComboItems([
      ...comboItems,
      {
        id: `ci_${Date.now()}`,
        productId: configuringProduct.id,
        variantId: variant.id,
        productName: configuringProduct.name,
        variantName: variant.name,
        quantity: 1
      }
    ]);
    setConfiguringProduct(null);
  };

  const handleRemoveItem = (id: string) => {
    setComboItems(comboItems.filter(item => item.id !== id));
  };

  const handleUpdateQuantity = (id: string, qty: number) => {
    if (isNaN(qty) || qty < 1) qty = 1;
    setComboItems(comboItems.map(item => item.id === id ? { ...item, quantity: qty } : item));
  };

  const handleUpdateField = (id: string, field: keyof ComboItemInput, value: string) => {
    setComboItems(comboItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleAddCustomRow = () => {
    setComboItems([
      ...comboItems,
      {
        id: `ci_${Date.now()}`,
        productId: `custom_${Date.now()}`,
        variantId: "",
        productName: "",
        variantName: "",
        quantity: 1
      }
    ]);
  };


  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return alert("Combo name is required");
    if (comboItems.length === 0) return alert("Please add at least one item to the combo");

    const productToSave: Product = {
      ...(initialProduct || { 
        id: `PROD-${Date.now()}`,
        unit: "Pcs",
        inventoryType: "Stock Item"
      }),
      name: name.trim(),
      category: "Combo",
      hsnCode: hsnCode.trim(),
      price: Number(price) || 0,
      isCombo: true,
      comboItems: comboItems.map(c => ({
        productId: c.productId,
        variantId: c.variantId,
        productName: c.productName,
        variantName: c.variantName,
        quantity: c.quantity
      })),
      simpleVariants: [
        { id: 'combo-var', name: 'Bundle', price: Number(price) || 0, stock: 0 }
      ],
      // Clear out legacy arrays
      colors: [],
      variants: [],
      inventorySkus: [],
      productOptions: []
    };

    onSave(productToSave);
  };

  return (
    <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-lg border border-default p-6 max-w-3xl mx-auto w-full max-h-[90vh] overflow-y-auto">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg font-bold text-primary dark:text-gray-100">
          {initialProduct ? "Edit Combo" : "New Combo"}
        </h2>
        <button onClick={onCancel} className="p-2 rounded-lg text-muted hover:bg-surface">
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8">
        {/* Basic Details */}
        <div className="space-y-4">
          <h3 className="text-sm font-bold text-secondary dark:text-zinc-300 border-b pb-2 border-default">Combo Details</h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted">Combo Name <span className="text-red-500">*</span></label>
              <input 
                type="text" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                className="w-full px-3 py-2 border border-default rounded-lg text-sm bg-surface outline-none focus:border-blue-500 text-primary" 
                placeholder="e.g. Super Combo" 
                required 
              />
            </div>
            
            <div className="space-y-1">
              <label className="text-xs font-bold text-muted">Total Combo Price (₹) <span className="text-red-500">*</span></label>
              <input 
                type="number" 
                value={Number.isNaN(price) ? "" : price} 
                onChange={(e) => setPrice(e.target.value === "" ? "" as any : parseFloat(e.target.value))} 
                className="w-full px-3 py-2 border border-default rounded-lg text-sm bg-surface outline-none focus:border-blue-500 text-primary" 
                required
                min="0"
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

        {/* Combo Items */}
        <div className="space-y-4">
          <div className="flex items-center justify-between border-b pb-2 border-default">
            <h3 className="text-sm font-bold text-secondary dark:text-zinc-300">Included Products</h3>
            <div className="flex gap-2">
              <button 
                type="button"
                onClick={handleAddCustomRow}
                className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
              >
                <Plus className="w-3 h-3" />
                Add Row
              </button>
              <button 
                type="button"
                onClick={() => setShowProductSearch(true)}
                className="text-xs font-bold text-blue-600 flex items-center gap-1 hover:text-blue-700 bg-blue-50 px-2 py-1 rounded"
              >
                <Search className="w-3 h-3" />
                Add Product to Combo
              </button>
            </div>
          </div>

          <div className="bg-surface border border-default rounded-lg overflow-hidden">
            <table className="w-full text-left text-sm">
              <thead className="bg-card border-b border-default text-muted text-xs">
                <tr>
                  <th className="px-4 py-2 font-bold">Product</th>
                  <th className="px-4 py-2 font-bold">Variant</th>
                  <th className="px-4 py-2 font-bold w-24">Qty</th>
                  <th className="px-4 py-2 font-bold w-12 text-center"></th>
                </tr>
              </thead>
              <tbody>
                {comboItems.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-4 py-8 text-center text-muted text-xs">
                      No products added to this combo yet.
                    </td>
                  </tr>
                ) : (
                  comboItems.map((item) => (
                    <tr key={item.id} className="border-b border-default/50 last:border-0">
                      <td className="px-4 py-2 font-medium text-primary">
                        {item.productId.startsWith('custom_') ? (
                          <input 
                            type="text" 
                            value={item.productName} 
                            onChange={(e) => handleUpdateField(item.id, 'productName', e.target.value)}
                            className="w-full bg-card border border-default px-2 py-1 rounded outline-none text-primary text-xs"
                            placeholder="Type product name..."
                          />
                        ) : (
                          item.productName
                        )}
                      </td>
                      <td className="px-4 py-2 text-muted">
                        {item.productId.startsWith('custom_') ? (
                          <input 
                            type="text" 
                            value={item.variantName} 
                            onChange={(e) => handleUpdateField(item.id, 'variantName', e.target.value)}
                            className="w-full bg-card border border-default px-2 py-1 rounded outline-none text-primary text-xs"
                            placeholder="Variant (optional)"
                          />
                        ) : (
                          item.variantName
                        )}
                      </td>
                      <td className="px-4 py-2">
                        <input 
                          type="number" 
                          value={item.quantity} 
                          onChange={(e) => handleUpdateQuantity(item.id, parseInt(e.target.value))}
                          className="w-16 bg-card border border-default px-2 py-1 rounded outline-none font-mono text-primary text-xs"
                          min="1"
                        />
                      </td>
                      <td className="px-4 py-2 text-center">
                        <button 
                          type="button" 
                          onClick={() => handleRemoveItem(item.id)}
                          className="text-red-500 hover:text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mx-auto" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-4 border-t border-default flex justify-end gap-3">
          <button 
            type="button" 
            onClick={onCancel} 
            className="px-6 py-2 rounded-lg text-sm font-bold text-muted hover:bg-surface border border-transparent"
          >
            Cancel
          </button>
          <button 
            type="submit" 
            className="px-6 py-2 rounded-lg text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 shadow-md transition-all active:scale-95"
          >
            Save Combo
          </button>
        </div>
      </form>

      {showProductSearch && (
        <ProductSearchModal 
          products={allProducts.filter(p => !p.isCombo)} 
          onSelectProduct={handleSelectProduct}
          onClose={() => setShowProductSearch(false)}
        />
      )}

      {configuringProduct && (
        <SimpleProductConfiguratorModal 
          product={configuringProduct}
          onSelect={handleSelectVariant}
          onClose={() => setConfiguringProduct(null)}
        />
      )}
    </div>
  );
}
