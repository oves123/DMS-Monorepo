import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { Download } from 'lucide-react';

const DistributorClaims = () => {
  const [creditNotes, setCreditNotes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const user = JSON.parse(localStorage.getItem('dms_user') || '{}');

  useEffect(() => {
    fetchCreditNotes();
  }, []);

  const fetchCreditNotes = async () => {
    try {
      const response = await api.get(`/api/ledger/credit-note/distributor/${user.user_id}`);
      setCreditNotes(response.data);
    } catch (err) {
      setError('Failed to fetch credit notes');
    } finally {
      setLoading(false);
    }
  };

  const handleDownload = async (cnId: number, cnNumber: string) => {
    try {
      const res = await api.get(`/api/ledger/credit-note/${cnId}/download`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${cnNumber}.pdf`);
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      console.error("Download failed", err);
      alert("Failed to download Credit Note.");
    }
  };

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">My Claims & Credit Notes</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="data-card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading credit notes...</div>
        ) : creditNotes.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No credit notes issued yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th>Credit Note #</th>
                  <th>Against Invoice</th>
                  <th>Date Issued</th>
                  <th>Amount (Credit)</th>
                  <th>Status</th>
                  <th style={{ textAlign: 'right' }}>Action</th>
                </tr>
              </thead>
              <tbody>
                {creditNotes.map((cn) => (
                  <tr key={cn.credit_note_id}>
                    <td style={{ fontWeight: 'bold' }}>{cn.credit_note_number}</td>
                    <td>{cn.invoice_number}</td>
                    <td>{new Date(cn.created_at).toLocaleDateString()}</td>
                    <td style={{ fontWeight: 'bold', color: '#059669' }}>₹{cn.amount.toFixed(2)}</td>
                    <td>
                      <span style={{
                        padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600,
                        background: cn.is_paid_out ? '#e0e7ff' : '#dcfce7',
                        color: cn.is_paid_out ? '#4f46e5' : '#166534'
                      }}>
                        {cn.is_paid_out ? `Refunded via ${cn.payment_mode}` : 'Added to Wallet'}
                      </span>
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <button 
                        onClick={() => handleDownload(cn.credit_note_id, cn.credit_note_number)}
                        style={{
                          background: '#fff',
                          border: '1px solid #cbd5e1',
                          color: '#334155',
                          padding: '6px 12px',
                          borderRadius: '6px',
                          fontSize: '13px',
                          fontWeight: 600,
                          cursor: 'pointer',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Download size={14} /> 
                        Download PDF
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default DistributorClaims;
