import { useEffect, useState, FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Movement { id: string; quantity: number; movementType: "IN" | "OUT"; reason?: string; createdAt: string; }
interface Product {
  id: string; name: string; sku: string; category?: string; unitPrice: number;
  currentStock: number; minStockAlert: number; warehouseLocation?: string; stockMovements: Movement[];
}

export default function ProductDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [product, setProduct] = useState<Product | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [movementForm, setMovementForm] = useState({ quantity: "", movementType: "IN", reason: "" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get(`/products/${id}`);
      setProduct(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleMovement(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post(`/products/${id}/stock-movements`, {
        quantity: parseInt(movementForm.quantity),
        movementType: movementForm.movementType,
        reason: movementForm.reason || undefined,
      });
      setMovementForm({ quantity: "", movementType: "IN", reason: "" });
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  if (!product) return <div>{error ? <div className="error-banner">{error}</div> : "Loading..."}</div>;

  return (
    <div>
      <div className="page-header">
        <h2><Link to="/products">Products</Link> / {product.name}</h2>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="form-grid">
          <div><strong>SKU:</strong> {product.sku}</div>
          <div><strong>Category:</strong> {product.category || "-"}</div>
          <div><strong>Unit Price:</strong> ₹{product.unitPrice}</div>
          <div><strong>Location:</strong> {product.warehouseLocation || "-"}</div>
          <div><strong>Current Stock:</strong> {product.currentStock}</div>
          <div><strong>Min Stock Alert:</strong> {product.minStockAlert}</div>
        </div>
      </div>

      {hasRole("ADMIN", "WAREHOUSE") && (
        <div className="card">
          <h3>Record Stock Movement</h3>
          <form onSubmit={handleMovement} style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
            <div className="form-field">
              <label>Type</label>
              <select value={movementForm.movementType} onChange={(e) => setMovementForm({ ...movementForm, movementType: e.target.value })}>
                <option value="IN">IN (add stock)</option>
                <option value="OUT">OUT (remove stock)</option>
              </select>
            </div>
            <div className="form-field">
              <label>Quantity</label>
              <input type="number" min="1" required value={movementForm.quantity} onChange={(e) => setMovementForm({ ...movementForm, quantity: e.target.value })} style={{ width: 100 }} />
            </div>
            <div className="form-field" style={{ flex: 1, minWidth: 200 }}>
              <label>Reason</label>
              <input value={movementForm.reason} onChange={(e) => setMovementForm({ ...movementForm, reason: e.target.value })} placeholder="e.g. Purchase order #123" />
            </div>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Record"}</button>
          </form>
        </div>
      )}

      <div className="card" style={{ padding: 0 }}>
        <div style={{ padding: "16px 20px 0" }}><h3 style={{ margin: 0 }}>Stock Movement Log</h3></div>
        <table>
          <thead><tr><th>Date</th><th>Type</th><th>Qty</th><th>Reason</th></tr></thead>
          <tbody>
            {product.stockMovements.map((m) => (
              <tr key={m.id}>
                <td>{new Date(m.createdAt).toLocaleString()}</td>
                <td><span className={`badge ${m.movementType === "IN" ? "active" : "cancelled"}`}>{m.movementType}</span></td>
                <td>{m.quantity}</td>
                <td>{m.reason || "-"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {product.stockMovements.length === 0 && <div className="empty-state">No stock movements recorded yet.</div>}
      </div>
    </div>
  );
}
