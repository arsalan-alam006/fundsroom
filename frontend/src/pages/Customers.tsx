import { useEffect, useState, FormEvent } from "react";
import { Link } from "react-router-dom";
import { api, apiErrorMessage } from "../api/client";
import { useAuth } from "../context/AuthContext";

interface Customer {
  id: string; name: string; mobile: string; businessName?: string;
  customerType: string; status: string; followUpDate?: string;
}

export default function Customers() {
  const { hasRole } = useAuth();
  const [items, setItems] = useState<Customer[]>([]);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: "", mobile: "", email: "", businessName: "", customerType: "RETAIL", status: "LEAD" });
  const [saving, setSaving] = useState(false);

  async function load() {
    try {
      const res = await api.get("/customers", { params: { search: search || undefined, status: status || undefined, pageSize: 50 } });
      setItems(res.data.items);
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  useEffect(() => { load(); }, [status]);

  function handleSearchSubmit(e: FormEvent) {
    e.preventDefault();
    load();
  }

  async function handleAddCustomer(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    try {
      await api.post("/customers", form);
      setShowForm(false);
      setForm({ name: "", mobile: "", email: "", businessName: "", customerType: "RETAIL", status: "LEAD" });
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
        <h2>Customers</h2>
        {hasRole("ADMIN", "SALES") && (
          <button className="btn" onClick={() => setShowForm((v) => !v)}>
            {showForm ? "Cancel" : "+ Add Customer"}
          </button>
        )}
      </div>

      {error && <div className="error-banner">{error}</div>}

      {showForm && (
        <div className="card">
          <h3>New Customer</h3>
          <form onSubmit={handleAddCustomer}>
            <div className="form-grid">
              <div className="form-field">
                <label>Name *</label>
                <input required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Mobile *</label>
                <input required value={form.mobile} onChange={(e) => setForm({ ...form, mobile: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Email</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Business Name</label>
                <input value={form.businessName} onChange={(e) => setForm({ ...form, businessName: e.target.value })} />
              </div>
              <div className="form-field">
                <label>Customer Type</label>
                <select value={form.customerType} onChange={(e) => setForm({ ...form, customerType: e.target.value })}>
                  <option value="RETAIL">Retail</option>
                  <option value="WHOLESALE">Wholesale</option>
                  <option value="DISTRIBUTOR">Distributor</option>
                </select>
              </div>
              <div className="form-field">
                <label>Status</label>
                <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  <option value="LEAD">Lead</option>
                  <option value="ACTIVE">Active</option>
                  <option value="INACTIVE">Inactive</option>
                </select>
              </div>
            </div>
            <button className="btn" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Customer"}</button>
          </form>
        </div>
      )}

      <form onSubmit={handleSearchSubmit} className="search-bar">
        <input placeholder="Search by name, mobile, business..." value={search} onChange={(e) => setSearch(e.target.value)} />
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">All statuses</option>
          <option value="LEAD">Lead</option>
          <option value="ACTIVE">Active</option>
          <option value="INACTIVE">Inactive</option>
        </select>
        <button className="btn secondary" type="submit">Search</button>
      </form>

      <div className="card" style={{ padding: 0 }}>
        <table>
          <thead>
            <tr><th>Name</th><th>Mobile</th><th>Business</th><th>Type</th><th>Status</th><th></th></tr>
          </thead>
          <tbody>
            {items.map((c) => (
              <tr key={c.id}>
                <td><Link to={`/customers/${c.id}`}>{c.name}</Link></td>
                <td>{c.mobile}</td>
                <td>{c.businessName || "-"}</td>
                <td>{c.customerType}</td>
                <td><span className={`badge ${c.status.toLowerCase()}`}>{c.status}</span></td>
                <td><Link to={`/customers/${c.id}`}>View →</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && <div className="empty-state">No customers found.</div>}
      </div>
    </div>
  );
}
