import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/AdminLayout.css';

const AdminLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const user = JSON.parse(localStorage.getItem('dms_user') || '{}');

  const handleLogout = () => {
    localStorage.removeItem('dms_token');
    localStorage.removeItem('dms_user');
    navigate('/');
  };

  const navItems = [
    { name: 'Dashboard', path: '/admin/dashboard' },
    { name: 'Products', path: '/admin/products' },
    { name: 'Inventory', path: '/admin/inventory' },
    { name: 'Orders', path: '/admin/orders' },
    { name: 'Distributors', path: '/admin/distributors' },
    { name: 'Ledger & Billing', path: '/admin/ledger' },
    { name: 'Reports', path: '/admin/reports' },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <h2>DMS Admin</h2>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
            >
              {item.name}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="top-header">
          <div className="header-title">
            <h3>{navItems.find(i => i.path === location.pathname)?.name || 'Admin'}</h3>
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
