import { useState, useEffect } from 'react';
import axios from 'axios';
import { X, Printer } from 'lucide-react';

interface InvoiceModalProps {
  orderId: number;
  onClose: () => void;
}

const InvoiceModal = ({ orderId, onClose }: InvoiceModalProps) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoiceDetail();
  }, [orderId]);

  const fetchInvoiceDetail = async () => {
    try {
      const response = await axios.get(`http://localhost:5001/api/ledger/invoice/${orderId}`);
      setData(response.data);
    } catch (err) {
      setError('Invoice not generated yet or failed to fetch');
    } finally {
      setLoading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="modal-overlay" style={{
      position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
      background: 'rgba(0, 0, 0, 0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 1000, padding: '20px'
    }}>
      <div style={{
        background: '#fff', borderRadius: '12px', width: '100%', maxWidth: '800px',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
      }} className="printable-invoice">

        {/* Header Actions (Hidden when printing) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button onClick={handlePrint} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#eff6ff', color: 'var(--primary)', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
              <Printer size={16} /> Print
            </button>
            <button onClick={onClose} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f1f5f9', color: '#64748b', border: 'none', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}>
              <X size={16} /> Close
            </button>
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '40px', textAlign: 'center' }}>Loading invoice...</div>
        ) : error ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#ef4444' }}>{error}</div>
        ) : data ? (
          <div style={{ padding: '40px' }} id="invoice-content">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '24px', marginBottom: '32px' }}>
              <div>
                <h1 style={{ margin: '0 0 8px', color: 'var(--primary)', fontSize: '28px' }}>INVOICE</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Invoice #: <strong style={{ color: '#0f172a' }}>{data.invoice.invoice_number}</strong></p>
                <p style={{ margin: '4px 0 0', color: '#64748b', fontSize: '14px' }}>Date: <strong style={{ color: '#0f172a' }}>{new Date(data.invoice.created_at).toLocaleDateString()}</strong></p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <img src="/logo.png" alt="Anand DMS" style={{ height: '80px', objectFit: 'contain', marginBottom: '8px' }} />
                <h2 style={{ margin: '0 0 4px', fontSize: '20px' }}>Anand Enterprises</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '14px' }}>Super Distributor</p>
              </div>
            </div>

            <div style={{ marginBottom: '32px' }}>
              <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#64748b', letterSpacing: '0.5px', marginBottom: '8px' }}>Bill To:</h3>
              <h2 style={{ margin: '0 0 4px', fontSize: '18px' }}>{data.invoice.firm_name}</h2>
              <p style={{ margin: 0, color: '#475569', fontSize: '14px' }}>Phone: {data.invoice.phone_number}</p>
              <p style={{ margin: '4px 0 0', color: '#475569', fontSize: '14px' }}>GST: {data.invoice.gst_number || 'N/A'}</p>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '32px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontSize: '13px' }}>Item Description</th>
                  <th style={{ padding: '12px', textAlign: 'left', color: '#475569', fontSize: '13px' }}>Pack Size</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontSize: '13px' }}>Qty</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontSize: '13px' }}>Rate</th>
                  <th style={{ padding: '12px', textAlign: 'right', color: '#475569', fontSize: '13px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '12px', fontWeight: 500 }}>{item.product_name}</td>
                    <td style={{ padding: '12px', color: '#475569' }}>{item.pack_size}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>{item.executed_qty}</td>
                    <td style={{ padding: '12px', textAlign: 'right' }}>₹{item.price_at_order}</td>
                    <td style={{ padding: '12px', textAlign: 'right', fontWeight: 500 }}>₹{item.item_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '300px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569' }}>Subtotal</span>
                  <span style={{ fontWeight: 500 }}>₹{data.invoice.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569' }}>CGST (9%)</span>
                  <span>₹{data.invoice.cgst_amount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '2px solid #cbd5e1' }}>
                  <span style={{ color: '#475569' }}>SGST (9%)</span>
                  <span>₹{data.invoice.sgst_amount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '16px 0', fontSize: '20px', fontWeight: 'bold' }}>
                  <span>Grand Total</span>
                  <span style={{ color: '#059669' }}>₹{data.invoice.grand_total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '48px', paddingTop: '24px', borderTop: '1px solid #f1f5f9', textAlign: 'center', color: '#94a3b8', fontSize: '13px' }}>
              <p style={{ margin: 0 }}>This is a computer generated invoice.</p>
              <p style={{ margin: '4px 0 0' }}>Thank you for your business!</p>
            </div>
          </div>
        ) : null}
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-invoice, .printable-invoice * { visibility: visible; }
          
          /* Force page and content to flow naturally and remove scrollbars */
          .modal-overlay {
            position: absolute !important;
            top: 0 !important;
            left: 0 !important;
            padding: 0 !important;
            margin: 0 !important;
            background: transparent !important;
            display: block !important;
            overflow: visible !important;
          }

          .printable-invoice { 
            position: absolute !important; 
            left: 0 !important; 
            top: 0 !important; 
            width: 100% !important; 
            max-width: none !important;
            max-height: none !important;
            overflow: visible !important;
            box-shadow: none !important; 
            border-radius: 0 !important; 
            padding: 0 !important;
            margin: 0 !important;
          }
          
          .no-print { display: none !important; }
        }
      `}</style>
    </div>
  );
};

export default InvoiceModal;
