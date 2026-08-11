import { useEffect, useState, FormEvent } from "react";
import { useParams, Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface FollowUp { id: string; note: string; createdAt: string; }
interface Customer {
  id: string; name: string; mobile: string; email?: string; businessName?: string;
  gstNumber?: string; customerType: string; address?: string; status: string;
  followUpDate?: string; notes?: string; followUps: FollowUp[];
}

export default function CustomerDetail() {
  const { id } = useParams();
  const { hasRole } = useAuth();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState<Partial<Customer>>({});
  const [newNote, setNewNote] = useState("");
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get(`/customers/${id}`);
      setCustomer(res.data);
      setForm(res.data);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, [id]);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await api.put(`/customers/${id}`, form);
      setEditing(false);
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setSaving(false);
    }
  }

  async function handleAddNote(e: FormEvent) {
    e.preventDefault();
    if (!newNote.trim()) return;
    try {
      await api.post(`/customers/${id}/follow-ups`, { note: newNote });
      setNewNote("");
      load();
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  if (!customer) return <div>{error ? <div className="error-banner">{error}</div> : "Loading..."}</div>;

  return (
    <div>
      <div className="page-header">
        <h2><Link to="/customers">Customers</Link> / {customer.name}</h2>
        {hasRole("ADMIN", "SALES") && (
          <button className="btn secondary" onClick={() => setEditing((v) => !v)}>
            {editing ? "Cancel" : "Edit"}
          </button>
        )}
      </div>
      {error && <div className="error-banner">{error}</div>}

      <div className="card">
        {editing ? (
          <form onSubmit={handleSave}>
            <div className="form-grid">
              <div className="form-field"><label>Name</label><input value={form.name || ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="form-field"><label>Mobile</label><input value={form.mobile || ""} onChange={(e) => setForm({ ...form, mobile: e.target.value })} /></div>
              <div className="form-field"><label>Email</label><input value={form.email || ""} onChange={(e) => setForm({ ...form, email: e.target.value })} /></div>
              <div className="form-field"><label>Business Name</label><input value={form.businessName || ""} onChange={(e) => setForm({ ...form, businessName: e.target.value })} /></div>
              <div className="form-field"><label>GST Number</label><input value={form.gstNumber || ""} onChange={(e) => setForm({ ...form, gstNumber: e.target.value })} /></div>
              <div className="form-field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="LEAD">Lead</option><option value="ACTIVE">Active</option><option value="INACTIVE">Inactive</option>
                </select>
              </div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}><label>Address</label><input value={form.address || ""} onChange={(e) => setForm({ ...form, address: e.target.value })} /></div>
              <div className="form-field" style={{ gridColumn: "1 / -1" }}><label>Notes</label><textarea value={form.notes || ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
            </div>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
          </form>
        ) : (
          <div className="form-grid">
            <div><strong>Mobile:</strong> {customer.mobile}</div>
            <div><strong>Email:</strong> {customer.email || "-"}</div>
            <div><strong>Business:</strong> {customer.businessName || "-"}</div>
            <div><strong>GST No:</strong> {customer.gstNumber || "-"}</div>
            <div><strong>Type:</strong> {customer.customerType}</div>
            <div><strong>Status:</strong> <span className={`badge ${customer.status.toLowerCase()}`}>{customer.status}</span></div>
            <div style={{ gridColumn: "1 / -1" }}><strong>Address:</strong> {customer.address || "-"}</div>
            <div style={{ gridColumn: "1 / -1" }}><strong>Notes:</strong> {customer.notes || "-"}</div>
          </div>
        )}
      </div>

      <div className="card">
        <h3>Follow-up Notes</h3>
        {hasRole("ADMIN", "SALES") && (
          <form onSubmit={handleAddNote} style={{ display: "flex", gap: 8, marginBottom: 14 }}>
            <input style={{ flex: 1, padding: 9, border: "1px solid var(--border)", borderRadius: 6 }}
              placeholder="Add a follow-up note..." value={newNote} onChange={(e) => setNewNote(e.target.value)} />
            <button className="btn" type="submit">Add</button>
          </form>
        )}
        {customer.followUps.length === 0 && <div className="empty-state">No follow-up notes yet.</div>}
        {customer.followUps.map((f) => (
          <div key={f.id} style={{ borderBottom: "1px solid var(--border)", padding: "10px 0" }}>
            <div>{f.note}</div>
            <div style={{ fontSize: 12, color: "var(--muted)" }}>{new Date(f.createdAt).toLocaleString()}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
