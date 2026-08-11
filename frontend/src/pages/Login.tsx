import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { apiErrorMessage } from "../api/client";

export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [email, setEmail] = useState("admin@erpcrm.test");
  const [password, setPassword] = useState("Password123!");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();

    setError(null);
    setLoading(true);

    try {
      await login(email, password);
      navigate("/");
    } catch (err) {
      setError(apiErrorMessage(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-left">
        <div className="login-brand">
          <div className="login-brand-icon">E</div>

          <div>
            <h2>ERP + CRM</h2>
            <span>Operations Portal</span>
          </div>
        </div>

        <div className="login-hero">
          <span className="hero-badge">BUSINESS MANAGEMENT</span>

          <h1>
            Manage your business
            <br />
            <span>smarter & faster.</span>
          </h1>

          <p>
            Manage customers, products, inventory and sales
            operations from one powerful dashboard.
          </p>

          <div className="login-features">
            <div>
              <span className="feature-icon">✓</span>
              <div>
                <strong>Customer Management</strong>
                <small>Track your complete CRM</small>
              </div>
            </div>

            <div>
              <span className="feature-icon">✓</span>
              <div>
                <strong>Inventory Management</strong>
                <small>Monitor stock in real time</small>
              </div>
            </div>

            <div>
              <span className="feature-icon">✓</span>
              <div>
                <strong>Sales Operations</strong>
                <small>Create and manage challans</small>
              </div>
            </div>
          </div>
        </div>

        <div className="login-footer">
          © 2026 ERP + CRM Portal
        </div>
      </div>

      <div className="login-right">
        <div className="login-form-container">
          <div className="mobile-login-logo">
            <div className="login-brand-icon">E</div>
            <strong>ERP + CRM</strong>
          </div>

          <div className="login-heading">
            <h1>Welcome back!</h1>
            <p>Sign in to continue to your dashboard.</p>
          </div>

          {error && (
            <div className="error-banner login-error">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="login-form">
            <div className="form-field">
              <label>Email Address</label>

              <div className="input-with-icon">
                <span>✉</span>

                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  type="email"
                  placeholder="Enter your email"
                  required
                />
              </div>
            </div>

            <div className="form-field">
              <div className="password-label">
                <label>Password</label>
                <button type="button">
                  Forgot password?
                </button>
              </div>

              <div className="input-with-icon">
                <span>▣</span>

                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  required
                />

                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <label className="remember-me">
              <input type="checkbox" />
              <span>Remember me</span>
            </label>

            <button
              className="login-submit"
              type="submit"
              disabled={loading}
            >
              {loading ? "Signing in..." : "Sign In"}
              {!loading && <span>→</span>}
            </button>
          </form>

          <div className="demo-accounts">
            <div className="demo-title">
              Demo Accounts
            </div>

            <p>
              Password: <code>Password123!</code>
            </p>

            <div className="demo-list">
              <span>admin@erpcrm.test</span>
              <span>sales@erpcrm.test</span>
              <span>warehouse@erpcrm.test</span>
              <span>accounts@erpcrm.test</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}