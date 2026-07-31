import { useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import { Menu, X, LayoutDashboard, Package, Archive, ShoppingCart, Users, FileSpreadsheet, BarChart2 } from 'lucide-react';
import '../styles/AdminLayout.css';

const AdminLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('dms_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('dms_token');
    localStorage.removeItem('dms_user');
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={20} /> },
    { name: 'Products', path: '/admin/products', icon: <Package size={20} /> },
    { name: 'Inventory', path: '/admin/inventory', icon: <Archive size={20} /> },
    { name: 'Orders', path: '/admin/orders', icon: <ShoppingCart size={20} /> },
    { name: 'Distributors', path: '/admin/distributors', icon: <Users size={20} /> },
    { name: 'Ledger & Billing', path: '/admin/ledger', icon: <FileSpreadsheet size={20} /> },
    { name: 'Reports', path: '/admin/reports', icon: <BarChart2 size={20} /> },
  ];

  return (
    <div className="admin-layout">
      {/* Mobile Sidebar Overlay */}
      <div
        className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`}
        onClick={() => setIsSidebarOpen(false)}
      />

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <img src="/logo.png" alt="Anand DMS" style={{ height: '60px', objectFit: 'contain' }} />
          {isSidebarOpen && (
            <button className="menu-toggle" onClick={() => setIsSidebarOpen(false)}>
              <X size={24} color="#fff" />
            </button>
          )}
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
              onClick={() => setIsSidebarOpen(false)}
            >
              {item.icon}
              <span className="nav-label">{item.name}</span>
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="menu-toggle" onClick={() => {
              if (window.innerWidth <= 768) setIsSidebarOpen(true);
              else setIsCollapsed(!isCollapsed);
            }}>
              <Menu size={24} />
            </button>
            <div className="header-title">
              <h3>{navItems.find(i => i.path === location.pathname)?.name || 'Admin'}</h3>
            </div>
          </div>
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center' }}>
            <span className="user-name">{user.firm_name || 'Super Distributor'}</span>
            <button className="logout-header-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>

        <div className="content-wrapper">
          <Outlet /> {/* This is where the page content will render */}
        </div>
      </main>
    </div>
  );
};

export default AdminLayout;
