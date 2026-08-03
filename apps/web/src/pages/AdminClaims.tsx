import { useState, useEffect } from 'react';
import axios from 'axios';
import { Search, CheckCircle, XCircle, Download, Calendar, ArrowUpDown } from 'lucide-react';
import { useToast } from '../components/Toast';
import Papa from 'papaparse';

const AdminClaims = () => {
  const { showToast } = useToast();
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'APPROVED' | 'REJECTED'>('ALL');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [sortOrder, setSortOrder] = useState<'ASC' | 'DESC' | null>(null);
  const [photoModal, setPhotoModal] = useState({ isOpen: false, url: '' });

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/claims');
      setClaims(response.data);
    } catch (err) {
      setError('Failed to fetch claims');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStatus = async (claimId: number, status: 'APPROVED' | 'REJECTED', amount?: number) => {
    try {
      await axios.put(`http://localhost:5001/api/claims/${claimId}/status`, { status, amount });
      showToast(`Claim ${status.toLowerCase()} successfully!`, 'success');
      fetchClaims();
    } catch (err) {
      showToast('Failed to update claim status', 'error');
    }
  };

  // 1. Calculate Metrics
  const pendingCount = claims.filter(c => c.status === 'PENDING').length;
  const approvedAmount = claims.filter(c => c.status === 'APPROVED').reduce((sum, c) => sum + (c.claim_amount || 0), 0);
  const rejectedCount = claims.filter(c => c.status === 'REJECTED').length;

  // 2. Apply Filters & Sorting
  let processedClaims = claims.filter(c => {
    const matchesSearch = !searchQuery || 
      c.distributor_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.reason?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === 'ALL' || c.status === statusFilter;
    
    const matchesDate = (!dateRange.start || new Date(c.created_at) >= new Date(dateRange.start)) &&
                        (!dateRange.end || new Date(c.created_at) <= new Date(new Date(dateRange.end).setHours(23, 59, 59)));
    
    return matchesSearch && matchesStatus && matchesDate;
  });

  if (sortOrder) {
    processedClaims.sort((a, b) => {
      if (sortOrder === 'DESC') return (b.claim_amount || 0) - (a.claim_amount || 0);
      return (a.claim_amount || 0) - (b.claim_amount || 0);
    });
  }

  // 3. Export to CSV
  const handleExportCSV = () => {
    const exportData = processedClaims.map(c => ({
      'Claim ID': c.claim_id,
      'Order ID': c.order_id,
      'Distributor': c.distributor_name,
      'Product': c.product_name,
      'Quantity': c.quantity,
      'Reason': c.reason,
      'Amount': c.claim_amount,
      'Status': c.status,
      'Date': new Date(c.created_at).toLocaleDateString()
    }));
    const csv = Papa.unparse(exportData);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `claims_report_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  const handleSortAmount = () => {
    if (!sortOrder) setSortOrder('DESC');
    else if (sortOrder === 'DESC') setSortOrder('ASC');
    else setSortOrder(null);
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Defect Claims & Credit Notes</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px', marginBottom: '24px' }}>
        <div className="data-card" style={{ padding: '24px', borderLeft: '4px solid #f59e0b' }}>
          <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>Pending Claims Count</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginTop: '8px' }}>{pendingCount}</div>
          <div style={{ color: '#f59e0b', fontSize: '13px', marginTop: '4px' }}>Requires review</div>
        </div>
        <div className="data-card" style={{ padding: '24px', borderLeft: '4px solid #10b981' }}>
          <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>Total Credit Issued</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginTop: '8px' }}>₹{approvedAmount.toFixed(2)}</div>
          <div style={{ color: '#10b981', fontSize: '13px', marginTop: '4px' }}>Lifetime approved</div>
        </div>
        <div className="data-card" style={{ padding: '24px', borderLeft: '4px solid #ef4444' }}>
          <div style={{ color: '#6b7280', fontSize: '14px', fontWeight: 500 }}>Total Claims Rejected</div>
          <div style={{ fontSize: '28px', fontWeight: 'bold', color: '#111827', marginTop: '8px' }}>{rejectedCount}</div>
          <div style={{ color: '#ef4444', fontSize: '13px', marginTop: '4px' }}>Lifetime rejected</div>
        </div>
      </div>

      <div className="data-card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading claims...</div>
        ) : claims.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No claims filed yet.
          </div>
        ) : (
          <div>
            {/* Toolbar: Filters & Export */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexWrap: 'wrap', gap: '16px', justifyContent: 'space-between', alignItems: 'center' }}>
              
              <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                {/* Status Tabs */}
                {['ALL', 'PENDING', 'APPROVED', 'REJECTED'].map(status => (
                  <button 
                    key={status}
                    onClick={() => setStatusFilter(status as any)}
                    style={{ 
                      padding: '6px 16px', 
                      borderRadius: '20px',
                      fontSize: '13px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      border: statusFilter === status ? 'none' : '1px solid var(--border-color)',
                      background: statusFilter === status ? '#2563eb' : '#fff',
                      color: statusFilter === status ? '#fff' : '#6b7280'
                    }}>
                    {status}
                  </button>
                ))}
              </div>

              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '250px' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                    <Search size={16} />
                  </div>
                  <input
                    type="text"
                    placeholder="Search by distributor or reason..."
                    value={searchQuery}
                    onChange={e => setSearchQuery(e.target.value)}
                    style={{ padding: '8px 12px 8px 36px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px' }}
                  />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', background: '#f9fafb', padding: '4px 8px', borderRadius: '8px', border: '1px solid var(--border-color)' }}>
                  <Calendar size={16} color="#6b7280" />
                  <input type="date" value={dateRange.start} onChange={e => setDateRange({...dateRange, start: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#4b5563' }} />
                  <span style={{ color: '#9ca3af' }}>-</span>
                  <input type="date" value={dateRange.end} onChange={e => setDateRange({...dateRange, end: e.target.value})} style={{ border: 'none', background: 'transparent', outline: 'none', fontSize: '13px', color: '#4b5563' }} />
                </div>

                <button onClick={handleExportCSV} style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 16px', background: '#10b981', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 500, fontSize: '14px' }}>
                  <Download size={16} /> Export CSV
                </button>
              </div>
            </div>

            <table className="data-table">
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Distributor</th>
                  <th>Product</th>
                  <th>Claim Qty</th>
                  <th>Reason</th>
                  <th onClick={handleSortAmount} style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }} title="Click to sort">
                    Amount (Credit)
                    <ArrowUpDown size={14} color={sortOrder ? '#2563eb' : '#9ca3af'} />
                  </th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {processedClaims.map((claim) => (
                  <tr key={claim.claim_id}>
                    <td>#{claim.claim_id}</td>
                    <td>
                      <strong>{claim.distributor_name}</strong><br/>
                      <span style={{ color: '#64748b', fontSize: '13px' }}>Order #{claim.order_id}</span>
                    </td>
                    <td>{claim.product_name} - {claim.pack_size}</td>
                    <td style={{ fontWeight: 'bold' }}>{claim.quantity}</td>
                    <td>
                      {claim.reason}
                      {claim.has_image === 1 && (
                        <div style={{ marginTop: '8px' }}>
                          <button 
                            onClick={() => setPhotoModal({ isOpen: true, url: `http://localhost:5001/api/claims/${claim.claim_id}/image` })}
                            style={{ fontSize: '12px', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', padding: 0 }}
                          >
                            📷 View Photo
                          </button>
                        </div>
                      )}
                    </td>
                    <td style={{ fontWeight: 'bold', color: '#059669' }}>₹{claim.claim_amount.toFixed(2)}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: claim.status === 'PENDING' ? '#fef3c7' : (claim.status === 'APPROVED' ? '#d1fae5' : '#fee2e2'),
                        color: claim.status === 'PENDING' ? '#d97706' : (claim.status === 'APPROVED' ? '#059669' : '#b91c1c')
                      }}>
                        {claim.status}
                      </span>
                    </td>
                    <td>
                      {claim.status === 'PENDING' && (
                        <div style={{ display: 'flex', gap: '8px' }}>
                          <button 
                            onClick={() => handleUpdateStatus(claim.claim_id, 'APPROVED', claim.claim_amount)}
                            style={{ padding: '6px', background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                            <CheckCircle size={14} /> Approve
                          </button>
                          <button 
                            onClick={() => handleUpdateStatus(claim.claim_id, 'REJECTED')}
                            style={{ padding: '6px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', borderRadius: '4px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px' }}>
                            <XCircle size={14} /> Reject
                          </button>
                        </div>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Lightbox Modal */}
      {photoModal.isOpen && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.85)', zIndex: 9999,
          display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px'
        }}>
          <div style={{ position: 'relative', maxWidth: '100%', maxHeight: '100%' }}>
            <button 
              onClick={() => setPhotoModal({ isOpen: false, url: '' })}
              style={{ position: 'absolute', top: '-40px', right: 0, background: 'none', border: 'none', color: '#fff', fontSize: '32px', cursor: 'pointer' }}
            >
              &times;
            </button>
            <img 
              src={photoModal.url} 
              alt="Defect Claim Evidence" 
              style={{ maxWidth: '100%', maxHeight: '90vh', objectFit: 'contain', borderRadius: '8px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }} 
            />
          </div>
        </div>
      )}

    </div>
  );
};

export default AdminClaims;
