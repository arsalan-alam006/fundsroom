import { useEffect, useState, FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";

interface Customer { id: string; name: string; businessName?: string; }
interface Product { id: string; name: string; sku: string; currentStock: number; unitPrice: number; }
interface LineItem { productId: string; quantity: number; }

export default function ChallanCreate() {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [lines, setLines] = useState<LineItem[]>([{ productId: "", quantity: 1 }]);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    api.get("/customers", { params: { pageSize: 200 } }).then((r) => setCustomers(r.data.items));
    api.get("/products", { params: { pageSize: 200 } }).then((r) => setProducts(r.data.items));
  }, []);

  function updateLine(index: number, patch: Partial<LineItem>) {
    setLines((prev) => prev.map((l, i) => (i === index ? { ...l, ...patch } : l)));
  }

  function addLine() {
    setLines((prev) => [...prev, { productId: "", quantity: 1 }]);
  }

  function removeLine(index: number) {
    setLines((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: FormEvent, status: "DRAFT" | "CONFIRMED") {
    e.preventDefault();
    setError(null);

    const validLines = lines.filter((l) => l.productId && l.quantity > 0);
    if (!customerId) return setError("Please select a customer");
    if (validLines.length === 0) return setError("Please add at least one product with a quantity");

    setSaving(true);
    try {
      const res = await api.post("/challans", { customerId, items: validLines, status });
      navigate(`/challans/${res.data.id}`);
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div className="page-header"><h2>New Sales Challan</h2></div>
      {error && <div className="error-banner">{error}</div>}

      <form>
        <div className="card">
          <div className="form-field">
            <label>Customer *</label>
            <select value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
              <option value="">Select customer...</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}{c.businessName ? ` (${c.businessName})` : ""}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="card">
          <h3>Products</h3>
          {lines.map((line, i) => {
            const selected = products.find((p) => p.id === line.productId);
            return (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-end", marginBottom: 10 }}>
                <div className="form-field" style={{ flex: 2 }}>
                  <label>Product</label>
                  <select value={line.productId} onChange={(e) => updateLine(i, { productId: e.target.value })}>
                    <option value="">Select product...</option>
                    {products.map((p) => (
                      <option key={p.id} value={p.id}>{p.name} ({p.sku}) — stock: {p.currentStock}</option>
                    ))}
                  </select>
                </div>
                <div className="form-field" style={{ width: 100 }}>
                  <label>Qty</label>
                  <input type="number" min="1" value={line.quantity} onChange={(e) => updateLine(i, { quantity: parseInt(e.target.value) || 0 })} />
                </div>
                {selected && (
                  <div style={{ fontSize: 13, color: "var(--muted)", paddingBottom: 10 }}>
                    ₹{selected.unitPrice}/unit
                  </div>
                )}
                <button type="button" className="btn secondary" onClick={() => removeLine(i)} disabled={lines.length === 1}>Remove</button>
              </div>
            );
          })}
          <button type="button" className="btn secondary" onClick={addLine}>+ Add another product</button>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button className="btn secondary" disabled={saving} onClick={(e) => handleSubmit(e, "DRAFT")}>Save as Draft</button>
          <button className="btn" disabled={saving} onClick={(e) => handleSubmit(e, "CONFIRMED")}>
            {saving ? "Saving..." : "Save & Confirm (reduces stock)"}
          </button>
        </div>
      </form>
    </div>
  );
}
