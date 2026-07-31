import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import InvoiceModal from '../components/InvoiceModal';
import { Search, Filter } from 'lucide-react';

const AdminLedger = () => {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);

  // Filter & Pagination State
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFilter, setDateFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInvoices();
  }, []);

  const fetchInvoices = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/ledger');
      setInvoices(response.data);
    } catch (err) {
      setError('Failed to fetch ledger');
    } finally {
      setLoading(false);
    }
  };

  const filteredInvoices = useMemo(() => invoices.filter(inv => {
    const matchesSearch = !searchQuery ||
      inv.firm_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesDate = !dateFilter ||
      new Date(inv.created_at).toLocaleDateString('en-CA') === dateFilter;
    return matchesSearch && matchesDate;
  }), [invoices, searchQuery, dateFilter]);

  const totalPages = Math.ceil(filteredInvoices.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInvoices.slice(indexOfFirstItem, indexOfLastItem);

  useEffect(() => { setCurrentPage(1); }, [searchQuery, dateFilter]);

  // Summary totals from filtered invoices
  const totalRevenue = filteredInvoices.reduce((sum, inv) => sum + (inv.grand_total || 0), 0);
  const totalGst = filteredInvoices.reduce((sum, inv) => sum + (inv.cgst_amount || 0) + (inv.sgst_amount || 0), 0);

  return (
    <div>

      {error && <div className="error-message">{error}</div>}

      {/* Summary Cards */}
      {!loading && invoices.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
          <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Invoices</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: 'var(--text-main)' }}>{filteredInvoices.length}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total Revenue</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#059669' }}>₹{totalRevenue.toFixed(2)}</div>
          </div>
          <div style={{ background: '#fff', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '20px' }}>
            <div style={{ fontSize: '13px', color: 'var(--text-muted)', marginBottom: '6px' }}>Total GST Collected</div>
            <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#2563eb' }}>₹{totalGst.toFixed(2)}</div>
          </div>
        </div>
      )}

      <div className="data-card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading invoices...</div>
        ) : invoices.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No invoices generated yet. Execute an order to generate one.
          </div>
        ) : (
          <div>
            {/* Filter Bar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

                {/* Search */}
                <div style={{ position: 'relative', width: '280px' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by firm or invoice #..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '9px 12px 9px 36px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    onFocus={e => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={e => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>

                {/* Date Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} color="#64748b" />
                  <input
                    type="date"
                    value={dateFilter}
                    onChange={e => setDateFilter(e.target.value)}
                    style={{ padding: '9px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  />
                </div>

                {/* Clear Filters */}
                {(searchQuery || dateFilter) && (
                  <button
                    onClick={() => { setSearchQuery(''); setDateFilter(''); }}
                    style={{ padding: '6px 12px', fontSize: '13px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>

              <span style={{ fontSize: '14px', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                Showing {filteredInvoices.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredInvoices.length)} of {filteredInvoices.length} entries
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Invoice #</th>
                    <th>Date</th>
                    <th>Distributor Firm</th>
                    <th>Subtotal</th>
                    <th>GST (18%)</th>
                    <th>Grand Total</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? currentItems.map((inv) => (
                    <tr key={inv.invoice_number}>
                      <td>
                        <button 
                          onClick={() => setSelectedOrderId(inv.order_id)}
                          style={{ background: 'none', border: 'none', padding: 0, fontWeight: 600, color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline' }}
                        >
                          {inv.invoice_number}
                        </button>
                      </td>
                      <td>{new Date(inv.created_at).toLocaleDateString()}</td>
                      <td style={{ fontWeight: 500 }}>{inv.firm_name}</td>
                      <td>₹{inv.subtotal}</td>
                      <td>₹{(inv.cgst_amount + inv.sgst_amount).toFixed(2)}</td>
                      <td style={{ fontWeight: 'bold', color: '#059669' }}>₹{inv.grand_total}</td>
                    </tr>
                  )) : (
                    <tr>
                      <td colSpan={6} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No invoices match your filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center', background: '#f8fafc', borderBottomLeftRadius: '12px', borderBottomRightRadius: '12px' }}>
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', marginRight: 'auto' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                  style={{ padding: '8px 16px', background: currentPage === 1 ? '#f3f4f6' : '#fff', color: currentPage === 1 ? '#9ca3af' : 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: currentPage === 1 ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                  Previous
                </button>
                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                  style={{ padding: '8px 16px', background: currentPage === totalPages ? '#f3f4f6' : '#fff', color: currentPage === totalPages ? '#9ca3af' : 'var(--text-main)', border: '1px solid var(--border-color)', borderRadius: '6px', cursor: currentPage === totalPages ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {selectedOrderId && (
        <InvoiceModal orderId={selectedOrderId} onClose={() => setSelectedOrderId(null)} />
      )}
    </div>
  );
};

export default AdminLedger;
