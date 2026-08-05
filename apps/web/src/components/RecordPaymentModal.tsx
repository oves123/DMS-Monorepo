import { useState } from 'react';
import api from '../lib/api';
import { X, Check } from 'lucide-react';

interface RecordPaymentModalProps {
  invoice: any;
  onClose: () => void;
  onSuccess: () => void;
}

const RecordPaymentModal = ({ invoice, onClose, onSuccess }: RecordPaymentModalProps) => {
  const [amount, setAmount] = useState<string>('');
  const [paymentMode, setPaymentMode] = useState<string>('CASH');
  const [referenceNo, setReferenceNo] = useState<string>('');
  const [paymentDate, setPaymentDate] = useState<string>(new Date().toISOString().slice(0, 10));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const pendingAmount = invoice.grand_total - (invoice.paid_amount || 0);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (Number(amount) <= 0) {
      return setError('Amount must be greater than 0');
    }
    if (Number(amount) > pendingAmount) {
      return setError('Amount cannot exceed pending balance (overpayments not allowed)');
    }

    setLoading(true);
    try {
      await api.post('/api/ledger/payment/record', {
        invoice_id: invoice.invoice_id,
        amount: Number(amount),
        payment_mode: paymentMode,
        reference_no: referenceNo,
        payment_date: paymentDate
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to record payment');
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
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '400px',
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.25)'
      }}>
        <div style={{ padding: '20px', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2 style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>Record Payment</h2>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {error && <div style={{ padding: '10px', background: '#fee2e2', color: '#991b1b', borderRadius: '6px', marginBottom: '16px', fontSize: '13px' }}>{error}</div>}

          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '13px', background: '#f8fafc', padding: '12px', borderRadius: '6px' }}>
            <span style={{ color: '#475569' }}>Invoice #</span>
            <span style={{ fontWeight: 'bold' }}>{invoice.invoice_number}</span>
          </div>

          <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', fontSize: '14px', background: '#fef3c7', padding: '12px', borderRadius: '6px', color: '#b45309' }}>
            <span>Pending Balance</span>
            <span style={{ fontWeight: 'bold' }}>₹{pendingAmount.toFixed(2)}</span>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#334155' }}>Amount Paid (₹)</label>
            <input 
              type="number" 
              step="0.01" 
              required
              max={pendingAmount}
              value={amount} 
              onChange={e => setAmount(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
              autoFocus
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#334155' }}>Payment Mode</label>
            <select 
              value={paymentMode} 
              onChange={e => setPaymentMode(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none', background: '#fff' }}
            >
              <option value="CASH">Cash</option>
              <option value="UPI">UPI / GPay</option>
              <option value="NET_BANKING">Net Banking</option>
              <option value="CHEQUE">Cheque</option>
              <option value="OTHER">Other</option>
            </select>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#334155' }}>Reference No / Txn ID (Optional)</label>
            <input 
              type="text" 
              value={referenceNo} 
              onChange={e => setReferenceNo(e.target.value)}
              placeholder="e.g. UTR123456789"
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={{ display: 'block', marginBottom: '6px', fontSize: '13px', fontWeight: 500, color: '#334155' }}>Payment Date</label>
            <input 
              type="date" 
              required
              value={paymentDate} 
              onChange={e => setPaymentDate(e.target.value)}
              style={{ width: '100%', padding: '10px', borderRadius: '6px', border: '1px solid #cbd5e1', outline: 'none' }}
            />
          </div>

          <button 
            type="submit" 
            disabled={loading}
            style={{ 
              width: '100%', padding: '12px', background: 'var(--primary)', color: '#fff', 
              border: 'none', borderRadius: '6px', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
            }}
          >
            {loading ? 'Recording...' : <><Check size={18} /> Record Payment</>}
          </button>
        </form>
      </div>
    </div>
  );
};

export default RecordPaymentModal;
