import { useState, useEffect } from 'react';
import api from '../lib/api';
import { X } from 'lucide-react';

interface DistributorLedgerModalProps {
  distributorId: number;
  firmName: string;
  onClose: () => void;
}

const DistributorLedgerModal = ({ distributorId, firmName, onClose }: DistributorLedgerModalProps) => {
  const [ledger, setLedger] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchLedger();
  }, [distributorId]);

  const fetchLedger = async () => {
    try {
      const response = await api.get(`/api/ledger/payment/distributor/${distributorId}`);
      setLedger(response.data);
    } catch (err) {
      setError('Failed to fetch ledger details');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1100, padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px',
        maxHeight: '90vh', overflowY: 'auto', display: 'flex', flexDirection: 'column',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div>
            <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Ledger: {firmName}</h2>
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading ledger...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : ledger ? (
          <div style={{ padding: '20px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
              <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '4px' }}>Total Billed</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>₹{(ledger.summary.total_billed || 0).toFixed(2)}</div>
              </div>
              <div style={{ background: '#dcfce7', border: '1px solid #bbf7d0', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#166534', marginBottom: '4px' }}>Total Paid</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#15803d' }}>₹{(ledger.summary.total_paid || 0).toFixed(2)}</div>
              </div>
              <div style={{ background: '#fee2e2', border: '1px solid #fecaca', borderRadius: '8px', padding: '16px' }}>
                <div style={{ fontSize: '13px', color: '#991b1b', marginBottom: '4px' }}>Total Pending</div>
                <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#b91c1c' }}>₹{((ledger.summary.total_billed || 0) - (ledger.summary.total_paid || 0)).toFixed(2)}</div>
              </div>
            </div>

            {ledger.unpaid_invoices.length > 0 && (
              <div style={{ marginBottom: '32px' }}>
                <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '12px' }}>Unpaid Invoices</h3>
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Invoice #</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Date</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Total</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Paid</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Pending</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.unpaid_invoices.map((inv: any) => (
                        <tr key={inv.invoice_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 16px', fontWeight: 500 }}>{inv.invoice_number}</td>
                          <td style={{ padding: '10px 16px' }}>{new Date(inv.created_at).toLocaleDateString()}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right' }}>₹{inv.grand_total}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', color: '#166534' }}>₹{inv.paid_amount || 0}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#b91c1c' }}>₹{(inv.grand_total - (inv.paid_amount || 0)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div>
              <h3 style={{ fontSize: '16px', color: '#0f172a', marginBottom: '12px' }}>Recent Payments</h3>
              {ledger.recent_payments.length === 0 ? (
                <div style={{ color: '#64748b', fontSize: '13px' }}>No payments recorded yet.</div>
              ) : (
                <div style={{ overflowX: 'auto', border: '1px solid #e2e8f0', borderRadius: '8px' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '13px' }}>
                    <thead style={{ background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                      <tr>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Date</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Invoice #</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Mode</th>
                        <th style={{ padding: '10px 16px', textAlign: 'left', fontWeight: 600, color: '#475569' }}>Ref No.</th>
                        <th style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#475569' }}>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {ledger.recent_payments.map((p: any) => (
                        <tr key={p.payment_id} style={{ borderBottom: '1px solid #e2e8f0' }}>
                          <td style={{ padding: '10px 16px' }}>{new Date(p.payment_date).toLocaleDateString()}</td>
                          <td style={{ padding: '10px 16px', fontWeight: 500 }}>{p.invoice_number}</td>
                          <td style={{ padding: '10px 16px' }}>{p.payment_mode}</td>
                          <td style={{ padding: '10px 16px', color: '#64748b' }}>{p.reference_no || '-'}</td>
                          <td style={{ padding: '10px 16px', textAlign: 'right', fontWeight: 600, color: '#166534' }}>₹{p.amount.toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

          </div>
        ) : null}
      </div>
    </div>
  );
};

export default DistributorLedgerModal;
