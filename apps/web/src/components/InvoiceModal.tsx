import { useState, useEffect } from 'react';
import api from '../lib/api';
import { X, Printer, IndianRupee, Download } from 'lucide-react';
import RecordPaymentModal from './RecordPaymentModal';

interface InvoiceModalProps {
  orderId: number;
  onClose: () => void;
}

const InvoiceModal = ({ orderId, onClose }: InvoiceModalProps) => {
  const [data, setData] = useState<any>(null);
  const [settings, setSettings] = useState<any>(null);
  const [categorySummary, setCategorySummary] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [qrPreview, setQrPreview] = useState<string | null>(null);

  useEffect(() => {
    fetchInvoiceDetail();
  }, [orderId]);

  const fetchInvoiceDetail = async () => {
    try {
      const response = await api.get(`/api/ledger/invoice/${orderId}`);
      setData(response.data);
      
      const summary: Record<string, number> = {};
      if (response.data && response.data.items) {
        response.data.items.forEach((item: any) => {
          const cat = item.category_name || 'Other';
          summary[cat] = (summary[cat] || 0) + item.executed_qty;
        });
      }
      setCategorySummary(summary);
      
      try {
        const settingsRes = await api.get('/api/settings/company');
        setSettings(settingsRes.data);
      } catch (e) {
        console.error('Failed to fetch company settings');
      }

      try {
        const qrResponse = await api.get('/api/settings/company/qr', { responseType: 'blob' });
        if (qrResponse.data.size > 0) {
          const objectUrl = URL.createObjectURL(qrResponse.data);
          setQrPreview(objectUrl);
        }
      } catch (qrErr) {
        console.error('No QR code found or failed to fetch');
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

  const handleDownloadPdf = async () => {
    try {
      setDownloading(true);
      const response = await api.get(`/api/ledger/invoice/${orderId}/download`);
      if (response.data.pdf_url) {
        const fullUrl = `${import.meta.env.VITE_API_URL || ''}${response.data.pdf_url}`;
        const link = document.createElement('a');
        link.href = fullUrl;
        link.download = `Invoice_${data.invoice.invoice_number}.pdf`;
        link.target = '_blank'; // opens in new tab for mobile safety
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
      }
    } catch (err) {
      alert('Failed to generate PDF. Please try again.');
    } finally {
      setDownloading(false);
    }
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
            <button onClick={handleDownloadPdf} disabled={downloading} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#fef3c7', color: '#92400e', border: 'none', borderRadius: '6px', cursor: downloading ? 'not-allowed' : 'pointer', fontWeight: 500 }}>
              <Download size={16} /> {downloading ? 'Generating...' : 'Download PDF'}
            </button>
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
                  <p style={{ margin: '0 0 2px 0' }}>Address : {settings?.address || ''}</p>
                  <p style={{ margin: '0 0 2px 0' }}>Mobile No. : {settings?.mobile_number || ''} , State : {settings?.state || ''}</p>
                  <p style={{ margin: '0' }}>GST No : {settings?.gst_number || ''} , FSSAI No : {settings?.fssai_number || ''}</p>
                </div>
                <div style={{ width: '180px', padding: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <img src="/logo.png" alt="Jolliz Logo" style={{ maxWidth: '120px', maxHeight: '80px', objectFit: 'contain' }} />
                </div>
              </div>
              
              {/* Bill To & Ship To Details Row */}
              <div style={{ display: 'flex', borderBottom: '2px solid #22c55e' }}>
                <div style={{ flex: 1, padding: '4px 8px', borderRight: '2px solid #22c55e' }}>
                  <p style={{ margin: '0 0 2px 0' }}><strong>Bill To:</strong> {data.invoice.firm_name}</p>
                  {data.invoice.owner_name && (
                    <p style={{ margin: '0 0 2px 0' }}>Owner Name: {data.invoice.owner_name}</p>
                  )}
                  <p style={{ margin: '0 0 2px 0' }}>Address: {data.invoice.address}</p>
                  <p style={{ margin: '0' }}>Place Of Supply: Maharashtra {data.invoice.fssai_number ? `, FSSAI No : ${data.invoice.fssai_number}` : ''}</p>
                </div>
                <div style={{ flex: 1, padding: '4px 8px' }}>
                  <p style={{ margin: '0 0 2px 0' }}><strong>Ship To:</strong> {data.invoice.firm_name}</p>
                  {data.invoice.owner_name && (
                    <p style={{ margin: '0 0 2px 0' }}>Owner Name: {data.invoice.owner_name}</p>
                  )}
                  <p style={{ margin: '0 0 2px 0' }}>Address: {data.invoice.address}</p>
                  <p style={{ margin: '0' }}>Place Of Supply: Maharashtra {data.invoice.fssai_number ? `, FSSAI No : ${data.invoice.fssai_number}` : ''}</p>
                </div>
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
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '30px' }}>#</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '50px' }}>HSN</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'left' }}>Item Name</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '50px' }}>UOM</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '40px' }}>Qty</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '50px' }}>Rate</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '60px' }}>Taxable Amt</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '40px' }}>CGST %</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '50px' }}>CGST Amt</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', width: '40px' }}>SGST %</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '50px' }}>SGST Amt</th>
                    <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', width: '70px' }}>Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {data.items.map((item: any, idx: number) => {
                    const taxableAmt = item.executed_qty * item.price_at_order;
                    const cgstRate = settings?.cgst_rate || 2.5;
                    const sgstRate = settings?.sgst_rate || 2.5;
                    const cgstAmt = taxableAmt * (cgstRate / 100);
                    const sgstAmt = taxableAmt * (sgstRate / 100);
                    const rowTotal = taxableAmt + cgstAmt + sgstAmt;

                    return (
                      <tr key={idx}>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{item.hsn_code || '-'}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', fontWeight: 'bold' }}>
                          {item.product_name} - {item.pack_size}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{item.uom || 'Box'}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center', fontWeight: 'bold' }}>
                          {item.executed_qty}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                          {item.price_at_order}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                          {taxableAmt.toFixed(2)}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{cgstRate}%</td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>{cgstAmt.toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'center' }}>{sgstRate}%</td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right' }}>{sgstAmt.toFixed(2)}</td>
                        <td style={{ border: '1px solid #000', padding: '2px 4px', textAlign: 'right', fontWeight: 'bold' }}>
                          {rowTotal.toFixed(2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr>
                    <td colSpan={4} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                      TOTAL
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold', color: '#ef4444' }}>
                      {data.items.reduce((sum: number, item: any) => sum + item.executed_qty, 0)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px' }}></td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                      {(data.invoice.subtotal || 0).toFixed(2)}
                    </td>
                    <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                      {(data.invoice.cgst_amount || 0).toFixed(2)}
                    </td>
                    <td colSpan={2} style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                      {(data.invoice.sgst_amount || 0).toFixed(2)}
                    </td>
                    <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'right', fontWeight: 'bold' }}>
                      {(data.invoice.grand_total || 0).toFixed(2)}
                    </td>
                  </tr>
                </tfoot>
              </table>
              
              {/* Category Summary Table */}
              {Object.keys(categorySummary).length > 0 && (
                <table style={{ width: '100%', borderCollapse: 'collapse', borderBottom: '2px solid #22c55e' }} className="excel-table">
                  <thead>
                    <tr>
                      <th style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', background: '#f8fafc' }}>Filling Type</th>
                      {Object.keys(categorySummary).map(cat => (
                        <th key={cat} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', background: '#f8fafc' }}>{cat}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>Box</td>
                      {Object.keys(categorySummary).map(cat => (
                        <td key={cat} style={{ border: '1px solid #000', padding: '4px', textAlign: 'center', fontWeight: 'bold' }}>
                          {categorySummary[cat]}
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              )}
              
              {/* Footer / Notes Row */}
              <div style={{ display: 'flex', minHeight: '100px' }}>
                <div style={{ flex: 1, padding: '4px 8px', borderRight: '2px solid #22c55e', fontSize: '11px', fontWeight: 'bold' }}>
                  <p style={{ margin: '0 0 2px 0' }}>Note:</p>
                  <p style={{ margin: '0 0 2px 0' }}>1. Order By: {data.invoice.owner_name || '-'}</p>
                  <p style={{ margin: '0 0 2px 0' }}>2. Goods Check Before Received!</p>
                  <p style={{ margin: '0 0 2px 0' }}>3. Subject to jurisdiction : Palghar</p>
                </div>
                <div style={{ width: '150px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRight: '2px solid #22c55e' }}>
                  <div style={{ 
                    width: '100px', 
                    height: '100px'
                  }}>
                    {qrPreview && (
                      <img 
                        src={qrPreview} 
                        alt="Payment QR" 
                        style={{ width: '100%', height: '100%', objectFit: 'contain' }}
                        onError={(e) => { e.currentTarget.style.display = 'none'; }}
                      />
                    )}
                  </div>
                </div>
                <div style={{ flex: 1, padding: '4px 8px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '12px', fontWeight: 'bold' }}>
                  <p style={{ margin: '0 0 2px 0' }}>For Anand Enterprises</p>
                  <p style={{ margin: '0 0 2px 0' }}>Authorised Signatory</p>
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
