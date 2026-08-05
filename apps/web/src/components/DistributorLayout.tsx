import { useState } from 'react';
import { Outlet, useNavigate, Link, useLocation } from 'react-router-dom';
import '../styles/AdminLayout.css'; // Reusing the same layout styles
import { LayoutDashboard, FileSpreadsheet, Clock, BarChart2, Menu, X, AlertTriangle, User, ChevronDown } from 'lucide-react';

const DistributorLayout = () => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
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
    { path: '/distributor/claims', name: 'My Claims', icon: <AlertTriangle size={20} /> },
    { path: '/distributor/reports', name: 'My Reports', icon: <BarChart2 size={20} /> },
    { path: '/distributor/ledger', name: 'My Ledger', icon: <FileSpreadsheet size={20} /> },
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
          {menuItems.map(item => (
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

      {/* Main Content */}
      <main className="main-content">
        <header className="top-header">
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <button className="menu-toggle" onClick={() => {
              if (window.innerWidth <= 768) setIsSidebarOpen(true);
              else setIsCollapsed(!isCollapsed);
            }}>
              <Menu size={24} />
            </button>
          </div>
          <div className="user-profile" style={{ position: 'relative' }}>
            <button 
              onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', cursor: 'pointer', padding: '8px', borderRadius: '8px' }}
            >
              <span className="user-name" style={{ fontWeight: 500, color: '#334155' }}>
                {JSON.parse(localStorage.getItem('dms_user') || '{}').firm_name || 'Distributor'}
              </span>
              <ChevronDown size={16} color="#64748b" />
            </button>

            {isProfileMenuOpen && (
              <>
                <div 
                  style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, zIndex: 90 }} 
                  onClick={() => setIsProfileMenuOpen(false)} 
                />
                <div style={{ position: 'absolute', top: '100%', right: 0, width: '180px', background: '#fff', borderRadius: '8px', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)', border: '1px solid #e2e8f0', zIndex: 100, marginTop: '8px', overflow: 'hidden' }}>
                  <button 
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      navigate('/distributor/profile');
                    }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'none', border: 'none', borderBottom: '1px solid #e2e8f0', cursor: 'pointer', color: '#334155', fontSize: '14px', textAlign: 'left' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    <User size={16} /> Profile
                  </button>
                  <button 
                    onClick={() => {
                      setIsProfileMenuOpen(false);
                      handleLogout();
                    }}
                    style={{ width: '100%', display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 16px', background: 'none', border: 'none', cursor: 'pointer', color: '#ef4444', fontSize: '14px', textAlign: 'left' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#fef2f2'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                  >
                    Logout
                  </button>
                </div>
              </>
            )}
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
