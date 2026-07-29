import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Login from './pages/Login';
import AdminLayout from './components/AdminLayout';
import AdminDashboard from './pages/AdminDashboard';
import AdminProducts from './pages/AdminProducts';
import AddProduct from './pages/AddProduct';
import AdminDistributors from './pages/AdminDistributors';
import AdminInventory from './pages/AdminInventory';
import AdminOrders from './pages/AdminOrders';
import AdminLedger from './pages/AdminLedger';
import AdminReports from './pages/AdminReports';

import DistributorLayout from './components/DistributorLayout';
import DistributorDashboard from './pages/distributor/DistributorDashboard';
import BulkOrderForm from './pages/distributor/BulkOrderForm';
import DistributorOrders from './pages/distributor/DistributorOrders';
import DistributorReports from './pages/distributor/DistributorReports';

import { ToastProvider } from './components/Toast';

function App() {
  return (
    <ToastProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Login />} />
          
          {/* Admin Routes (Wrapped in Layout) */}
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/products" element={<AdminProducts />} />
            <Route path="/admin/products/add" element={<AddProduct />} />
            <Route path="/admin/inventory" element={<AdminInventory />} />
            <Route path="/admin/orders" element={<AdminOrders />} />
            <Route path="/admin/distributors" element={<AdminDistributors />} />
            <Route path="/admin/ledger" element={<AdminLedger />} />
            <Route path="/admin/reports" element={<AdminReports />} />
          </Route>

          {/* Distributor Routes (Wrapped in Layout) */}
          <Route element={<DistributorLayout />}>
            <Route path="/distributor/dashboard" element={<DistributorDashboard />} />
            <Route path="/distributor/place-order" element={<BulkOrderForm />} />
            <Route path="/distributor/orders" element={<DistributorOrders />} />
            <Route path="/distributor/reports" element={<DistributorReports />} />
          </Route>
        </Routes>
      </Router>
    </ToastProvider>
  );
}

export default App;

