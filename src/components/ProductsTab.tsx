import React, { useState, useMemo } from "react";
import { Plus, Package, Search } from "lucide-react";
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

  // Search & Sort states
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [sortKey, setSortKey] = useState<"name_asc" | "name_desc" | "price_asc" | "price_desc" | "category">("name_asc");

  const categories = useMemo(() => {
    const cats = products.filter(p => !p.isCombo && p.category).map(p => p.category);
    return Array.from(new Set(cats));
  }, [products]);

  const filteredAndSortedProducts = useMemo(() => {
    const list = products.filter(p => !p.isCombo);
    
    // Filter
    let filtered = list.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            (p.category && p.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
                            (p.hsnCode && p.hsnCode.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === "All" || p.category === selectedCategory;
      return matchesSearch && matchesCategory;
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortKey === "name_asc") return a.name.localeCompare(b.name);
      if (sortKey === "name_desc") return b.name.localeCompare(a.name);
      if (sortKey === "price_asc") return a.price - b.price;
      if (sortKey === "price_desc") return b.price - a.price;
      if (sortKey === "category") return (a.category || "").localeCompare(b.category || "");
      return 0;
    });

    return filtered;
  }, [products, searchQuery, selectedCategory, sortKey]);

  const filteredAndSortedCombos = useMemo(() => {
    const list = products.filter(p => p.isCombo);

    // Filter
    let filtered = list.filter(p => {
      return p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (p.comboItems && p.comboItems.some((item: any) => 
               (item.productName && item.productName.toLowerCase().includes(searchQuery.toLowerCase())) ||
               (item.variantName && item.variantName.toLowerCase().includes(searchQuery.toLowerCase()))
             ));
    });

    // Sort
    filtered.sort((a, b) => {
      if (sortKey === "name_asc") return a.name.localeCompare(b.name);
      if (sortKey === "name_desc") return b.name.localeCompare(a.name);
      if (sortKey === "price_asc") return a.price - b.price;
      if (sortKey === "price_desc") return b.price - a.price;
      return 0;
    });

    return filtered;
  }, [products, searchQuery, sortKey]);

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
      const newProducts = products.map(p => p.id === product.id ? { ...p, isSoftDeleted: true } : p);
      await SheetsSyncEngine.saveProducts(newProducts);
      SheetsSyncEngine.pushTransaction(SheetsSyncEngine.getConnectionSettings(), "upsertProduct", { ...product, isSoftDeleted: true }).catch(console.error);
      onShowNotification("Product moved to Trash successfully", "success");
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
            <h1 className="text-xl font-black tracking-tight text-primary dark:text-primary">Products & Pricing</h1>
            <p className="text-xs text-muted font-medium mt-0.5">Manage your catalog, configurations, and pricing</p>
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
        <div className="px-6 py-3 border-b border-default bg-surface/50 flex flex-col md:flex-row md:items-center justify-between gap-4">
          {/* Tabs */}
          <div className="flex items-center gap-4">
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

          {/* Search, Sort and Category filters */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-64">
              <input
                type="text"
                placeholder={activeTab === "combos" ? "Search combos..." : "Search products, category, HSN..."}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded-lg border border-default bg-card pl-9 pr-3 py-1.5 text-xs text-primary outline-none focus:border-blue-500"
              />
              <span className="absolute left-3 top-2 text-muted">
                <Search className="h-3.5 w-3.5" />
              </span>
            </div>

            {activeTab === "products" && (
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="rounded-lg border border-default bg-card px-3 py-1.5 text-xs text-secondary outline-none focus:border-blue-500 font-bold"
              >
                <option value="All">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            )}

            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as any)}
              className="rounded-lg border border-default bg-card px-3 py-1.5 text-xs text-secondary outline-none focus:border-blue-500 font-bold"
            >
              <option value="name_asc">Name (A-Z)</option>
              <option value="name_desc">Name (Z-A)</option>
              <option value="price_asc">Price (Low to High)</option>
              <option value="price_desc">Price (High to Low)</option>
              {activeTab === "products" && <option value="category">Category</option>}
            </select>
          </div>
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
                products={filteredAndSortedProducts}
                onEdit={(prod) => {
                  setEditingProduct(prod);
                  setShowAddForm(true);
                }}
                onDelete={executeDeleteProduct}
              />
            ) : (
              <ComboRegistryTable
                combos={filteredAndSortedCombos}
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
