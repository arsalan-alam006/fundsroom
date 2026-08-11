import { Routes, Route } from "react-router-dom";
import Layout from "./components/Layout";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import Dashboard from "./pages/Dashboard";
import Customers from "./pages/Customers";
import CustomerDetail from "./pages/CustomerDetail";
import Products from "./pages/Products";
import ProductDetail from "./pages/ProductDetail";
import Challans from "./pages/Challans";
import ChallanCreate from "./pages/ChallanCreate";
import ChallanDetail from "./pages/ChallanDetail";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route
        element={
          <ProtectedRoute>
            <Layout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<Dashboard />} />
        <Route path="/customers" element={<Customers />} />
        <Route path="/customers/:id" element={<CustomerDetail />} />
        <Route path="/products" element={<Products />} />
        <Route path="/products/:id" element={<ProductDetail />} />
        <Route path="/challans" element={<Challans />} />
        <Route path="/challans/new" element={<ChallanCreate />} />
        <Route path="/challans/:id" element={<ChallanDetail />} />
      </Route>
    </Routes>
  );
}
