import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { TrendingUp, Package } from 'lucide-react';

const DistributorReports = () => {
  const [purchaseData, setPurchaseData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      const user = JSON.parse(localStorage.getItem('dms_user') || '{}');
      if (!user.user_id) return;

      setLoading(true);
      const query = `?startDate=${startDate}&endDate=${endDate}`;
      const [purchasesRes, productsRes] = await Promise.all([
        api.get(`/api/reports/distributor/${user.user_id}/purchases${query}`),
        api.get(`/api/reports/distributor/${user.user_id}/products${query}`)
      ]);

      setPurchaseData(purchasesRes.data);
      setProductData(productsRes.data);
    } catch (err) {
      console.error('Failed to fetch distributor reports', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading your reports...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 className="page-title">My Reports & Analytics</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', background: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}>
          <input 
            type="date" 
            value={startDate} 
            onChange={e => setStartDate(e.target.value)} 
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }} 
          />
          <span style={{ color: '#64748b', fontSize: '14px', fontWeight: 500 }}>to</span>
          <input 
            type="date" 
            value={endDate} 
            onChange={e => setEndDate(e.target.value)} 
            style={{ padding: '8px', borderRadius: '6px', border: '1px solid var(--border-color)', outline: 'none' }} 
          />
          <button onClick={fetchReports} className="primary-btn" style={{ padding: '8px 16px' }}>
            Filter
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        
        {/* Purchase History */}
        <div className="data-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <TrendingUp color="var(--primary)" /> My Purchase History
          </h3>
          <div style={{ height: '350px', width: '100%' }}>
            {purchaseData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purchaseData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fill: '#475569', fontSize: 12}} />
                  <YAxis tick={{fill: '#475569', fontSize: 12}} />
                  <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="amount_spent" fill="var(--primary)" radius={[4, 4, 0, 0]} name="Amount Spent (₹)" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '100px' }}>No purchase data available yet.</div>
            )}
          </div>
        </div>

        {/* Top Bought Products */}
        <div className="data-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Package color="#10b981" /> My Frequently Ordered Products
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            {productData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="product_name" type="category" tick={{fill: '#475569', fontSize: 12}} width={120} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="total_bought" fill="#10b981" radius={[0, 4, 4, 0]} name="Total Qty Bought" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '100px' }}>No product data available yet.</div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default DistributorReports;
