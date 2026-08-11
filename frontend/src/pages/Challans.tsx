import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Challan {
  id: string; challanNumber: string; status: string; totalQuantity: number;
  createdAt: string; customer: { name: string };
}

export default function Challans() {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<Challan[]>([]);
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);

  async function load() {
    try {
      const res = await api.get("/challans", { params: { status: status || undefined, pageSize: 50 } });
      setItems(res.data.items);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, [status]);

  async function handleConfirm(id: string) {
    setError(null);
    try {
      await api.patch(`/challans/${id}/confirm`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this challan? If confirmed, stock will be restored.")) return;
    setError(null);
    try {
      await api.patch(`/challans/${id}/cancel`);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <div>
      <div className="page-header">
        <h2>Sales Challans</h2>
        {hasRole("ADMIN", "SALES") && <Link className="btn" to="/challans/new">+ New Challan</Link>}
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="search-bar">
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="DRAFT">Draft</option>
          <option value="CONFIRMED">Confirmed</option>
          <option value="CANCELLED">Cancelled</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead><tr><th>Challan #</th><th>Customer</th><th>Total Qty</th><th>Status</th><th>Date</th><th></th></tr></thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/challans/${c.id}`}>{c.challanNumber}</Link></td>
                <td>{c.customer.name}</td>
                <td>{c.totalQuantity}</td>
                <td><span className={`badge ${c.status.toLowerCase()}`}>{c.status}</span></td>
                <td>{new Date(c.createdAt).toLocaleDateString()}</td>
                <td style={{ display: "flex", gap: 8 }}>
                  {hasRole("ADMIN", "SALES") && c.status === "DRAFT" && (
                    <button className="btn secondary" onClick={() => handleConfirm(c.id)}>Confirm</button>
                  )}
                  {hasRole("ADMIN", "SALES") && c.status !== "CANCELLED" && (
                    <button className="btn danger" onClick={() => handleCancel(c.id)}>Cancel</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state">No challans found.</div>}
      </div>
    </div>
  );
}
