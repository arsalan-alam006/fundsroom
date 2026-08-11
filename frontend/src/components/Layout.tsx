import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/login");
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="sidebar-brand">
          <div className="brand-icon">E</div>
          <div>
            <h1>ERP + CRM</h1>
            <span>Operations Portal</span>
          </div>
        </div>

        <div className="sidebar-section-title">MAIN MENU</div>

        <nav className="sidebar-nav">
          <NavLink to="/" end className="sidebar-link">
            <span className="nav-icon">▦</span>
            <span>Dashboard</span>
          </NavLink>

          <NavLink to="/customers" className="sidebar-link">
            <span className="nav-icon">♙</span>
            <span>Customers</span>
          </NavLink>

          <NavLink to="/products" className="sidebar-link">
            <span className="nav-icon">▤</span>
            <span>Products</span>
          </NavLink>

          <NavLink to="/challans" className="sidebar-link">
            <span className="nav-icon">▣</span>
            <span>Sales Challans</span>
          </NavLink>
        </nav>

        <div className="sidebar-bottom">
          <div className="user-profile">
            <div className="user-avatar">
              {user?.name?.charAt(0).toUpperCase() || "U"}
            </div>

            <div className="user-details">
              <strong>{user?.name}</strong>
              <span>{user?.email}</span>
              <small>{user?.role}</small>
            </div>
          </div>

          <button className="logout-btn" onClick={handleLogout}>
            <span>↪</span>
            Log out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <div className="mobile-topbar">
          <div className="mobile-brand">
            <div className="brand-icon">E</div>
            <strong>ERP + CRM</strong>
          </div>

          <button className="mobile-logout" onClick={handleLogout}>
            ↪
          </button>
        </div>

        <div className="content-container">
          <Outlet />
        </div>
      </main>
    </div>
  );
}