import { useState, useEffect, useMemo } from 'react';
import api from '../lib/api';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';

const AdminOrders = () => {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  
  // State for executing an order
  const [executingOrderId, setExecutingOrderId] = useState<number | null>(null);
  const [executionQuantities, setExecutionQuantities] = useState<Record<number, number>>({});
  
  // New States for Discounts and Wallet
  const [extraDiscount, setExtraDiscount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');
  const [creditApplied, setCreditApplied] = useState<number>(0);

  useEffect(() => {
    fetchOrders();
  }, []);

  const fetchOrders = async () => {
    try {
      const response = await api.get('/api/orders/admin');
      setOrders(response.data);
    } catch (err) {
      setError('Failed to fetch orders');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (itemId: number, value: string) => {
    setExecutionQuantities({
      ...executionQuantities,
      [itemId]: parseInt(value) || 0
    });
  };

  const handleExecute = async (order: any) => {
    try {
      const itemsPayload = order.items.map((item: any) => ({
        order_item_id: item.order_item_id,
        variant_id: item.variant_id,
        executed_qty: executionQuantities[item.order_item_id] !== undefined 
            ? executionQuantities[item.order_item_id] 
            : item.requested_qty
      }));

      await api.put(`/api/orders/${order.order_id}/execute`, {
        items: itemsPayload,
        extra_discount: extraDiscount,
        discount_reason: discountReason,
        credit_applied: creditApplied
      });

      setExecutingOrderId(null);
      setExtraDiscount(0);
      setDiscountReason('');
      setCreditApplied(0);
      fetchOrders();
    } catch (err) {
      setError('Failed to execute order');
    }
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      const matchesSearch = !searchQuery ||
        order.distributor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        order.distributor_phone?.includes(searchQuery) ||
        String(order.order_id).includes(searchQuery);
      const matchesStatus = statusFilter === 'All' || order.status === statusFilter;
      const matchesDate = !dateFilter || 
        new Date(order.order_date).toLocaleDateString('en-CA') === dateFilter;
      return matchesSearch && matchesStatus && matchesDate;
    });
  }, [orders, searchQuery, statusFilter, dateFilter]);

  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const currentItems = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, statusFilter, dateFilter]);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Orders Management</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="data-card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading orders...</div>
        ) : orders.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No orders found.
          </div>
        ) : (
          <div>
            {/* Filter Bar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

                {/* Search */}
                <div style={{ position: 'relative', width: '260px' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by name, phone, order #..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '9px 12px 9px 36px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>

                {/* Status Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} color="#64748b" />
                  <select
                    value={statusFilter}
                    onChange={e => setStatusFilter(e.target.value)}
                    style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  >
                    <option value="All">All Status</option>
                    <option value="PENDING">Pending</option>
                    <option value="EXECUTED">Executed</option>
                  </select>
                </div>

                {/* Date Filter */}
                <input
                  type="date"
                  value={dateFilter}
                  onChange={e => setDateFilter(e.target.value)}
                  style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                />

                {/* Clear Filters */}
                {(searchQuery || statusFilter !== 'All' || dateFilter) && (
                  <button
                    onClick={() => { setSearchQuery(''); setStatusFilter('All'); setDateFilter(''); }}
                    style={{ padding: '6px 12px', fontSize: '13px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>

              <span style={{ fontSize: '14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                {filteredOrders.length} order{filteredOrders.length !== 1 ? 's' : ''} found
              </span>
            </div>

            {/* Orders List */}
            <div style={{ padding: '20px' }}>
            {currentItems.length === 0 ? (
              <div style={{ padding: '32px', textAlign: 'center', color: '#6b7280' }}>No orders match your filters.</div>
            ) : currentItems.map((order) => {
              // Calculate Totals
              let totalBoxes = 0;
              let totalAmount = 0;
              order.items.forEach((item: any) => {
                let qty = 0;
                if (order.status === 'EXECUTED') {
                  qty = item.executed_qty || 0;
                } else if (executingOrderId === order.order_id) {
                  qty = executionQuantities[item.order_item_id] !== undefined 
                        ? executionQuantities[item.order_item_id] 
                        : Math.min(item.requested_qty, item.current_stock || 0);
                } else {
                  qty = item.requested_qty || 0;
                }
                totalBoxes += qty;
                totalAmount += (qty * item.price_at_order);
              });

              return (
              <div key={order.order_id} style={{ border: '1px solid var(--border-color)', borderRadius: '8px', marginBottom: '20px', padding: '20px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                  <div>
                    <h3 style={{ margin: 0, color: 'var(--text-main)' }}>Order #{order.order_id}</h3>
                    <p style={{ margin: '4px 0 0 0', color: 'var(--text-muted)', fontSize: '14px' }}>
                      By: <strong>{order.distributor_name}</strong> ({order.distributor_phone}) <br/>
                      Date: {new Date(order.order_date).toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <span style={{ 
                      padding: '6px 12px', borderRadius: '20px', fontSize: '13px', fontWeight: 600,
                      backgroundColor: order.status === 'PENDING' ? '#fef3c7' : '#d1fae5',
                      color: order.status === 'PENDING' ? '#d97706' : '#059669'
                    }}>
                      {order.status}
                    </span>
                  </div>
                </div>

                <table className="data-table" style={{ marginBottom: '16px' }}>
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Requested Qty</th>
                      <th>Available Stock</th>
                      <th>Price</th>
                      {executingOrderId === order.order_id && <th>Execute Qty</th>}
                      {order.status === 'EXECUTED' && <th>Executed Qty</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item: any) => {
                      const maxQty = item.current_stock !== undefined ? item.current_stock : 0;
                      return (
                        <tr key={item.order_item_id}>
                          <td>{item.product_name} - {item.pack_size}</td>
                          <td style={{ fontWeight: 'bold' }}>{item.requested_qty}</td>
                          <td style={{ color: maxQty < item.requested_qty ? '#ef4444' : '#059669', fontWeight: 500 }}>
                            {maxQty}
                          </td>
                          <td>₹{item.price_at_order}</td>
                          
                          {executingOrderId === order.order_id && (
                            <td>
                              <input 
                                type="number" 
                                style={{ width: '80px', padding: '6px', border: '1px solid #e5e7eb', borderRadius: '4px', outlineColor: 'var(--primary)' }}
                                min="0"
                                max={maxQty}
                                value={executionQuantities[item.order_item_id] !== undefined ? executionQuantities[item.order_item_id] : Math.min(item.requested_qty, maxQty)}
                                onChange={(e) => {
                                  let val = parseInt(e.target.value);
                                  if (isNaN(val)) val = 0;
                                  if (val > maxQty) {
                                    alert(`Cannot execute more than available stock (${maxQty})`);
                                    val = maxQty;
                                  }
                                  handleQtyChange(item.order_item_id, val.toString());
                                }}
                              />
                            </td>
                          )}

                          {order.status === 'EXECUTED' && (
                            <td style={{ fontWeight: 'bold', color: '#059669' }}>{item.executed_qty}</td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                  <tfoot>
                    <tr style={{ background: '#f8fafc', borderTop: '2px solid var(--border-color)' }}>
                      <td style={{ textAlign: 'right', fontWeight: 'bold', color: '#475569', padding: '12px' }}>
                        Order Summary:
                      </td>
                      <td style={{ fontWeight: 'bold', color: order.status === 'PENDING' && executingOrderId !== order.order_id ? '#0f172a' : '#9ca3af', padding: '12px' }}>
                        {order.status === 'PENDING' && executingOrderId !== order.order_id ? totalBoxes : '-'}
                      </td>
                      <td></td>
                      <td style={{ fontWeight: 'bold', color: '#10b981', fontSize: '15px', padding: '12px' }}>
                        ₹{totalAmount.toFixed(2)}
                      </td>
                      {(executingOrderId === order.order_id || order.status === 'EXECUTED') && (
                        <td style={{ fontWeight: 'bold', color: '#0f172a', padding: '12px' }}>
                          {totalBoxes}
                        </td>
                      )}
                    </tr>
                  </tfoot>
                </table>

                {order.status === 'EXECUTED' && (
                  <div style={{ marginTop: '16px', background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                  </div>
                )}

                {order.status === 'PENDING' && (
                  <div style={{ marginTop: '16px' }}>
                    {executingOrderId === order.order_id ? (
                      <div style={{ background: '#f8fafc', padding: '16px', borderRadius: '8px', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
                        <h4 style={{ margin: '0 0 12px 0', color: '#0f172a' }}>Billing Adjustments</h4>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 2fr', gap: '16px', alignItems: 'end' }}>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Wallet Credit to Apply</label>
                            <input 
                              type="number" 
                              value={creditApplied} 
                              readOnly
                              disabled
                              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px', background: '#f1f5f9', color: '#64748b', cursor: 'not-allowed' }}
                            />
                            {order.apply_wallet && <div style={{ fontSize: '11px', color: '#059669', marginTop: '4px' }}>Distributor requested wallet discount</div>}
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Extra Discount (₹)</label>
                            <input 
                              type="number" 
                              value={extraDiscount} 
                              onChange={e => setExtraDiscount(parseFloat(e.target.value) || 0)}
                              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                          </div>
                          <div>
                            <label style={{ display: 'block', fontSize: '12px', color: '#64748b', marginBottom: '4px' }}>Discount Reason</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Free Delivery"
                              value={discountReason} 
                              onChange={e => setDiscountReason(e.target.value)}
                              style={{ width: '100%', padding: '8px', border: '1px solid #cbd5e1', borderRadius: '6px' }}
                            />
                          </div>
                        </div>
                        
                        <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px dashed #cbd5e1', display: 'flex', justifyContent: 'flex-end', alignItems: 'center', gap: '16px' }}>
                          <div style={{ fontSize: '14px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Final Payable:</div>
                          <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>
                            {(creditApplied > 0 || extraDiscount > 0) && (
                              <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: '16px', marginRight: '12px' }}>
                                ₹{totalAmount.toFixed(2)}
                              </span>
                            )}
                            ₹{Math.max(0, totalAmount - (creditApplied || 0) - (extraDiscount || 0)).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    ) : null}
                    
                    <div style={{ textAlign: 'right' }}>
                      {executingOrderId === order.order_id ? (
                        <>
                          <button className="secondary-btn" onClick={() => {
                            setExecutingOrderId(null);
                            setExtraDiscount(0);
                            setDiscountReason('');
                            setCreditApplied(0);
                          }} style={{ marginRight: '10px' }}>Cancel</button>
                          <button className="primary-btn" onClick={() => handleExecute(order)}>Confirm & Generate Bill</button>
                        </>
                      ) : (
                        <button className="primary-btn" onClick={() => {
                          setExecutingOrderId(order.order_id);
                          const defaultQts: Record<number, number> = {};
                          let orderTotal = 0;
                          order.items.forEach((item: any) => {
                            const maxQty = item.current_stock !== undefined ? item.current_stock : 0;
                            const execQty = Math.min(item.requested_qty, maxQty);
                            defaultQts[item.order_item_id] = execQty;
                            orderTotal += execQty * item.price_at_order;
                          });
                          setExecutionQuantities(defaultQts);
                          
                          if (order.apply_wallet) {
                              const wb = parseFloat(order.wallet_balance || 0);
                              setCreditApplied(Math.min(wb, orderTotal));
                          } else {
                              setCreditApplied(0);
                          }
                        }}>Process Order</button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
            })}
          </div>

          {/* Pagination */}
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
        )}
      </div>
    </div>
  );
};

export default AdminOrders;
