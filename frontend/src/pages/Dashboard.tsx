import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { user } = useAuth();

  const [stats, setStats] = useState({
    customers: 0,
    products: 0,
    lowStock: 0,
    draftChallans: 0,
  });

  useEffect(() => {
    async function load() {
      try {
        const [
          customers,
          products,
          lowStock,
          draft,
        ] = await Promise.all([
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
      } catch (error) {
        console.error(error);
      }
    }

    load();
  }, []);

  const today = new Date().toLocaleDateString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <div className="dashboard-page">
      <div className="dashboard-header">
        <div>
          <span className="dashboard-eyebrow">
            OVERVIEW
          </span>

          <h1>
            Welcome back, {user?.name?.split(" ")[0] || "User"}!
          </h1>

          <p>
            Here's what's happening with your business today.
          </p>
        </div>

        <div className="today-card">
          <div className="today-icon">□</div>

          <div>
            <small>TODAY</small>
            <strong>{today}</strong>
          </div>
        </div>
      </div>

      <div className="stats-grid">
        <div className="dashboard-stat-card">
          <div className="stat-top">
            <div className="stat-icon purple">♙</div>
            <span className="stat-tag">CRM</span>
          </div>

          <div className="stat-number">
            {stats.customers}
          </div>

          <h3>Total Customers</h3>
          <p>Active CRM records</p>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-top">
            <div className="stat-icon blue">▦</div>
            <span className="stat-tag">INVENTORY</span>
          </div>

          <div className="stat-number">
            {stats.products}
          </div>

          <h3>Total Products</h3>
          <p>Products in your catalog</p>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-top">
            <div className="stat-icon orange">!</div>

            <span
              className={
                stats.lowStock > 0
                  ? "stat-tag warning"
                  : "stat-tag success"
              }
            >
              {stats.lowStock > 0 ? "ATTENTION" : "HEALTHY"}
            </span>
          </div>

          <div className="stat-number">
            {stats.lowStock}
          </div>

          <h3>Low Stock Items</h3>
          <p>
            {stats.lowStock > 0
              ? "Items need attention"
              : "Inventory levels look good"}
          </p>
        </div>

        <div className="dashboard-stat-card">
          <div className="stat-top">
            <div className="stat-icon green">▤</div>
            <span className="stat-tag">SALES</span>
          </div>

          <div className="stat-number">
            {stats.draftChallans}
          </div>

          <h3>Draft Challans</h3>
          <p>Pending sales documents</p>
        </div>
      </div>

      <div className="dashboard-columns">
        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Quick Actions</h2>
              <p>Common tasks and shortcuts</p>
            </div>
          </div>

          <div className="quick-actions">
            <Link to="/customers" className="quick-action">
              <div className="quick-icon blue">♙</div>

              <div>
                <strong>Customers</strong>
                <span>Manage CRM records</span>
              </div>

              <b>→</b>
            </Link>

            <Link to="/products" className="quick-action">
              <div className="quick-icon purple">▦</div>

              <div>
                <strong>Products</strong>
                <span>Manage products & stock</span>
              </div>

              <b>→</b>
            </Link>

            <Link to="/challans/new" className="quick-action">
              <div className="quick-icon orange">+</div>

              <div>
                <strong>New Challan</strong>
                <span>Create a sales challan</span>
              </div>

              <b>→</b>
            </Link>

            <Link to="/challans" className="quick-action">
              <div className="quick-icon green">▤</div>

              <div>
                <strong>Sales Challans</strong>
                <span>View sales documents</span>
              </div>

              <b>→</b>
            </Link>
          </div>
        </div>

        <div className="dashboard-panel">
          <div className="panel-header">
            <div>
              <h2>Operations Summary</h2>
              <p>Current business status</p>
            </div>
          </div>

          <div className="summary-list">
            <div className="summary-row">
              <div className="summary-icon blue">♙</div>

              <div className="summary-info">
                <strong>Customers</strong>
                <span>CRM records</span>
              </div>

              <b>{stats.customers}</b>
            </div>

            <div className="summary-row">
              <div className="summary-icon purple">▦</div>

              <div className="summary-info">
                <strong>Products</strong>
                <span>Catalog items</span>
              </div>

              <b>{stats.products}</b>
            </div>

            <div className="summary-row">
              <div className="summary-icon orange">!</div>

              <div className="summary-info">
                <strong>Low Stock</strong>
                <span>Needs attention</span>
              </div>

              <b>{stats.lowStock}</b>
            </div>

            <div className="summary-row">
              <div className="summary-icon green">▤</div>

              <div className="summary-info">
                <strong>Draft Challans</strong>
                <span>Pending documents</span>
              </div>

              <b>{stats.draftChallans}</b>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}