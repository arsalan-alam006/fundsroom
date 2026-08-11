import { useEffect, useState } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Item { id: string; productNameSnapshot: string; skuSnapshot: string; unitPriceSnapshot: number; quantity: number; }
interface Challan {
  id: string; challanNumber: string; status: string; totalQuantity: number; createdAt: string;
  customer: { name: string; mobile: string }; items: Item[];
}

export default function ChallanDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const navigate = useNavigate();
  const [challan, setChallan] = useState<Challan | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get(`/challans/${id}`);
      setChallan(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleConfirm() {
    setError(null);
    try {
      await api.patch(`/challans/${id}/confirm`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleCancel() {
    if (!confirm("Cancel this challan?")) return;
    setError(null);
    try {
      await api.patch(`/challans/${id}/cancel`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!challan) return <div>{error ? <div className="error-banner">{error}</div> : "Loading..."}</div>;

  const totalValue = challan.items.reduce((sum, i) => sum + i.unitPriceSnapshot * i.quantity, 0);

  return (
    <div>
      <div className="page-header">
        <h2><Link to="/challans">Sales Challans</Link> / {challan.challanNumber}</h2>
        <span className={`badge ${challan.status.toLowerCase()}`}>{challan.status}</span>
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        <div className="form-grid">
          <div><strong>Customer:</strong> {challan.customer.name}</div>
          <div><strong>Mobile:</strong> {challan.customer.mobile}</div>
          <div><strong>Total Quantity:</strong> {challan.totalQuantity}</div>
          <div><strong>Date:</strong> {new Date(challan.createdAt).toLocaleString()}</div>
        </div>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Product</th><th>SKU</th><th>Unit Price</th><th>Qty</th><th>Line Total</th></tr></thead>
          <tbody>
            {challan.items.map((item) => (
              <tr key={item.id}>
                <td>{item.productNameSnapshot}</td>
                <td>{item.skuSnapshot}</td>
                <td>₹{item.unitPriceSnapshot}</td>
                <td>{item.quantity}</td>
                <td>₹{(item.unitPriceSnapshot * item.quantity).toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <div style={{ padding: "12px 16px", textAlign: "right", fontWeight: 700 }}>
          Total: ₹{totalValue.toFixed(2)}
        </div>
      </div>

      {hasRole("ADMIN", "SALES") && challan.status !== "CANCELLED" && (
        <div style={{ display: "flex", gap: 10 }}>
          {challan.status === "DRAFT" && <button className="btn" onClick={handleConfirm}>Confirm (reduces stock)</button>}
          <button className="btn danger" onClick={handleCancel}>Cancel Challan</button>
        </div>
      )}
    </div>
  );
}
