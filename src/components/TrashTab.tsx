import React, { useState } from "react";
import { Trash2, RotateCcw, Package, FileText, Award, X, ShieldAlert, Lock, Key, Users, UserCheck, Tag } from "lucide-react";
import { SheetsSyncEngine } from "../utils/sheetsSync";
import { Product, Invoice, Agent, Customer, User, PromoCode } from "../types";
import MD5 from "crypto-js/md5";

interface TrashTabProps {
  onRefresh: () => void;
  onShowNotification: (text: string, type: "success" | "error" | "info") => void;
}

type TrashType = "products" | "invoices" | "agents" | "customers" | "users" | "promo_codes";

export default function TrashTab({ onRefresh, onShowNotification }: TrashTabProps) {
  const [activeType, setActiveType] = useState<TrashType>("products");
  
  // State for single-item deletion
  const [showSingleDeleteModal, setShowSingleDeleteModal] = useState(false);
  const [singleItemToDelete, setSingleItemToDelete] = useState<{ id: string; name: string; type: TrashType } | null>(null);
  const [deleteConfirmText, setDeleteConfirmText] = useState("");

  // State for bulk clearing
  const [showBulkClearModal, setShowBulkClearModal] = useState(false);
  const [adminPassword, setAdminPassword] = useState("");

  const currentUser = SheetsSyncEngine.getCurrentUser();
  const isAdmin = currentUser?.role === "Admin";

  // Get deleted items from SheetsSyncEngine
  const deletedProducts = SheetsSyncEngine.getProducts().filter((p) => p.isSoftDeleted);
  const deletedInvoices = SheetsSyncEngine.getInvoices().filter((i) => i.isSoftDeleted);
  const deletedAgents = SheetsSyncEngine.getAgents().filter((a) => a.isSoftDeleted);
  const deletedCustomers = SheetsSyncEngine.getCustomers().filter((c) => c.isSoftDeleted);
  const deletedUsers = SheetsSyncEngine.getUsers().filter((u) => u.status === "Deleted");
  const deletedPromos = SheetsSyncEngine.getPromoCodes().filter((p) => p.isSoftDeleted);

  const handleRestoreCustomer = async (customer: Customer) => {
    try {
      const allCustomers = SheetsSyncEngine.getCustomers();
      const updated = allCustomers.map((c) =>
        c.id === customer.id ? { ...c, isSoftDeleted: false } : c
      );
      await SheetsSyncEngine.saveCustomers(updated);
      onShowNotification(`✓ Customer '${customer.name}' successfully restored.`, "success");
      onRefresh();
    } catch (e) {
      onShowNotification("Error restoring customer", "error");
    }
  };

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

  const handleRestoreUser = async (user: User) => {
    try {
      const allUsers = SheetsSyncEngine.getUsers();
      const updated = allUsers.map((u) =>
        u.id === user.id ? { ...u, status: "Active" as const } : u
      );
      await SheetsSyncEngine.saveUsers(updated);
      onShowNotification(`✓ User account for '${user.fullName}' successfully restored.`, "success");
      onRefresh();
    } catch (e) {
      onShowNotification("Error restoring user account", "error");
    }
  };

  const handleRestorePromo = async (promo: PromoCode) => {
    try {
      const allPromos = SheetsSyncEngine.getPromoCodes();
      const updated = allPromos.map((p) =>
        p.promoCode === promo.promoCode ? { ...p, isSoftDeleted: false } : p
      );
      await SheetsSyncEngine.savePromoCodes(updated);
      onShowNotification(`✓ Promo Code '${promo.promoCode}' successfully restored.`, "success");
      onRefresh();
    } catch (e) {
      onShowNotification("Error restoring promo code", "error");
    }
  };

  // Single Item Delete Confirmation Trigger
  const triggerSingleDelete = (id: string, name: string, type: TrashType) => {
    if (!isAdmin) {
      onShowNotification("Access Denied: Only administrators can permanently delete records.", "error");
      return;
    }
    setSingleItemToDelete({ id, name, type });
    setDeleteConfirmText("");
    setShowSingleDeleteModal(true);
  };

  // Perform Single Item Delete
  const handleConfirmSingleDelete = async () => {
    if (deleteConfirmText.toLowerCase() !== "delete" || !singleItemToDelete) return;
    
    try {
      const { id, name, type } = singleItemToDelete;
      if (type === "products") {
        await SheetsSyncEngine.deleteProductPermanently(id);
        onShowNotification(`✓ Product '${name}' permanently deleted.`, "success");
      } else if (type === "agents") {
        await SheetsSyncEngine.deleteAgentPermanently(id);
        onShowNotification(`✓ Agent '${name}' permanently deleted.`, "success");
      } else if (type === "invoices") {
        await SheetsSyncEngine.deleteInvoicePermanently(id);
        onShowNotification(`✓ Invoice '${name}' permanently deleted.`, "success");
      } else if (type === "customers") {
        await SheetsSyncEngine.deleteCustomerPermanently(id);
        onShowNotification(`✓ Customer '${name}' permanently deleted.`, "success");
      } else if (type === "users") {
        await SheetsSyncEngine.deleteUserPermanently(id);
        onShowNotification(`✓ User '${name}' permanently deleted.`, "success");
      } else if (type === "promo_codes") {
        await SheetsSyncEngine.deletePromoCodePermanently(id);
        onShowNotification(`✓ Promo Code '${name}' permanently deleted.`, "success");
      }
      
      setShowSingleDeleteModal(false);
      setSingleItemToDelete(null);
      onRefresh();
    } catch (e) {
      onShowNotification("Error deleting item permanently", "error");
    }
  };

  // Bulk Delete Trigger
  const triggerBulkClear = () => {
    if (!isAdmin) {
      onShowNotification("Access Denied: Only administrators can clear the trash bin.", "error");
      return;
    }
    setAdminPassword("");
    setShowBulkClearModal(true);
  };

  // Perform Bulk Clear
  const handleConfirmBulkClear = async () => {
    const users = SheetsSyncEngine.getUsers();
    const adminUser = users.find(u => u.role === "Admin");
    if (!adminUser) {
      onShowNotification("Error: No admin user registered.", "error");
      return;
    }

    const hashedInput = MD5(adminPassword).toString();
    if (adminUser.passwordHash !== hashedInput) {
      onShowNotification("Access Denied: Invalid admin password.", "error");
      return;
    }

    try {
      await SheetsSyncEngine.clearAllTrashOfType(activeType);
      onShowNotification(`✓ Successfully cleared all soft-deleted ${activeType}!`, "success");
      setShowBulkClearModal(false);
      onRefresh();
    } catch (e) {
      onShowNotification("Error clearing trash bin", "error");
    }
  };

  // Check count of items in active tab
  const getActiveTabCount = () => {
    if (activeType === "products") return deletedProducts.length;
    if (activeType === "invoices") return deletedInvoices.length;
    if (activeType === "agents") return deletedAgents.length;
    if (activeType === "customers") return deletedCustomers.length;
    if (activeType === "users") return deletedUsers.length;
    return deletedPromos.length;
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
            <p className="text-xs text-muted mt-0.5 flex items-center gap-1">
              <span>Restore soft-deleted records. Permanent deletion is final and synced directly.</span>
              {!isAdmin && <span className="text-[10px] text-amber-600 font-bold bg-amber-500/10 border border-amber-500/20 px-1 rounded flex items-center gap-0.5"><Lock className="h-2.5 w-2.5" /> Admin Only Deletion</span>}
            </p>
          </div>
        </div>

        {/* Tab & Action Selector */}
        <div className="flex items-center gap-3">
          <div className="flex bg-surface rounded-lg p-0.5 border border-default">
            <button
              onClick={() => setActiveType("products")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer border-none ${
                activeType === "products"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted hover:text-primary bg-transparent"
              }`}
            >
              <Package className="h-3.5 w-3.5" />
              <span>Products ({deletedProducts.length})</span>
            </button>
            <button
              onClick={() => setActiveType("invoices")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer border-none ${
                activeType === "invoices"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted hover:text-primary bg-transparent"
              }`}
            >
              <FileText className="h-3.5 w-3.5" />
              <span>Invoices ({deletedInvoices.length})</span>
            </button>
            <button
              onClick={() => setActiveType("agents")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer border-none ${
                activeType === "agents"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted hover:text-primary bg-transparent"
              }`}
            >
              <Award className="h-3.5 w-3.5" />
              <span>Agents ({deletedAgents.length})</span>
            </button>
            <button
              onClick={() => setActiveType("customers")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer border-none ${
                activeType === "customers"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted hover:text-primary bg-transparent"
              }`}
            >
              <Users className="h-3.5 w-3.5" />
              <span>Customers ({deletedCustomers.length})</span>
            </button>
            <button
              onClick={() => setActiveType("users")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer border-none ${
                activeType === "users"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted hover:text-primary bg-transparent"
              }`}
            >
              <UserCheck className="h-3.5 w-3.5" />
              <span>Users ({deletedUsers.length})</span>
            </button>
            <button
              onClick={() => setActiveType("promo_codes")}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md transition-all cursor-pointer border-none ${
                activeType === "promo_codes"
                  ? "bg-rose-600 text-white shadow-sm"
                  : "text-muted hover:text-primary bg-transparent"
              }`}
            >
              <Tag className="h-3.5 w-3.5" />
              <span>Promo Codes ({deletedPromos.length})</span>
            </button>
          </div>

          {/* Bulk Clear Button (Only for Admins) */}
          {isAdmin && getActiveTabCount() > 0 && (
            <button
              onClick={triggerBulkClear}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-rose-600 hover:bg-rose-700 text-white cursor-pointer transition-colors shadow-sm border-none"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span>Clear All {activeType}</span>
            </button>
          )}
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
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRestoreProduct(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restore</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => triggerSingleDelete(p.id, p.name, "products")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
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
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRestoreInvoice(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restore</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => triggerSingleDelete(inv.invoiceId || inv.invoiceNo, inv.invoiceNo, "invoices")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
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
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRestoreAgent(agt)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restore</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => triggerSingleDelete(agt.id, agt.name, "agents")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeType === "customers" && (
          <div className="rounded-xl border border-default bg-card shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-default bg-card-secondary font-bold text-muted font-sans">
                  <th className="p-4">Customer ID</th>
                  <th className="p-4">Name</th>
                  <th className="p-4">Primary Phone</th>
                  <th className="p-4">Address</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default font-medium text-primary font-sans">
                {deletedCustomers.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted font-normal">
                      No deleted customers found in the database.
                    </td>
                  </tr>
                ) : (
                  deletedCustomers.map((c) => (
                    <tr key={c.id} className="hover:bg-card-secondary/20">
                      <td className="p-4 font-mono">{c.id}</td>
                      <td className="p-4 font-bold">{c.name}</td>
                      <td className="p-4 font-mono">{c.mobile}</td>
                      <td className="p-4 truncate max-w-[250px]" title={c.address}>{c.address || "No Address"}</td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRestoreCustomer(c)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restore</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => triggerSingleDelete(c.id, c.name, "customers")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeType === "users" && (
          <div className="rounded-xl border border-default bg-card shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-default bg-card-secondary font-bold text-muted font-sans">
                  <th className="p-4">User ID</th>
                  <th className="p-4">Full Name</th>
                  <th className="p-4">Username</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Email / Phone</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default font-medium text-primary font-sans">
                {deletedUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-muted font-normal">
                      No deleted users found in the database.
                    </td>
                  </tr>
                ) : (
                  deletedUsers.map((u) => (
                    <tr key={u.id} className="hover:bg-card-secondary/20">
                      <td className="p-4 font-mono">{u.id}</td>
                      <td className="p-4 font-bold">{u.fullName}</td>
                      <td className="p-4 font-mono text-indigo-600 dark:text-indigo-400">{u.username}</td>
                      <td className="p-4">
                        <span className="inline-block rounded bg-card-secondary dark:bg-zinc-800 px-2 py-0.5 text-[9px] font-semibold text-muted uppercase">
                          {u.role}
                        </span>
                      </td>
                      <td className="p-4">
                        <div>{u.email}</div>
                        <div className="text-[10px] text-muted font-mono mt-0.5">{u.mobile}</div>
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRestoreUser(u)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restore</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => triggerSingleDelete(u.id, u.fullName, "users")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeType === "promo_codes" && (
          <div className="rounded-xl border border-default bg-card shadow-sm overflow-hidden">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-default bg-card-secondary font-bold text-muted font-sans">
                  <th className="p-4">Promo Code</th>
                  <th className="p-4">Description</th>
                  <th className="p-4">Discount</th>
                  <th className="p-4">Validity Range</th>
                  <th className="p-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-default font-medium text-primary font-sans">
                {deletedPromos.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-muted font-normal">
                      No deleted promo codes found in the database.
                    </td>
                  </tr>
                ) : (
                  deletedPromos.map((p) => (
                    <tr key={p.promoCode} className="hover:bg-card-secondary/20">
                      <td className="p-4 font-mono font-bold text-rose-600 dark:text-rose-450 bg-rose-500/5 px-2 py-1 rounded inline-block m-2">{p.promoCode}</td>
                      <td className="p-4">{p.description}</td>
                      <td className="p-4 font-bold font-mono">
                        {p.discountType === "Percentage" ? `${p.percentageDiscount}%` : `₹${p.fixedDiscount}`}
                      </td>
                      <td className="p-4 font-mono text-[10px]">
                        {p.startDate} to {p.endDate}
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex justify-end gap-2">
                          <button
                            onClick={() => handleRestorePromo(p)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                          >
                            <RotateCcw className="h-3 w-3" />
                            <span>Restore</span>
                          </button>
                          {isAdmin && (
                            <button
                              onClick={() => triggerSingleDelete(p.promoCode, p.promoCode, "promo_codes")}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-md transition-colors cursor-pointer border-none shadow-sm"
                            >
                              <Trash2 className="h-3 w-3" />
                              <span>Delete</span>
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* SINGLE ITEM DELETE CONFIRMATION MODAL */}
      {showSingleDeleteModal && singleItemToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-default bg-card p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-default pb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <ShieldAlert className="h-4.5 w-4.5 text-rose-600 animate-pulse" />
                <h3 className="font-bold text-primary text-sm truncate">Confirm Permanent Delete</h3>
              </div>
              <button
                onClick={() => setShowSingleDeleteModal(false)}
                className="text-muted hover:text-primary cursor-pointer p-0.5 border-none bg-transparent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-secondary leading-relaxed font-sans text-left">
                You are about to permanently delete the {singleItemToDelete.type.slice(0, -1)} <strong>{singleItemToDelete.name}</strong> ({singleItemToDelete.id}).
                This action is irreversible and will delete it from Supabase.
              </p>
              
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-muted">
                  Type <span className="font-mono text-rose-500">delete</span> to confirm
                </label>
                <input
                  type="text"
                  required
                  value={deleteConfirmText}
                  onChange={(e) => setDeleteConfirmText(e.target.value)}
                  placeholder="Type 'delete'"
                  className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-default">
              <button
                onClick={() => setShowSingleDeleteModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-transparent border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmSingleDelete}
                disabled={deleteConfirmText.toLowerCase() !== "delete"}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors border-none cursor-pointer shadow"
              >
                Permanently Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* BULK CLEAR TRASH CONFIRMATION MODAL */}
      {showBulkClearModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-card/60 p-4 animate-in fade-in duration-200">
          <div className="w-full max-w-sm rounded-xl border border-default bg-card p-5 shadow-lg space-y-4 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-default pb-2.5">
              <div className="flex items-center gap-1.5 min-w-0">
                <Lock className="h-4.5 w-4.5 text-rose-600" />
                <h3 className="font-bold text-primary text-sm truncate">Authorize Clear Trash</h3>
              </div>
              <button
                onClick={() => setShowBulkClearModal(false)}
                className="text-muted hover:text-primary cursor-pointer p-0.5 border-none bg-transparent"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <p className="text-xs text-secondary leading-relaxed font-sans text-left">
                This will permanently delete **all** soft-deleted {activeType} from the database.
                To authorize this request, please enter your Administrator password.
              </p>
              
              <div className="space-y-1 text-left">
                <label className="text-[10px] uppercase font-bold text-muted flex items-center gap-1">
                  <Key className="h-3 w-3" /> Admin Password
                </label>
                <input
                  type="password"
                  required
                  value={adminPassword}
                  onChange={(e) => setAdminPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full rounded-lg border border-default bg-surface px-3 py-1.5 text-xs text-primary focus:border-rose-500 outline-none"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-default">
              <button
                onClick={() => setShowBulkClearModal(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-secondary hover:text-primary bg-transparent border-none cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmBulkClear}
                disabled={!adminPassword}
                className="px-4 py-1.5 text-xs font-bold bg-rose-600 hover:bg-rose-700 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-lg transition-colors border-none cursor-pointer shadow"
              >
                Clear All Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
