import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Package, FileText, Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import InvoiceModal from '../../components/InvoiceModal';
import { useToast } from '../../components/Toast';

const DistributorOrders = () => {
  const { showToast } = useToast();
  const [orders, setOrders] = useState<any[]>([]);
  const [filedClaims, setFiledClaims] = useState<any[]>([]);
  const [claimWindowDays, setClaimWindowDays] = useState(7);
  const [loading, setLoading] = useState(true);
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  
  // Claim State
  const [claimItem, setClaimItem] = useState<any>(null);
  const [claimQty, setClaimQty] = useState(1);
  const [claimReason, setClaimReason] = useState('');
  const [claimImage, setClaimImage] = useState<File | null>(null);
  const [submittingClaim, setSubmittingClaim] = useState(false);

  const user = JSON.parse(localStorage.getItem('dms_user') || '{}');

  // Filters and Pagination
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchOrders();
    fetchClaims();
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/settings/company');
      if (response.data && response.data.claim_window_days) {
        setClaimWindowDays(response.data.claim_window_days);
      }
    } catch (err) {
      console.error('Failed to fetch settings');
    }
  };

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

  const fetchClaims = async () => {
    if (!user.user_id) return;
    try {
      const response = await axios.get(`http://localhost:5001/api/claims/distributor/${user.user_id}`);
      setFiledClaims(response.data);
    } catch (err) {
      console.error('Failed to fetch claims');
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

  const submitClaim = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!claimItem) return;
    
    setSubmittingClaim(true);
    try {
      const formData = new FormData();
      formData.append('order_id', claimItem.order_id);
      formData.append('variant_id', claimItem.variant_id);
      formData.append('quantity', claimQty.toString());
      formData.append('reason', claimReason);
      formData.append('distributor_id', user.user_id);
      if (claimImage) {
        formData.append('image', claimImage);
      }

      await axios.post('http://localhost:5001/api/claims/submit', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      showToast('Claim submitted successfully!', 'success');
      setClaimItem(null);
      setClaimQty(1);
      setClaimReason('');
      setClaimImage(null);
      fetchClaims(); // Refresh claims to update UI
    } catch (err) {
      showToast('Failed to submit claim', 'error');
    } finally {
      setSubmittingClaim(false);
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
                    <div className="table-responsive">
                      <table className="data-table" style={{ border: 'none', marginBottom: 0, minWidth: '500px' }}>
                        <thead>
                          <tr>
                            <th>Item</th>
                            <th>Pack Size</th>
                            <th>Req Qty</th>
                            {order.status === 'EXECUTED' && <th>Exec Qty</th>}
                            <th>Price</th>
                            {order.status === 'EXECUTED' && <th>Action</th>}
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
                              {order.status === 'EXECUTED' && (
                                <td>
                                  {(() => {
                                    // Check if a claim is already filed
                                    const existingClaim = filedClaims.find(c => c.order_id === order.order_id && c.variant_id === item.variant_id);
                                    if (existingClaim) {
                                      return (
                                        <span style={{
                                          padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600,
                                          background: existingClaim.status === 'PENDING' ? '#fef3c7' : (existingClaim.status === 'APPROVED' ? '#d1fae5' : '#fee2e2'),
                                          color: existingClaim.status === 'PENDING' ? '#d97706' : (existingClaim.status === 'APPROVED' ? '#059669' : '#b91c1c')
                                        }}>
                                          Claim: {existingClaim.status}
                                        </span>
                                      );
                                    }
                                    
                                    // Check if the claim window has expired
                                    let isExpired = false;
                                    if (order.execution_date) {
                                      const execDate = new Date(order.execution_date);
                                      const now = new Date();
                                      const diffTime = Math.abs(now.getTime() - execDate.getTime());
                                      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                                      if (diffDays > claimWindowDays) {
                                        isExpired = true;
                                      }
                                    }

                                    if (isExpired) {
                                      return (
                                        <span style={{ padding: '4px 8px', borderRadius: '4px', fontSize: '11px', fontWeight: 600, background: '#f1f5f9', color: '#64748b' }}>
                                          Expired
                                        </span>
                                      );
                                    }

                                    return (
                                      <button 
                                        onClick={() => setClaimItem({ ...item, order_id: order.order_id })}
                                        style={{ padding: '4px 8px', fontSize: '11px', background: '#fee2e2', color: '#dc2626', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer' }}
                                      >
                                        File Claim
                                      </button>
                                    );
                                  })()}
                                </td>
                              )}
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

                  {order.status === 'EXECUTED' && (
                    <div style={{ background: '#f8fafc', padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', gap: '24px' }}>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Wallet Credit Applied</div>
                          <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 500 }}>₹{order.credit_applied?.toFixed(2) || '0.00'}</div>
                        </div>
                        <div>
                          <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Extra Discount</div>
                          <div style={{ fontSize: '16px', color: '#0f172a', fontWeight: 500 }}>₹{order.extra_discount?.toFixed(2) || '0.00'}</div>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 600 }}>Final Payable</div>
                        <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                           ₹{order.final_payable?.toFixed(2) || '0.00'}
                        </div>
                      </div>
                    </div>
                  )}

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

      {/* Claim Modal */}
      {claimItem && (
        <div className="modal-overlay" style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
          <div style={{ background: '#fff', padding: '24px', borderRadius: '12px', width: '100%', maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 16px 0', fontSize: '18px' }}>File Defect Claim</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '14px', color: '#64748b' }}>
              Product: <strong>{claimItem.product_name}</strong>
            </p>
            
            <form onSubmit={submitClaim}>
              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Defect Quantity (Max {claimItem.executed_qty})</label>
                <input 
                  type="number" 
                  min="1" 
                  max={claimItem.executed_qty} 
                  required
                  value={claimQty}
                  onChange={e => setClaimQty(parseInt(e.target.value))}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '16px' }}>
                <label>Reason / Description</label>
                <textarea 
                  required
                  placeholder="E.g., Box damaged during transit, expired product..."
                  value={claimReason}
                  onChange={e => setClaimReason(e.target.value)}
                  style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', minHeight: '80px' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '24px' }}>
                <label>Upload Photo (Optional)</label>
                <input 
                  type="file" 
                  accept="image/*"
                  onChange={e => {
                    if (e.target.files && e.target.files.length > 0) {
                      setClaimImage(e.target.files[0]);
                    }
                  }}
                  style={{ width: '100%' }}
                />
              </div>

              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button type="button" className="secondary-btn" onClick={() => setClaimItem(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={submittingClaim}>
                  {submittingClaim ? 'Submitting...' : 'Submit Claim'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {selectedOrderId && (
        <InvoiceModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  );
};

export default DistributorOrders;
