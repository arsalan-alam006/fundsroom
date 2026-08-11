import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Product {
  id: string; name: string; sku: string; category?: string;
  unitPrice: number; currentStock: number; minStockAlert: number; warehouseLocation?: string;
}

export default function Products() {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<Product[]>([]);
  const [search, setSearch] = useState("");
  const [lowStockOnly, setLowStockOnly] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ name: "", sku: "", category: "", unitPrice: "", minStockAlert: "0", warehouseLocation: "" });

  async function load() {
    try {
      const res = await api.get("/products", { params: { search: search || undefined, lowStock: lowStockOnly || undefined, pageSize: 100 } });
      setItems(res.data.items);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, [lowStockOnly]);

  async function handleAdd(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/products", {
        ...form,
        unitPrice: parseFloat(form.unitPrice),
        minStockAlert: parseInt(form.minStockAlert) || 0,
      });
      setShowForm(false);
      setForm({ name: "", sku: "", category: "", unitPrice: "", minStockAlert: "0", warehouseLocation: "" });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Products & Inventory</h2>
        {hasRole("ADMIN", "WAREHOUSE") && (
          <button className="btn" onClick={() => setShowForm((v) => !v)}>{showForm ? "Cancel" : "+ Add Product"}</button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="card">
          <h3>New Product</h3>
          <form onSubmit={handleAdd}>
            <div className="form-grid">
              <div className="form-field"><label>Name *</label><input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-field"><label>SKU/Code *</label><input required value={form.sku} onChange={(e) => setForm({ ...form, sku: e.target.value })} /></div>
              <div className="form-field"><label>Category</label><input value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
              <div className="form-field"><label>Unit Price *</label><input required type="number" step="0.01" value={form.unitPrice} onChange={(e) => setForm({ ...form, unitPrice: e.target.value })} /></div>
              <div className="form-field"><label>Min Stock Alert</label><input type="number" value={form.minStockAlert} onChange={(e) => setForm({ ...form, minStockAlert: e.target.value })} /></div>
              <div className="form-field"><label>Warehouse Location</label><input value={form.warehouseLocation} onChange={(e) => setForm({ ...form, warehouseLocation: e.target.value })} /></div>
            </div>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Product"}</button>
          </form>
        </div>
      )}

      <div className="search-bar">
        <input placeholder="Search by name or SKU..." value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === "Enter" && load()} />
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14 }}>
          <input type="checkbox" checked={lowStockOnly} onChange={(e) => setLowStockOnly(e.target.checked)} />
          Low stock only
        </label>
        <button className="btn secondary" onClick={load}>Search</button>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Category</th><th>Price</th><th>Stock</th><th>Location</th><th></th></tr></thead>
          <tbody>
            {items.map((p) => (
              <tr key={p.id}>
                <td><Link to={`/products/${p.id}`}>{p.name}</Link></td>
                <td>{p.sku}</td>
                <td>{p.category || "-"}</td>
                <td>₹{p.unitPrice}</td>
                <td style={{ color: p.currentStock <= p.minStockAlert ? "var(--danger)" : undefined, fontWeight: p.currentStock <= p.minStockAlert ? 700 : 400 }}>
                  {p.currentStock} {p.currentStock <= p.minStockAlert && "⚠"}
                </td>
                <td>{p.warehouseLocation || "-"}</td>
                <td><Link to={`/products/${p.id}`}>View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state">No products found.</div>}
      </div>
    </div>
  );
}
