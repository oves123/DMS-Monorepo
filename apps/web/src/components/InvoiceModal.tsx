import { useState, useEffect } from 'react';
import api from '../lib/api';
import { X, Printer } from 'lucide-react';

interface InvoiceModalProps {
  orderId: number;
  onClose: () => void;
}

const InvoiceModal = ({ orderId, onClose }: InvoiceModalProps) => {
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchInvoiceDetail();
  }, [orderId]);

  const fetchInvoiceDetail = async () => {
    try {
      const response = await api.get(`/api/ledger/invoice/${orderId}`);
      setData(response.data);
      
      try {
        const settingsRes = await api.get('/api/settings/company');
        setSettings(settingsRes.data);
      } catch (e) {
        console.error('Failed to fetch company settings');
      }
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
          <div style={{ padding: '24px' }} id="invoice-content" className="invoice-container">
            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '2px solid #f1f5f9', paddingBottom: '16px', marginBottom: '20px' }}>
              <div>
                <h1 style={{ margin: '0 0 4px', color: 'var(--primary)', fontSize: '24px' }}>INVOICE</h1>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Invoice #: <strong style={{ color: '#0f172a' }}>{data.invoice.invoice_number}</strong></p>
                <p style={{ margin: '2px 0 0', color: '#64748b', fontSize: '13px' }}>Date: <strong style={{ color: '#0f172a' }}>{new Date(data.invoice.created_at).toLocaleDateString()}</strong></p>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <img src="/logo.png" alt="Anand DMS" style={{ height: '60px', objectFit: 'contain', marginBottom: '4px' }} />
                <h2 style={{ margin: '0 0 2px', fontSize: '16px' }}>Anand Enterprises</h2>
                <p style={{ margin: 0, color: '#64748b', fontSize: '13px' }}>Super Distributor</p>
              </div>
            </div>

            <div style={{ marginBottom: '20px', background: '#f8fafc', padding: '12px', borderRadius: '8px', border: '1px solid #cbd5e1' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#0f172a', fontWeight: 'bold', marginBottom: '8px' }}>Billing Party Details: Anand Enterprises</h3>
                  {/* Admin Details can be added here later */}
                </div>
                <div>
                  <h3 style={{ fontSize: '14px', textTransform: 'uppercase', color: '#0f172a', fontWeight: 'bold', marginBottom: '8px' }}>Shipping Party Details:</h3>
                  <table style={{ width: '100%', fontSize: '13px', color: '#475569' }}>
                    <tbody>
                      <tr>
                        <td style={{ padding: '4px 0', fontWeight: 600, width: '120px', verticalAlign: 'top' }}>PARTY NAME:</td>
                        <td style={{ padding: '4px 0', verticalAlign: 'top', color: '#0f172a', fontWeight: 'bold' }}>{data.invoice.firm_name}</td>
                      </tr>
                      {data.invoice.address && (
                        <tr>
                          <td style={{ padding: '4px 0', fontWeight: 600, verticalAlign: 'top' }}>ADDRESS:</td>
                          <td style={{ padding: '4px 0', verticalAlign: 'top' }}>{data.invoice.address}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ padding: '4px 0', fontWeight: 600 }}>GST NO:</td>
                        <td style={{ padding: '4px 0' }}>{data.invoice.gst_number || 'N/A'}</td>
                      </tr>
                      {data.invoice.owner_name && (
                        <tr>
                          <td style={{ padding: '4px 0', fontWeight: 600 }}>ASM/SO NAME:</td>
                          <td style={{ padding: '4px 0' }}>{data.invoice.owner_name}</td>
                        </tr>
                      )}
                      <tr>
                        <td style={{ padding: '4px 0', fontWeight: 600 }}>CONTACT NO:</td>
                        <td style={{ padding: '4px 0' }}>{data.invoice.phone_number}</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '20px' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #cbd5e1' }}>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#475569', fontSize: '13px' }}>Item Description</th>
                  <th style={{ padding: '8px', textAlign: 'left', color: '#475569', fontSize: '13px' }}>Pack Size</th>
                  <th style={{ padding: '8px', textAlign: 'right', color: '#475569', fontSize: '13px' }}>Qty</th>
                  <th style={{ padding: '8px', textAlign: 'right', color: '#475569', fontSize: '13px' }}>Rate</th>
                  <th style={{ padding: '8px', textAlign: 'right', color: '#475569', fontSize: '13px' }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {data.items.map((item: any, idx: number) => (
                  <tr key={idx} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '8px', fontWeight: 500, fontSize: '13px' }}>{item.product_name}</td>
                    <td style={{ padding: '8px', color: '#475569', fontSize: '13px' }}>{item.pack_size}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '13px' }}>{item.executed_qty}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontSize: '13px' }}>₹{item.price_at_order}</td>
                    <td style={{ padding: '8px', textAlign: 'right', fontWeight: 500, fontSize: '13px' }}>₹{item.item_total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '280px', fontSize: '13px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569' }}>Subtotal</span>
                  <span style={{ fontWeight: 500 }}>₹{data.invoice.subtotal.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                  <span style={{ color: '#475569' }}>CGST (9%)</span>
                  <span>₹{data.invoice.cgst_amount.toFixed(2)}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '2px solid #cbd5e1' }}>
                  <span style={{ color: '#475569' }}>SGST (9%)</span>
                  <span>₹{data.invoice.sgst_amount.toFixed(2)}</span>
                </div>
                {data.invoice.extra_discount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569' }}>Discount {data.invoice.discount_reason ? `(${data.invoice.discount_reason})` : ''}</span>
                    <span style={{ color: '#ef4444' }}>- ₹{data.invoice.extra_discount.toFixed(2)}</span>
                  </div>
                )}
                {data.invoice.credit_applied > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '4px 0', borderBottom: '1px solid #f1f5f9' }}>
                    <span style={{ color: '#475569' }}>Wallet Credit Applied</span>
                    <span style={{ color: '#ef4444' }}>- ₹{data.invoice.credit_applied.toFixed(2)}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', fontSize: '16px', fontWeight: 'bold' }}>
                  <span>Grand Total</span>
                  <span style={{ color: '#059669' }}>
                    ₹{(data.invoice.grand_total || 0).toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '2px solid #f1f5f9' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '24px' }}>
                <div style={{ flex: 1, paddingRight: '20px' }}>
                  <h3 style={{ fontSize: '13px', color: '#0f172a', marginBottom: '8px' }}>Payment Instructions (Bank Transfer)</h3>
                  {settings ? (
                    <div style={{ fontSize: '12px', color: '#475569', lineHeight: '1.4' }}>
                      <p style={{ margin: '0 0 2px' }}><strong>A/C Name:</strong> {settings.account_name}</p>
                      <p style={{ margin: '0 0 2px' }}><strong>A/C No:</strong> {settings.account_no}</p>
                      <p style={{ margin: '0 0 2px' }}><strong>Bank:</strong> {settings.bank_name}</p>
                      <p style={{ margin: '0 0 2px' }}><strong>IFSC:</strong> {settings.ifsc_code}</p>
                      <p style={{ margin: '0 0 2px' }}><strong>Branch:</strong> {settings.branch}</p>
                      <p style={{ margin: 0 }}><strong>Email:</strong> {settings.email}</p>
                    </div>
                  ) : (
                    <div style={{ fontSize: '12px', color: '#475569' }}>Bank details not configured.</div>
                  )}
                </div>
                
                <div style={{ textAlign: 'center', width: '160px' }}>
                  <h3 style={{ fontSize: '13px', color: '#0f172a', marginBottom: '6px' }}>Scan & Pay (UPI)</h3>
                  <div style={{ 
                    border: '1px solid #cbd5e1', padding: '4px', borderRadius: '8px', display: 'inline-block',
                    background: '#fff'
                  }}>
                    <img 
                      src={`${import.meta.env.VITE_API_URL}/api/settings/company/qr`}
                      alt="UPI QR Code" 
                      style={{ width: '90px', height: '90px', objectFit: 'contain' }}
                      onError={(e) => {
                        e.currentTarget.style.display = 'none';
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div style={{ marginTop: '16px', paddingTop: '12px', borderTop: '1px solid #f1f5f9', textAlign: 'center', color: '#94a3b8', fontSize: '11px' }}>
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

          @page {
            margin: 5mm; /* Remove default browser margins to save space */
          }
          
          .invoice-container {
            padding: 10px !important;
          }
        }
      `}</style>
    </div>
  );
};

export default InvoiceModal;
