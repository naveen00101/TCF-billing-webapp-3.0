import React, { useState } from "react";
import { Trash2, RotateCcw, Package, FileText, Award } from "lucide-react";
import { SheetsSyncEngine } from "../utils/sheetsSync";
import { Product, Invoice, Agent } from "../types";

interface TrashTabProps {
  onRefresh: () => void;
  onShowNotification: (text: string, type: "success" | "error" | "info") => void;
}

type TrashType = "products" | "invoices" | "agents";

export default function TrashTab({ onRefresh, onShowNotification }: TrashTabProps) {
  const [activeType, setActiveType] = useState<TrashType>("products");

  // Get deleted items from SheetsSyncEngine
  const deletedProducts = SheetsSyncEngine.getProducts().filter((p) => p.isSoftDeleted);
  const deletedInvoices = SheetsSyncEngine.getInvoices().filter((i) => i.isSoftDeleted);
  const deletedAgents = SheetsSyncEngine.getAgents().filter((a) => a.isSoftDeleted);

  const handleRestoreProduct = async (product: Product) => {
    try {
      const allProducts = SheetsSyncEngine.getProducts();
      const updated = allProducts.map((p) =>
        p.id === product.id ? { ...p, isSoftDeleted: false } : p
      );
      await SheetsSyncEngine.saveProducts(updated);
      onShowNotification(`✓ Product '${product.name}' successfully restored.`, "success");
      onRefresh();
    } catch (e) {
      onShowNotification("Error restoring product", "error");
    }
  };

  const handleRestoreInvoice = async (invoice: Invoice) => {
    try {
      const allInvoices = SheetsSyncEngine.getInvoices();
      const updated = allInvoices.map((i) =>
        i.invoiceNo === invoice.invoiceNo ? { ...i, isSoftDeleted: false, status: "Work In Progress" as any } : i
      );
      await SheetsSyncEngine.saveInvoices(updated, true);
      onShowNotification(`✓ Invoice '${invoice.invoiceNo}' successfully restored.`, "success");
      onRefresh();
    } catch (e) {
      onShowNotification("Error restoring invoice", "error");
    }
  };

  const handleRestoreAgent = async (agent: Agent) => {
    try {
      const allAgents = SheetsSyncEngine.getAgents();
      const updated = allAgents.map((a) =>
        a.id === agent.id ? { ...a, isSoftDeleted: false } : a
      );
      await SheetsSyncEngine.saveAgents(updated);
      onShowNotification(`✓ Agent '${agent.name}' successfully restored.`, "success");
      onRefresh();
    } catch (e) {
      onShowNotification("Error restoring agent", "error");
    }
  };

  return (
    <div className="flex flex-col h-[calc(100vh-4rem)] bg-surface/30">
      {/* Header */}
      <div className="shrink-0 border-b border-default bg-card px-6 py-4 flex items-center justify-between z-10 relative shadow-sm">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-rose-500/10 text-rose-500 border border-rose-500/20 shadow-md">
            <Trash2 className="h-5 w-5" />
          </div>
          <div>
            <h1 className="text-base font-extrabold text-primary tracking-tight">System Trash Bin</h1>
            <p className="text-xs text-muted mt-0.5">Restore soft-deleted records. Data remains permanently in Google Sheets.</p>
          </div>
        </div>

        {/* Tab Selector */}
        <div className="flex bg-surface rounded-lg p-0.5 border border-default">
          <button
            onClick={() => setActiveType("products")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeType === "products"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-muted hover:text-primary"
            }`}
          >
            <Package className="h-3.5 w-3.5" />
            <span>Products ({deletedProducts.length})</span>
          </button>
          <button
            onClick={() => setActiveType("invoices")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeType === "invoices"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-muted hover:text-primary"
            }`}
          >
            <FileText className="h-3.5 w-3.5" />
            <span>Invoices ({deletedInvoices.length})</span>
          </button>
          <button
            onClick={() => setActiveType("agents")}
            className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
              activeType === "agents"
                ? "bg-rose-600 text-white shadow-sm"
                : "text-muted hover:text-primary"
            }`}
          >
            <Award className="h-3.5 w-3.5" />
            <span>Agents ({deletedAgents.length})</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-auto p-6">
        {activeType === "products" && (
          <div className="rounded-xl border border-default bg-card shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-default bg-card-secondary font-bold text-muted font-sans">
                  <th className="p-4">Product ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Category</th>
                  <th className="p-4">Price</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default font-medium text-primary font-sans">
                {deletedProducts.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted font-normal">
                      No deleted products found in the database.
                    </td>
                  </tr>
                ) : (
                  deletedProducts.map((p) => (
                    <tr key={p.id} className="hover:bg-card-secondary/20">
                      <td className="p-4 font-mono">{p.id}</td>
                      <td className="p-4 font-bold">{p.name}</td>
                      <td className="p-4">{p.category}</td>
                      <td className="p-4">₹{p.price.toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRestoreProduct(p)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeType === "invoices" && (
          <div className="rounded-xl border border-default bg-card shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-default bg-card-secondary font-bold text-muted font-sans">
                  <th className="p-4">Invoice No</th>
                  <th className="p-4">Customer Name</th>
                  <th className="p-4">Date</th>
                  <th className="p-4">Grand Total</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default font-medium text-primary font-sans">
                {deletedInvoices.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted font-normal">
                      No deleted invoices found in the database.
                    </td>
                  </tr>
                ) : (
                  deletedInvoices.map((inv) => (
                    <tr key={inv.invoiceNo} className="hover:bg-card-secondary/20">
                      <td className="p-4 font-mono font-bold">{inv.invoiceNo}</td>
                      <td className="p-4">{inv.customerName}</td>
                      <td className="p-4">{new Date(inv.createdDate || inv.date).toLocaleDateString()}</td>
                      <td className="p-4 font-mono">₹{inv.grandTotal.toFixed(2)}</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRestoreInvoice(inv)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeType === "agents" && (
          <div className="rounded-xl border border-default bg-card shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-default bg-card-secondary font-bold text-muted font-sans">
                  <th className="p-4">Agent ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Type</th>
                  <th className="p-4">Commission</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default font-medium text-primary font-sans">
                {deletedAgents.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted font-normal">
                      No deleted agents found in the database.
                    </td>
                  </tr>
                ) : (
                  deletedAgents.map((agt) => (
                    <tr key={agt.id} className="hover:bg-card-secondary/20">
                      <td className="p-4 font-mono">{agt.id}</td>
                      <td className="p-4 font-bold">{agt.name}</td>
                      <td className="p-4">{agt.agentType}</td>
                      <td className="p-4">{agt.commissionPercentage}%</td>
                      <td className="p-4 text-right">
                        <button
                          onClick={() => handleRestoreAgent(agt)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                        >
                          <RotateCcw className="h-3 w-3" />
                          <span>Restore</span>
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
