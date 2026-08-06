import { useState, useEffect } from 'react';
import api from '../lib/api';
import { X, Printer, IndianRupee } from 'lucide-react';
import RecordPaymentModal from './RecordPaymentModal';

interface InvoiceModalProps {
  orderId: number;
  onClose: () => void;
}

const InvoiceModal = ({ orderId, onClose }: InvoiceModalProps) => {
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);

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
        background: '#fff', width: '100%', maxWidth: '800px',
        maxHeight: '90vh', overflowY: 'auto', position: 'relative',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }} className="printable-invoice">
        {/* Header Actions (Hidden when printing) */}
        <div className="no-print" style={{ display: 'flex', justifyContent: 'flex-end', padding: '16px', borderBottom: '1px solid #f1f5f9', position: 'sticky', top: 0, background: '#fff', zIndex: 10 }}>
          <div style={{ display: 'flex', gap: '12px' }}>
            {data && data.invoice.payment_status !== 'PAID' && JSON.parse(localStorage.getItem('dms_user') || '{}').role === 'SD_ADMIN' && (
              <button onClick={() => setShowPaymentModal(true)} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#dcfce7', color: '#166534', border: '1px solid #bbf7d0', borderRadius: '6px', cursor: 'pointer', fontWeight: 600 }}>
                <IndianRupee size={16} /> Record Payment
              </button>
            )}
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
            
            {/* EXCEL INVOICE WRAPPER */}
            <div style={{ 
              border: '2px solid #22c55e', /* Green outer border */
              fontFamily: 'Arial, sans-serif',
              color: '#000',
              fontSize: '12px',
              background: '#fff'
            }}>
              
              {/* Top Bar: TAX INVOICE */}
              <div style={{ 
                borderBottom: '2px solid #22c55e', 
                textAlign: 'center', 
                fontWeight: 'bold', 
                fontSize: '14px', 
                padding: '4px' 
              }}>
                TAX INVOICE
              </div>
              
              {/* Company Details Row */}
              <div style={{ display: 'flex', borderBottom: '2px solid #22c55e' }}>
                <div style={{ flex: 1, padding: '4px 8px', borderRight: '2px solid #22c55e' }}>
                  <h2 style={{ margin: '0 0 2px 0', fontSize: '14px', fontWeight: 'bold' }}>Anand Enterprises</h2>
                  <p style={{ margin: '0 0 2px 0' }}>Address: {settings?.address || 'Behind Sagar Hotel, Vasai East, Vasai Tahashil, Palghar'}</p>
                  <p style={{ margin: '0 0 2px 0' }}>State: Maharashtra</p>
                  <p style={{ margin: '0 0 2px 0' }}>GST NO.: <strong>{settings?.gst_number || ''}</strong></p>
                  <p style={{ margin: '0' }}>FSSAI NO.: <strong>{settings?.fssai_number || ''}</strong></p>
                </div>
                <div style={{ width: '180px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/logo.png" alt="Jolliz Logo" style={{ maxWidth: '120px', maxHeight: '80px', objectFit: 'contain' }} />
                </div>
              </div>
              
              {/* Bill To Details Row */}
              <div style={{ padding: '4px 8px', borderBottom: '2px solid #22c55e' }}>
                <p style={{ margin: '0 0 2px 0' }}><strong>Bill To:</strong> {data.invoice.firm_name}</p>
                {data.invoice.owner_name && (
                  <p style={{ margin: '0 0 2px 0' }}>Owner Name: {data.invoice.owner_name}</p>
                )}
                <p style={{ margin: '0 0 2px 0' }}>Address: {data.invoice.address}</p>
                <p style={{ margin: '0' }}>Place Of Supply: Maharashtra {data.invoice.fssai_number ? `, FSSAI No : ${data.invoice.fssai_number}` : ''}</p>
              </div>
              
              {/* Bill No & Date Row */}
              <div style={{ display: 'flex', borderBottom: '2px solid #22c55e' }}>
                <div style={{ flex: 1, padding: '4px 8px', borderRight: '2px solid #22c55e', fontWeight: 'bold' }}>
                  BILL NO. : {data.invoice.invoice_number}
                </div>
                <div style={{ flex: 1, padding: '4px 8px', fontWeight: 'bold' }}>
                  Date : {new Date(data.invoice.created_at).toLocaleDateString('en-GB').replace(/\//g, '-')}
                </div>
              </div>
              
              {/* Data Table */}
              <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '2px solid #22c55e' }} className="excel-table">
                <thead>
                  <tr>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '40px' }}>Sr. No</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>PRODUCT NAME</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '60px' }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '100px' }}>Rate</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '120px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any, idx: number) => (
                    <tr key={idx}>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{idx + 1}</td>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>
                        {item.product_name} - {item.pack_size}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                        {item.executed_qty}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                        {item.price_at_order}
                      </td>
                      <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                        {item.item_total.toFixed(2)}
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                      TOTAL
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>
                      {data.items.reduce((sum: number, item: any) => sum + item.executed_qty, 0)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                      {(data.invoice.grand_total || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              
              {/* Footer / Notes Row */}
              <div style={{ display: 'flex', minHeight: '80px' }}>
                <div style={{ flex: 1, padding: '4px 8px', borderRight: '2px solid #22c55e', fontSize: '11px', fontWeight: 'bold' }}>
                  <p style={{ margin: '0 0 2px 0' }}>Note:</p>
                  <p style={{ margin: '0 0 2px 0' }}>1. Order By: {data.invoice.owner_name || '-'}</p>
                  <p style={{ margin: '0 0 2px 0' }}>2. Goods Check Before Received!</p>
                  <p style={{ margin: '0 0 2px 0' }}>3. Subject to jurisdiction : Palghar</p>
                </div>
                <div style={{ width: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px'
                  }}>
                    <img 
                      src={`${import.meta.env.VITE_API_URL && import.meta.env.VITE_API_URL !== 'undefined' ? import.meta.env.VITE_API_URL : ''}/api/settings/company/qr?${new Date().getTime()}`} 
                      alt="Payment QR" 
                      style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                </div>
              </div>
              
            </div>
            
          </div>
        ) : null}
      </div>
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .printable-invoice, .printable-invoice * { visibility: visible; }
          
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
            size: A4 portrait;
            margin: 10mm; 
          }
          
          .invoice-container {
            padding: 0 !important;
          }
          
          .excel-table td, .excel-table th {
            border: 1px solid #000 !important;
          }
        }
      `}</style>
      {showPaymentModal && data && (
        <RecordPaymentModal 
          invoice={data.invoice} 
          onClose={() => setShowPaymentModal(false)}
          onSuccess={() => {
            setShowPaymentModal(false);
            fetchInvoiceDetail(); // refresh data
          }}
        />
      )}
    </div>
  );
};

export default InvoiceModal;
