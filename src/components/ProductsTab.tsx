import React, { useState } from "react";
import { Plus, Package } from "lucide-react";
import { Product, Invoice, InvoiceItem } from "../types";
import { SheetsSyncEngine } from "../utils/sheetsSync";
import { SimpleProductForm } from "./SimpleProductForm";
import { ProductRegistryTable } from "./ProductRegistryTable";
import { ComboForm } from "./ComboForm";
import { ComboRegistryTable } from "./ComboRegistryTable";

interface ProductsTabProps {
  products: Product[];
  invoices: Invoice[];
  invoiceItems: InvoiceItem[];
  onRefresh: () => void;
  onShowNotification: (text: string, type: "success" | "error" | "info") => void;
}

export default function ProductsTab({ products, onRefresh, onShowNotification }: ProductsTabProps) {
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [activeTab, setActiveTab] = useState<"products" | "combos">("products");

  const handleSaveSimpleProduct = async (productData: any) => {
    try {
      const dataToSave = { ...productData };
      if (!dataToSave.id) {
        dataToSave.id = `PROD-${Date.now()}`;
        dataToSave.nodeType = "Product";
        dataToSave.isLeaf = true;
      }
      
      const newProducts = [...products.filter(p => p.id !== dataToSave.id), dataToSave as Product];
      await SheetsSyncEngine.saveProducts(newProducts);
      SheetsSyncEngine.pushTransaction(SheetsSyncEngine.getConnectionSettings(), "upsertProduct", dataToSave).catch(console.error);
      onShowNotification("Product saved successfully", "success");
      setShowAddForm(false);
      onRefresh();
    } catch (e) {
      console.error(e);
      onShowNotification("Error saving product", "error");
    }
  };

  const executeDeleteProduct = async (product: Product) => {
    try {
      const newProducts = products.filter(p => p.id !== product.id);
      await SheetsSyncEngine.saveProducts(newProducts);
      SheetsSyncEngine.pushTransaction(SheetsSyncEngine.getConnectionSettings(), "deleteProduct", product).catch(console.error);
      onShowNotification("Product deleted successfully", "success");
      onRefresh();
    } catch (e) {
      console.error(e);
      onShowNotification("Error deleting product", "error");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-surface/30">
      {/* Header */}
      <div className="shrink-0 border-b border-default bg-card px-6 py-4 flex items-center justify-between z-10 relative shadow-sm">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 rounded-lg">
            <Package className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-primary dark:text-primary">Products & Inventory</h1>
            <p className="text-xs text-muted font-medium mt-0.5">Manage your catalog, variants, and stock</p>
          </div>
        </div>

        {!showAddForm && (
          <button
            onClick={() => {
              setEditingProduct(null);
              setShowAddForm(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-blue-700 shadow-sm transition-all active:scale-95 border-none cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            {activeTab === "combos" ? "Add Combo" : "Add Product"}
          </button>
        )}
      </div>

      {!showAddForm && (
        <div className="px-6 py-2 border-b border-default bg-surface/50 flex items-center gap-4">
          <button 
            onClick={() => setActiveTab("products")}
            className={`pb-2 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === "products" ? "border-blue-600 text-blue-600" : "border-transparent text-muted hover:text-primary"}`}
          >
            Standard Products
          </button>
          <button 
            onClick={() => setActiveTab("combos")}
            className={`pb-2 px-1 border-b-2 font-bold text-sm transition-colors ${activeTab === "combos" ? "border-blue-600 text-blue-600" : "border-transparent text-muted hover:text-primary"}`}
          >
            Combo Products
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-4 md:p-6 custom-scrollbar">
        {showAddForm ? (
          activeTab === "combos" ? (
            <ComboForm 
              initialProduct={editingProduct}
              allProducts={products}
              onSave={handleSaveSimpleProduct}
              onCancel={() => setShowAddForm(false)}
            />
          ) : (
            <SimpleProductForm 
              initialProduct={editingProduct} 
              allProducts={products} 
              onSave={handleSaveSimpleProduct} 
              onCancel={() => setShowAddForm(false)} 
            />
          )
        ) : (
          <div className="space-y-6">
            {activeTab === "products" ? (
              <ProductRegistryTable
                products={products.filter(p => !p.isCombo)}
                onEdit={(prod) => {
                  setEditingProduct(prod);
                  setShowAddForm(true);
                }}
                onDelete={executeDeleteProduct}
              />
            ) : (
              <ComboRegistryTable
                combos={products.filter(p => p.isCombo)}
                onEdit={(combo) => {
                  setEditingProduct(combo);
                  setShowAddForm(true);
                }}
                onDelete={executeDeleteProduct}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
