import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, 
  LineChart, Line 
} from 'recharts';
import { AlertTriangle, TrendingUp, Package, Users, ChevronDown, Search } from 'lucide-react';

const AdminReports = () => {
  const [salesData, setSalesData] = useState([]);
  const [productData, setProductData] = useState([]);
  const [distributorData, setDistributorData] = useState([]);
  const [inventoryAlerts, setInventoryAlerts] = useState<any[]>([]);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [loading, setLoading] = useState(true);
  const [distributorsList, setDistributorsList] = useState<any[]>([]);
  const [selectedDistributor, setSelectedDistributor] = useState('all');

  // Combobox State
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [distributorSearchText, setDistributorSearchText] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: any) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filteredDistributors = distributorsList.filter(d => 
    d.firm_name.toLowerCase().includes(distributorSearchText.toLowerCase())
  );

  const selectedDistributorName = selectedDistributor === 'all' 
    ? 'All Distributors (Global)' 
    : distributorsList.find(d => d.user_id.toString() === selectedDistributor)?.firm_name || 'Select Distributor';

  useEffect(() => {
    const fetchDistributors = async () => {
      try {
        const res = await axios.get('http://localhost:5001/api/distributors');
        setDistributorsList(res.data);
      } catch (err) {
        console.error('Failed to fetch distributors', err);
      }
    };
    fetchDistributors();
  }, []);

  useEffect(() => {
    fetchAllReports();
  }, [selectedDistributor]); // Refetch when distributor changes

  const fetchAllReports = async () => {
    try {
      setLoading(true);
      const query = `?startDate=${startDate}&endDate=${endDate}`;
      
      if (selectedDistributor === 'all') {
        const [salesRes, prodRes, distRes, invRes] = await Promise.all([
          axios.get(`http://localhost:5001/api/reports/admin/sales${query}`),
          axios.get(`http://localhost:5001/api/reports/admin/products${query}`),
          axios.get(`http://localhost:5001/api/reports/admin/distributors${query}`),
          axios.get(`http://localhost:5001/api/reports/admin/inventory`)
        ]);

        setSalesData(salesRes.data);
        setProductData(prodRes.data);
        setDistributorData(distRes.data);
        setInventoryAlerts(invRes.data);
      } else {
        const [salesRes, prodRes] = await Promise.all([
          axios.get(`http://localhost:5001/api/reports/distributor/${selectedDistributor}/purchases${query}`),
          axios.get(`http://localhost:5001/api/reports/distributor/${selectedDistributor}/products${query}`)
        ]);

        // Map distributor data to match the admin chart keys
        const mappedSales = salesRes.data.map((d: any) => ({
          date: d.date,
          total_orders: d.total_orders,
          total_revenue: d.amount_spent
        }));
        
        const mappedProds = prodRes.data.map((d: any) => ({
          product_name: d.product_name,
          total_sold: d.total_bought
        }));

        setSalesData(mappedSales);
        setProductData(mappedProds);
        setDistributorData([]);
        setInventoryAlerts([]);
      }
    } catch (err) {
      console.error('Failed to fetch reports', err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading reports...</div>;
  }

  return (
    <div>
      <div className="page-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <h2 className="page-title">Reports & Analytics</h2>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', background: '#fff', padding: '12px', borderRadius: '8px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', flexWrap: 'wrap' }}>
          
          <div ref={dropdownRef} style={{ position: 'relative', width: '260px' }}>
            <div 
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              style={{ 
                padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', 
                background: '#f8fafc', fontWeight: 500, display: 'flex', justifyContent: 'space-between', 
                alignItems: 'center', cursor: 'pointer', fontSize: '14px', height: '38px'
              }}
            >
              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flex: 1 }}>
                {selectedDistributorName}
              </span>
              <ChevronDown size={16} color="#64748b" style={{ flexShrink: 0, marginLeft: '8px' }} />
            </div>
            
            {isDropdownOpen && (
              <div style={{ 
                position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', 
                background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', 
                boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1), 0 4px 6px -2px rgba(0,0,0,0.05)', zIndex: 50 
              }}>
                <div style={{ padding: '8px', borderBottom: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Search size={14} color="#94a3b8" />
                  <input 
                    autoFocus
                    type="text" 
                    placeholder="Search distributor..." 
                    value={distributorSearchText}
                    onChange={e => setDistributorSearchText(e.target.value)}
                    style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px', background: 'transparent' }}
                  />
                </div>
                <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                  <div 
                    onClick={() => {
                      setSelectedDistributor('all');
                      setIsDropdownOpen(false);
                      setDistributorSearchText('');
                    }}
                    style={{ 
                      padding: '10px 12px', cursor: 'pointer', fontSize: '14px',
                      background: selectedDistributor === 'all' ? '#f1f5f9' : 'transparent',
                      fontWeight: selectedDistributor === 'all' ? 600 : 400,
                      color: selectedDistributor === 'all' ? 'var(--primary)' : 'var(--text-main)'
                    }}
                    onMouseEnter={e => { if (selectedDistributor !== 'all') e.currentTarget.style.background = '#f8fafc'; }}
                    onMouseLeave={e => { if (selectedDistributor !== 'all') e.currentTarget.style.background = 'transparent'; }}
                  >
                    All Distributors (Global)
                  </div>
                  {filteredDistributors.map(d => (
                    <div 
                      key={d.user_id}
                      onClick={() => {
                        setSelectedDistributor(d.user_id.toString());
                        setIsDropdownOpen(false);
                        setDistributorSearchText('');
                      }}
                      style={{ 
                        padding: '10px 12px', cursor: 'pointer', fontSize: '14px',
                        background: selectedDistributor === d.user_id.toString() ? '#f1f5f9' : 'transparent',
                        fontWeight: selectedDistributor === d.user_id.toString() ? 600 : 400,
                        color: selectedDistributor === d.user_id.toString() ? 'var(--primary)' : 'var(--text-main)'
                      }}
                      onMouseEnter={e => { if (selectedDistributor !== d.user_id.toString()) e.currentTarget.style.background = '#f8fafc'; }}
                      onMouseLeave={e => { if (selectedDistributor !== d.user_id.toString()) e.currentTarget.style.background = 'transparent'; }}
                    >
                      {d.firm_name}
                    </div>
                  ))}
                  {filteredDistributors.length === 0 && (
                    <div style={{ padding: '10px 12px', fontSize: '14px', color: '#94a3b8', textAlign: 'center' }}>
                      No matches found
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>

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
          <button onClick={fetchAllReports} className="primary-btn" style={{ padding: '8px 16px' }}>
            Filter
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(450px, 1fr))', gap: '24px' }}>
        
        {/* Sales & Revenue Chart */}
        <div className="data-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <TrendingUp color="var(--primary)" /> Sales Trend (Revenue)
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={salesData} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis yAxisId="left" tick={{fill: '#64748b', fontSize: 12}} />
                  <YAxis yAxisId="right" orientation="right" tick={{fill: '#64748b', fontSize: 12}} />
                  <Tooltip contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Legend />
                  <Line yAxisId="left" type="monotone" dataKey="total_revenue" stroke="var(--primary)" strokeWidth={3} name="Revenue (₹)" activeDot={{ r: 8 }} />
                  <Line yAxisId="right" type="monotone" dataKey="total_orders" stroke="#10b981" strokeWidth={3} name="Total Orders" />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '100px' }}>No sales data available.</div>
            )}
          </div>
        </div>

        {/* Top Selling Products */}
        <div className="data-card" style={{ padding: '24px' }}>
          <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
            <Package color="#10b981" /> Top Selling Products
          </h3>
          <div style={{ height: '300px', width: '100%' }}>
            {productData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={productData} layout="vertical" margin={{ top: 5, right: 30, left: 50, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                  <XAxis type="number" hide />
                  <YAxis dataKey="product_name" type="category" tick={{fill: '#475569', fontSize: 12}} width={100} />
                  <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                  <Bar dataKey="total_sold" fill="#10b981" radius={[0, 4, 4, 0]} name="Qty Sold" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '100px' }}>No product data available.</div>
            )}
          </div>
        </div>

        {/* Top Distributors - Only show if 'all' is selected */}
        {selectedDistributor === 'all' && (
          <div className="data-card" style={{ padding: '24px' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <Users color="#f59e0b" /> Top Distributors
            </h3>
            <div style={{ height: '300px', width: '100%' }}>
              {distributorData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={distributorData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                    <XAxis dataKey="distributor_name" tick={{fill: '#475569', fontSize: 12}} />
                    <YAxis hide />
                    <Tooltip cursor={{fill: '#f1f5f9'}} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)' }} />
                    <Bar dataKey="total_spent" fill="#f59e0b" radius={[4, 4, 0, 0]} name="Revenue Generated (₹)" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                 <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: '100px' }}>No distributor data available.</div>
              )}
            </div>
          </div>
        )}

        {/* Low Inventory Alerts - Only show if 'all' is selected */}
        {selectedDistributor === 'all' && (
          <div className="data-card" style={{ padding: '24px', gridColumn: '1 / -1' }}>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px', color: '#ef4444' }}>
              <AlertTriangle color="#ef4444" /> Low Inventory Alerts
            </h3>
            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product Name</th>
                    <th>Pack Size</th>
                    <th>Current Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {inventoryAlerts.length > 0 ? (
                    inventoryAlerts.map((item, index) => (
                      <tr key={index}>
                        <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                        <td>{item.pack_size}</td>
                        <td style={{ fontWeight: 'bold', color: item.current_stock_qty === 0 ? '#ef4444' : '#f59e0b' }}>
                          {item.current_stock_qty}
                        </td>
                        <td>
                          <span style={{ 
                            padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                            background: item.current_stock_qty === 0 ? '#fee2e2' : '#fef3c7',
                            color: item.current_stock_qty === 0 ? '#ef4444' : '#d97706'
                          }}>
                            {item.current_stock_qty === 0 ? 'Out of Stock' : 'Low Stock'}
                          </span>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '24px', color: '#64748b' }}>
                        All products are sufficiently stocked!
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};

export default AdminReports;
