import { useState, useEffect } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Package, Users, ShoppingCart, PlusCircle, LayoutDashboard, Truck } from 'lucide-react';

const AdminDashboard = () => {
  const [metrics, setMetrics] = useState({
    pendingOrders: 0,
    totalProducts: 0,
    activeDistributors: 0
  });

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/dashboard/metrics');
      setMetrics(response.data);
    } catch (err) {
      console.error('Failed to fetch dashboard metrics');
    }
  };

  return (
    <div>
      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
        <h2 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <LayoutDashboard size={24} color="var(--primary)" /> Overview Dashboard
        </h2>
      </div>

      <div className="data-card" style={{ padding: '32px', marginTop: '20px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-main)', fontWeight: 'bold' }}>
          Welcome back to the Super Distributor Portal
        </h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '15px' }}>
          Here is what's happening across your distribution network today. Manage products, track active orders, and monitor your entire inventory from this central hub.
        </p>
        
        {/* Metric Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '24px', marginTop: '32px' }}>
          
          {/* Card 1 */}
          <div style={{ 
            padding: '24px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#64748b', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Pending Orders</h4>
              <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '8px' }}>
                <ShoppingCart size={20} color="#4f46e5" />
              </div>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '16px', color: '#0f172a' }}>{metrics.pendingOrders}</p>
          </div>

          {/* Card 2 */}
          <div style={{ 
            padding: '24px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#64748b', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Total Products</h4>
              <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '8px' }}>
                <Package size={20} color="#16a34a" />
              </div>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '16px', color: '#0f172a' }}>{metrics.totalProducts}</p>
          </div>

          {/* Card 3 */}
          <div style={{ 
            padding: '24px', 
            borderRadius: '12px', 
            background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)', 
            boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03)',
            border: '1px solid #f1f5f9',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            transition: 'transform 0.2s, box-shadow 0.2s',
            cursor: 'pointer'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#64748b', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Active Distributors</h4>
              <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px' }}>
                <Users size={20} color="#d97706" />
              </div>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '16px', color: '#0f172a' }}>{metrics.activeDistributors}</p>
          </div>

        </div>

        {/* Quick Actions */}
        <div style={{ marginTop: '48px' }}>
          <h3 style={{ fontSize: '18px', marginBottom: '20px', color: '#1e293b', fontWeight: 600 }}>Quick Actions</h3>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <Link to="/admin/products/add" style={{ textDecoration: 'none' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', 
                background: 'var(--primary)', color: '#fff', 
                padding: '12px 24px', borderRadius: '8px', 
                fontWeight: 500, transition: 'opacity 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.opacity = '0.9'}
              onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
                <PlusCircle size={20} />
                Add New Product
              </div>
            </Link>
            
            <Link to="/admin/inventory" style={{ textDecoration: 'none' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', 
                background: '#fff', color: '#334155', border: '1px solid #cbd5e1',
                padding: '12px 24px', borderRadius: '8px', 
                fontWeight: 500, transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <Package size={20} color="#64748b" />
                Update Stock
              </div>
            </Link>

            <Link to="/admin/distributors" style={{ textDecoration: 'none' }}>
              <div style={{ 
                display: 'flex', alignItems: 'center', gap: '10px', 
                background: '#fff', color: '#334155', border: '1px solid #cbd5e1',
                padding: '12px 24px', borderRadius: '8px', 
                fontWeight: 500, transition: 'background 0.2s'
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#f8fafc'}
              onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                <Truck size={20} color="#64748b" />
                Manage Distributors
              </div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;
