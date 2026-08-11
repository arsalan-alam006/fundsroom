import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({ customers: 0, products: 0, lowStock: 0, draftChallans: 0 });

  useEffect(() => {
    async function load() {
      const [customers, products, lowStock, draft] = await Promise.all([
        api.get("/customers?pageSize=1"),
        api.get("/products?pageSize=1"),
        api.get("/products?lowStock=true&pageSize=100"),
        api.get("/challans?status=DRAFT&pageSize=1"),
      ]);
      setStats({
        customers: customers.data.total,
        products: products.data.total,
        lowStock: lowStock.data.items.length,
        draftChallans: draft.data.total,
      });
    }
    load();
  }, []);

  return (
    <div>
      <div className="page-header">
        <h2>Welcome, {user?.name}</h2>
      </div>
      <div className="stat-grid">
        <div className="card stat-card">
          <div className="value">{stats.customers}</div>
          <div className="label">Total Customers</div>
        </div>
        <div className="card stat-card">
          <div className="value">{stats.products}</div>
          <div className="label">Total Products</div>
        </div>
        <div className="card stat-card">
          <div className="value" style={{ color: stats.lowStock > 0 ? "var(--danger)" : undefined }}>
            {stats.lowStock}
          </div>
          <div className="label">Low Stock Products</div>
        </div>
        <div className="card stat-card">
          <div className="value">{stats.draftChallans}</div>
          <div className="label">Draft Challans</div>
        </div>
      </div>
      <div className="card">
        <h3>Quick links</h3>
        <p><Link to="/customers">Manage customers</Link></p>
        <p><Link to="/products">Manage products & stock</Link></p>
        <p><Link to="/challans/new">Create a new sales challan</Link></p>
      </div>
    </div>
  );
}
