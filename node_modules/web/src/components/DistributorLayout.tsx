import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/AdminLayout.css'; // Reusing the same layout styles
import { LayoutDashboard, FileSpreadsheet, Clock, BarChart2 } from 'lucide-react';

const DistributorLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const handleLogout = () => {
    localStorage.removeItem('dms_token');
    localStorage.removeItem('dms_user');
    navigate('/');
  };

  const menuItems = [
    { path: '/distributor/dashboard', name: 'Dashboard', icon: <LayoutDashboard size={20} /> },
    { path: '/distributor/place-order', name: 'Place Bulk Order', icon: <FileSpreadsheet size={20} /> },
    { path: '/distributor/orders', name: 'My Orders', icon: <Clock size={20} /> },
    { path: '/distributor/reports', name: 'My Reports', icon: <BarChart2 size={20} /> },
  ];

  return (
    <div className="admin-layout">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          {/* <div className="logo-icon">M</div> */}
          <h2>Distributor Portal</h2>
        </div>

        <nav className="sidebar-nav">
          {menuItems.map(item => (
            <Link 
              key={item.path} 
              to={item.path} 
              className={`nav-item ${location.pathname === item.path ? 'active' : ''}`}
              style={{ display: 'flex', alignItems: 'center', gap: '10px' }}
            >
              {item.icon}
              <span>{item.name}</span>
            </Link>
          ))}
        </nav>

      </aside>

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div className="user-profile" style={{ display: 'flex', alignItems: 'center' }}>
            <span className="user-name">{JSON.parse(localStorage.getItem('dms_user') || '{}').firm_name || 'Distributor'}</span>
            <button className="logout-header-btn" onClick={handleLogout}>
              Logout
            </button>
          </div>
        </header>
        
        <div className="content-wrapper">
          <Outlet />
        </div>
      </main>
    </div>
  );
};

export default DistributorLayout;
