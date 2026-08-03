import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Package, FileText, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import InvoiceModal from '../../components/InvoiceModal';

const DistributorOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const user = JSON.parse(localStorage.getItem('dms_user') || '{}');

  // Filters and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/orders/distributor/${user.user_id}`);
      setOrders(response.data);
    } catch (err) {
      console.error('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'PENDING': return { bg: '#fef3c7', text: '#d97706' };
      case 'EXECUTED': return { bg: '#d1fae5', text: '#059669' };
      case 'REJECTED': return { bg: '#fee2e2', text: '#dc2626' };
      default: return { bg: '#f1f5f9', text: '#475569' };
    }
  };

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      const searchLower = searchQuery.toLowerCase();
      const matchesSearch = 
        order.order_id.toString().includes(searchLower) ||
        order.items.some((item: any) => item.product_name.toLowerCase().includes(searchLower));
      
      return matchesStatus && matchesSearch;
    });
  }, [orders, searchQuery, statusFilter]);

  // Pagination Logic
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, statusFilter]);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">My Orders</h2>
      </div>

      <div className="data-card">
        {/* Filters Section */}
        <div style={{ padding: '20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '16px', alignItems: 'center', flexWrap: 'wrap', background: '#f8fafc', borderTopLeftRadius: '12px', borderTopRightRadius: '12px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '8px 12px', flex: '1', minWidth: '250px' }}>
            <Search size={18} color="#64748b" />
            <input 
              type="text" 
              placeholder="Search by Order ID or Product Name..." 
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '14px' }}
            />
          </div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Filter size={18} color="#64748b" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{ padding: '8px 12px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', cursor: 'pointer' }}
            >
              <option value="All">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="EXECUTED">Executed</option>
            </select>
          </div>

          {(searchQuery || statusFilter !== 'All') && (
            <button 
              onClick={() => { setSearchQuery(''); setStatusFilter('All'); }}
              style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontSize: '14px', fontWeight: 500 }}
            >
              Clear Filters
            </button>
          )}
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading orders...</div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            <Package size={48} color="#9ca3af" style={{ margin: '0 auto 16px' }} />
            No orders found matching your filters.
          </div>
        ) : (
          <div style={{ padding: '20px' }}>
            {currentOrders.map(order => {
              const statusStyle = getStatusColor(order.status);
              
              // Calculate Totals
              let totalBoxes = 0;
              let totalAmount = 0;
              order.items.forEach((item: any) => {
                const qty = order.status === 'EXECUTED' ? (item.executed_qty || 0) : (item.requested_qty || 0);
                totalBoxes += qty;
                totalAmount += (qty * item.price_at_order);
              });
              
              return (
                <div key={order.order_id} style={{ border: '1px solid var(--border-color)', borderRadius: '12px', marginBottom: '20px', overflow: 'hidden' }}>
                  <div style={{ background: '#f8fafc', padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div>
                      <h3 style={{ margin: '0 0 4px', fontSize: '16px' }}>Order #{order.order_id}</h3>
                      <div style={{ fontSize: '13px', color: 'var(--text-muted)' }}>
                        Placed on {new Date(order.order_date).toLocaleString()}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      {order.status === 'EXECUTED' && (
                        <button 
                          onClick={() => setSelectedOrderId(order.order_id)}
                          style={{ 
                            background: '#fff', border: '1px solid var(--primary)', color: 'var(--primary)', 
                            padding: '6px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600, 
                            cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' 
                          }}
                        >
                          <FileText size={14} /> View Invoice
                        </button>
                      )}
                      <div style={{ 
                        background: statusStyle.bg, color: statusStyle.text, 
                        padding: '6px 12px', borderRadius: '20px', fontSize: '12px', fontWeight: 'bold' 
                      }}>
                        {order.status}
                      </div>
                    </div>
                  </div>
                  
                  <div style={{ padding: '0 20px', overflowX: 'auto' }}>
                    <table className="data-table" style={{ border: 'none', marginBottom: 0, minWidth: '500px' }}>
                      <thead>
                        <tr>
                          <th>Item</th>
                          <th>Pack Size</th>
                          <th>Req Qty</th>
                          {order.status === 'EXECUTED' && <th>Exec Qty</th>}
                          <th>Price</th>
                        </tr>
                      </thead>
                      <tbody>
                        {order.items.map((item: any) => (
                          <tr key={item.order_item_id}>
                            <td style={{ fontWeight: 500 }}>{item.product_name}</td>
                            <td>{item.pack_size}</td>
                            <td>{item.requested_qty}</td>
                            {order.status === 'EXECUTED' && (
                              <td style={{ color: '#10b981', fontWeight: 'bold' }}>{item.executed_qty}</td>
                            )}
                            <td>₹{item.price_at_order}</td>
                          </tr>
                        ))}
                      </tbody>
                      <tfoot>
                        <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--border-color)' }}>
                          <td colSpan={order.status === 'EXECUTED' ? 3 : 2} style={{ textAlign: 'right', fontWeight: 'bold', color: '#475569', padding: '12px' }}>
                            Order Summary:
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#0f172a', padding: '12px' }}>
                            {totalBoxes}
                          </td>
                          <td style={{ fontWeight: 'bold', color: '#10b981', fontSize: '15px', padding: '12px' }}>
                            ₹{totalAmount.toFixed(2)}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
            <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginRight: 'auto' }}>
              Showing {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredOrders.length)} of {filteredOrders.length} orders
            </span>
            <button
              onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
              disabled={currentPage === 1}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', opacity: currentPage === 1 ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              <ChevronLeft size={16} /> Previous
            </button>
            <div style={{ fontSize: '14px', fontWeight: 500 }}>
              Page {currentPage} of {totalPages}
            </div>
            <button
              onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
              disabled={currentPage === totalPages}
              style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--border-color)', background: '#fff', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', opacity: currentPage === totalPages ? 0.5 : 1, display: 'flex', alignItems: 'center', gap: '4px' }}
            >
              Next <ChevronRight size={16} />
            </button>
          </div>
        )}
      </div>

      {selectedOrderId && (
        <InvoiceModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  );
};

export default DistributorOrders;
