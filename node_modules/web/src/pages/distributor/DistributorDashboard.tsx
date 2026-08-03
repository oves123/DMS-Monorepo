import { useState, useEffect } from 'react';
import axios from 'axios';
import { Package, Clock, CheckCircle, ArrowRight, Wallet } from 'lucide-react';
import { Link } from 'react-router-dom';

const DistributorDashboard = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [walletBalance, setWalletBalance] = useState(0);
  const user = JSON.parse(localStorage.getItem('dms_user') || '{}');

  useEffect(() => {
    fetchOrders();
    fetchWalletBalance();
  }, []);

  const fetchWalletBalance = async () => {
    if (!user.user_id) return;
    try {
      const response = await axios.get(`http://localhost:5001/api/distributors/${user.user_id}/wallet`);
      setWalletBalance(response.data.wallet_balance || 0);
    } catch (err) {
      console.error('Failed to fetch wallet');
    }
  };

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/orders/distributor/${user.user_id}`);
      setOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch orders');
    }
  };

  const pendingOrders = orders.filter(o => o.status === 'PENDING').length;
  const executedOrders = orders.filter(o => o.status === 'EXECUTED').length;

  return (
    <div>
      <div className="page-header" style={{ borderBottom: 'none', paddingBottom: '0' }}>
        <h2 className="page-title">Welcome, {user.firm_name}!</h2>
      </div>

      <div className="data-card" style={{ padding: '32px', marginTop: '20px' }}>
        <h2 style={{ fontSize: '24px', marginBottom: '8px', color: 'var(--text-main)', fontWeight: 'bold' }}>
          Your Distributor Dashboard
        </h2>
        <p style={{ color: 'var(--text-muted)', lineHeight: '1.6', fontSize: '15px' }}>
          Track your orders, view the latest products, and manage your restocking all from one place.
        </p>

        {/* Metric Cards Grid */}
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
            cursor: 'default'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#64748b', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Total Orders</h4>
              <div style={{ background: '#e0e7ff', padding: '8px', borderRadius: '8px' }}>
                <Package size={20} color="#4f46e5" />
              </div>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '16px', color: '#0f172a' }}>{orders.length}</p>
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
            cursor: 'default'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#64748b', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Pending Orders</h4>
              <div style={{ background: '#fef3c7', padding: '8px', borderRadius: '8px' }}>
                <Clock size={20} color="#d97706" />
              </div>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '16px', color: '#0f172a' }}>{pendingOrders}</p>
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
            cursor: 'default'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#64748b', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Executed Orders</h4>
              <div style={{ background: '#dcfce7', padding: '8px', borderRadius: '8px' }}>
                <CheckCircle size={20} color="#16a34a" />
              </div>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '16px', color: '#0f172a' }}>{executedOrders}</p>
          </div>

          {/* Card 4 - Wallet */}
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
            cursor: 'default'
          }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-4px)'; e.currentTarget.style.boxShadow = '0 10px 15px -3px rgba(0, 0, 0, 0.1)'; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; e.currentTarget.style.boxShadow = '0 4px 6px -1px rgba(0, 0, 0, 0.05)'; }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h4 style={{ color: '#64748b', fontSize: '14px', textTransform: 'uppercase', fontWeight: 700, letterSpacing: '0.5px' }}>Wallet Credit</h4>
              <div style={{ background: '#ecfdf5', padding: '8px', borderRadius: '8px' }}>
                <Wallet size={20} color="#10b981" />
              </div>
            </div>
            <p style={{ fontSize: '36px', fontWeight: 'bold', marginTop: '16px', color: '#0f172a' }}>₹{parseFloat(walletBalance.toString()).toFixed(2)}</p>
          </div>

        </div>

        {/* Quick Action Area */}
        <div style={{ marginTop: '48px', padding: '32px', background: '#f8fafc', borderRadius: '12px', border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 style={{ fontSize: '18px', color: '#1e293b', fontWeight: 600, margin: '0 0 8px 0' }}>Ready to restock?</h3>
            <p style={{ margin: 0, color: '#64748b', fontSize: '15px' }}>Browse the storefront and place a new order now.</p>
          </div>
          <Link to="/distributor/products" style={{ textDecoration: 'none' }}>
            <button className="primary-btn" style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '12px 24px', fontSize: '15px' }}>
              Go to Storefront
              <ArrowRight size={18} />
            </button>
          </Link>
        </div>
      </div>
    </div>
  );
};

export default DistributorDashboard;
