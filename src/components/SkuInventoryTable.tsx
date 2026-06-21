import React, { useState } from 'react';
import { Edit, Package, Tag, Activity, Archive, Check, X } from 'lucide-react';
import { Product, InventorySKU } from '../types';
import { SheetsSyncEngine } from '../utils/sheetsSync';

interface GroupedSKU {
 product: Product;
 sku: InventorySKU | null; // null if product has no skus (but is leaf)
 skuText: string;
 stock: number;
 price: number;
 hsnCode: string;
 barcode: string;
 status: string;
}

interface SkuInventoryTableProps {
 products: Product[];
 onEdit: (p: Product) => void;
 onRefresh?: () => void;
 onShowNotification?: (msg: string, type:"success" |"error" |"info") => void;
}

export function SkuInventoryTable({ products, onEdit, onRefresh, onShowNotification }: SkuInventoryTableProps) {
 const rows: GroupedSKU[] = [];

 // 1. Get all tree-based SKU nodes
 const skuNodes = products.filter(p => p.nodeType ==="SKU");
 skuNodes.forEach(p => {
 rows.push({
 product: p,
 sku: null,
 skuText: p.sku ? `${p.name} (${p.sku})` : p.name,
 stock: p.stockAvailable ?? 0,
 price: p.price ?? 0,
 hsnCode: p.hsnCode ||"",
 barcode: p.barcode ||"",
 status: p.status || 'Active'
 });
 });

 // 2. Also support embedded inventorySkus on Products for backward compatibility
 const productsWithEmbeddedSkus = products.filter(p => p.nodeType ==="Product" && p.inventorySkus && p.inventorySkus.length > 0);
 productsWithEmbeddedSkus.forEach(p => {
 p.inventorySkus?.forEach(sku => {
 rows.push({
 product: p,
 sku,
 skuText: sku.skuCode ? `${p.name} - ${sku.skuCode}` : p.name,
 stock: sku.stock || 0,
 price: sku.price || p.price || 0,
 hsnCode: sku.hsnCode ||"",
 barcode: sku.barcode ||"",
 status: p.status || 'Active'
 });
 });
 });

 // Inline editing state
 const [editingKey, setEditingKey] = useState<string | null>(null);
 const [editStock, setEditStock] = useState<string>("");
 const [editPrice, setEditPrice] = useState<number>(0);
 const [editHsn, setEditHsn] = useState<string>("");
 const [editBarcode, setEditBarcode] = useState<string>("");

 const getRowKey = (row: GroupedSKU) => {
 return row.sku ? `${row.product.id}_${row.sku.skuId}` : row.product.id;
 };

 const handleStartEdit = (row: GroupedSKU) => {
 const key = getRowKey(row);
 setEditingKey(key);
 setEditStock(String(row.stock));
 setEditPrice(row.price);
 setEditHsn(row.hsnCode);
 setEditBarcode(row.barcode);
 };

 const parseStockMath = (current: number, input: string): number => {
 const trimmed = input.trim();
 if (trimmed.startsWith('+') || trimmed.startsWith('-')) {
 const modifier = parseInt(trimmed, 10);
 if (isNaN(modifier)) return current;
 return Math.max(0, current + modifier);
 }
 const val = parseInt(trimmed, 10);
 return isNaN(val) ? current : Math.max(0, val);
 };

 const handleSaveInline = async (row: GroupedSKU) => {
 try {
 const allProducts = SheetsSyncEngine.getProducts();
 const targetStock = parseStockMath(row.stock, editStock);

 const updatedProducts = allProducts.map(p => {
 if (p.id !== row.product.id) return p;

 // Tree-based Node logic
 if (!row.sku) {
 return {
 ...p,
 stockAvailable: targetStock,
 price: Number(editPrice),
 sellingPrice: Number(editPrice),
 hsnCode: editHsn.trim(),
 barcode: editBarcode.trim()
 };
 }

 // Embedded inventorySkus logic
 const updatedSkus = (p.inventorySkus || []).map(s => {
 if (s.skuId !== row.sku!.skuId) return s;
 return {
 ...s,
 stock: targetStock,
 price: Number(editPrice),
 hsnCode: editHsn.trim(),
 barcode: editBarcode.trim()
 };
 });

 return {
 ...p,
 inventorySkus: updatedSkus
 };
 });

 SheetsSyncEngine.saveProducts(updatedProducts);

 // Async push to Sheets Script for longevity
 const conn = SheetsSyncEngine.getConnectionSettings();
 const updatedRecord = updatedProducts.find(p => p.id === row.product.id);
 if (updatedRecord) {
 await SheetsSyncEngine.pushTransaction(conn,"upsertProduct", updatedRecord);
 }

 if (onShowNotification) {
 onShowNotification(`✓ SKU Stock updated inline to ${targetStock}!`,"success");
 }
 setEditingKey(null);
 if (onRefresh) onRefresh();
 } catch (e: any) {
 console.error(e);
 if (onShowNotification) {
 onShowNotification("Failed to save inline SKU metrics.","error");
 }
 }
 };

 return (
 <div className="bg-card rounded-xl border border-default shadow-sm overflow-hidden animate-in fade-in">
 <div className="p-4 border-b border-default bg-surface/50 /50 flex justify-between items-center">
 <h2 className="text-sm font-bold text-primary dark:text-zinc-100 flex items-center gap-2 uppercase tracking-tight">
 <Tag className="w-4 h-4 text-purple-600 dark:text-purple-400" />
 SKU Inventory Database
 </h2>
 <span className="text-[10px] text-muted font-semibold">Click stock value to edit inline or use + / - math modifiers</span>
 </div>
 <div className="overflow-x-auto">
 <table className="w-full text-left text-sm text-muted dark:text-muted">
 <thead className="bg-table-header border-b border-default text-[10px] uppercase font-bold tracking-wider text-muted">
 <tr>
 <th className="px-4 py-3 min-w-[200px]">SKU</th>
 <th className="px-4 py-3 text-center w-[120px]">Stock</th>
 <th className="px-4 py-3 text-center w-[140px]">Price</th>
 <th className="px-4 py-3 text-center w-[120px]">HSN Code</th>
 <th className="px-4 py-3 text-center">Barcode</th>
 <th className="px-4 py-3 text-center">Status</th>
 <th className="px-4 py-3 text-center w-[120px]">Actions</th>
 </tr>
 </thead>
 <tbody className="divide-y divide-gray-50 /50">
 {rows.length === 0 ? (
 <tr><td colSpan={7} className="px-4 py-12 text-center text-muted font-medium">No SKUs found. Create products to generate SKUs.</td></tr>
 ) : (
 rows.map((row, idx) => {
 const key = getRowKey(row);
 const isEditing = editingKey === key;
 return (
 <tr key={idx} className="hover:bg-table-hover transition-colors transition-colors">
 <td className="px-4 py-3 font-bold text-primary dark:text-zinc-100">
 <div className="flex items-center gap-2 text-xs">
 <Tag className="w-3.5 h-3.5 text-muted shrink-0" />
 <span className="truncate max-w-[220px]" title={row.skuText}>{row.skuText}</span>
 </div>
 </td>
 <td className="px-4 py-3 text-center">
 {isEditing ? (
 <input
 type="text"
 value={editStock}
 onChange={e => setEditStock(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') handleSaveInline(row); }}
 className="w-20 px-2 py-1 text-center text-xs font-bold border rounded bg-input dark:border-zinc-700 text-primary dark:text-zinc-100"
 placeholder="e.g. +5, -1"
 />
 ) : (
 <button
 type="button"
 onClick={() => handleStartEdit(row)}
 className={`inline-flex items-center justify-center px-3 py-1 rounded-full text-xs font-bold cursor-pointer hover:ring-2 hover:ring-blue-500/50 transition-all ${row.stock > 5 ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400' : (row.stock > 0 ? 'bg-orange-50 text-orange-600 dark:bg-orange-950/40 dark:text-orange-400' : 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400')}`}
 >
 {row.stock}
 </button>
 )}
 </td>
 <td className="px-4 py-3 text-center font-mono font-bold text-primary dark:text-zinc-100">
 {isEditing ? (
 <input
 type="number"
 value={editPrice}
 onChange={e => setEditPrice(parseFloat(e.target.value) || 0)}
 onKeyDown={e => { if (e.key === 'Enter') handleSaveInline(row); }}
 className="w-24 px-2 py-1 text-center text-xs font-bold border rounded bg-input dark:border-zinc-700 text-primary dark:text-zinc-100"
 />
 ) : (
 <button
 type="button"
 onClick={() => handleStartEdit(row)}
 className="hover:underline text-primary dark:text-gray-150 cursor-pointer font-bold"
 >
 ₹{row.price}
 </button>
 )}
 </td>
 <td className="px-4 py-3 text-center">
 {isEditing ? (
 <input
 type="text"
 value={editHsn}
 onChange={e => setEditHsn(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') handleSaveInline(row); }}
 className="w-24 px-2 py-1 text-center text-xs border rounded bg-input dark:border-zinc-700 text-primary dark:text-zinc-100"
 />
 ) : (
 <span className="text-xs font-mono text-muted dark:text-muted bg-card-secondary px-2 py-0.5 rounded">
 {row.hsnCode ||"—"}
 </span>
 )}
 </td>
 <td className="px-4 py-3 text-center">
 {isEditing ? (
 <input
 type="text"
 value={editBarcode}
 onChange={e => setEditBarcode(e.target.value)}
 onKeyDown={e => { if (e.key === 'Enter') handleSaveInline(row); }}
 className="w-28 px-2 py-1 text-center text-xs border rounded bg-input dark:border-zinc-700 text-primary dark:text-zinc-100 font-mono"
 />
 ) : (
 <span className="text-xs font-mono text-muted">
 {row.barcode ||"—"}
 </span>
 )}
 </td>
 <td className="px-4 py-3 text-center">
 <span className={`inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full ${row.status === 'Active' ? 'text-emerald-600 bg-emerald-50 dark:bg-emerald-900/20 dark:text-emerald-400' : 'text-muted bg-card-secondary dark:bg-zinc-800 dark:text-muted'}`}>
 <Activity className="w-3 h-3" />
 {row.status}
 </span>
 </td>
 <td className="px-4 py-3 text-center">
 {isEditing ? (
 <div className="flex justify-center items-center gap-1.5 animate-in zoom-in-95 duration-150">
 <button
 type="button"
 onClick={() => handleSaveInline(row)}
 className="p-1 px-1.5 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition"
 title="Save inline"
 >
 <Check className="w-3.5 h-3.5" />
 </button>
 <button
 type="button"
 onClick={() => setEditingKey(null)}
 className="p-1 px-1.5 bg-gray-200 dark:bg-zinc-800 text-muted dark:text-muted rounded hover:bg-gray-300 dark:hover:bg-zinc-750 transition"
 title="Cancel"
 >
 <X className="w-3.5 h-3.5" />
 </button>
 </div>
 ) : (
 <div className="flex justify-center items-center gap-1.5">
 <button
 type="button"
 onClick={() => handleStartEdit(row)}
 className="p-1.5 hover:bg-gray-200 dark:hover:bg-zinc-700 text-muted hover:text-indigo-600 rounded transition-colors"
 title="Quick Editable Inventory"
 >
 <Edit className="w-3.5 h-3.5" />
 </button>
 <button
 type="button"
 onClick={() => onEdit(row.product)}
 className="text-[10px] font-bold bg-blue-50  text-blue-700 dark:text-blue-400 hover:bg-blue-100 px-2 py-1 rounded"
 title="Open Product Model Tabbed Editor"
 >
 Model Details
 </button>
 </div>
 )}
 </td>
 </tr>
 );
 })
 )}
 </tbody>
 </table>
 </div>
 </div>
 );
}
