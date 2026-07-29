import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { useToast } from '../../components/Toast';
import { useNavigate } from 'react-router-dom';

const BulkOrderForm = () => {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const { showToast } = useToast();
  const navigate = useNavigate();

  // state: { productId: quantity }
  const [orderData, setOrderData] = useState<Record<number, number>>({});
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    fetchCatalog();
  }, []);

  const fetchCatalog = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/products');
      // The backend returns products. We will filter out any products that have no variants just in case.
      const validProducts = response.data.filter((p: any) => p.variants && p.variants.length > 0);
      setCatalog(validProducts);
    } catch (err) {
      showToast('Failed to load product catalog.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleQtyChange = (productId: number, value: string) => {
    const qty = parseInt(value, 10);
    setOrderData(prev => {
      const newData = { ...prev };
      if (isNaN(qty) || qty <= 0) {
        delete newData[productId];
      } else {
        newData[productId] = qty;
      }
      return newData;
    });
  };

  const { grandTotalQty, grandTotalValue } = useMemo(() => {
    let q = 0;
    let v = 0;
    catalog.forEach(product => {
      const qty = orderData[product.product_id];
      if (qty) {
        q += qty;
        v += (qty * product.variants[0].distributor_rate);
      }
    });
    return { grandTotalQty: q, grandTotalValue: v };
  }, [orderData, catalog]);

  const handleSubmitOrder = async () => {
    if (grandTotalQty === 0) {
      showToast('Please enter at least one quantity to place an order.', 'error');
      return;
    }

    setSubmitting(true);
    try {
      const user = JSON.parse(localStorage.getItem('dms_user') || '{}');
      if (!user.user_id) throw new Error("Not logged in");

      const items: { variant_id: number, requested_qty: number, price_at_order: number }[] = [];
      
      catalog.forEach(product => {
        const qty = orderData[product.product_id];
        if (qty) {
          items.push({
            variant_id: product.variants[0].variant_id,
            requested_qty: qty,
            price_at_order: product.variants[0].distributor_rate
          });
        }
      });

      await axios.post('http://localhost:5001/api/orders', {
        distributor_id: user.user_id,
        items
      });

      showToast('Order placed successfully!', 'success');
      setOrderData({}); 
      navigate('/distributor/orders');
    } catch (err) {
      console.error(err);
      showToast('Failed to place order.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Catalog...</div>;
  }

  return (
    <div style={{ paddingBottom: '100px' }}>
      <div className="page-header">
        <h2 className="page-title">Bulk Purchase Order Form</h2>
      </div>

      <div className="data-card" style={{ padding: 0, overflowX: 'auto', border: '2px solid #e2e8f0', borderRadius: '12px' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '800px' }}>
          <thead>
            <tr>
              <th style={{ padding: '16px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#334155', fontWeight: 700 }}>
                PRODUCT NAME
              </th>
              <th style={{ padding: '16px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#64748b', fontWeight: 600 }}>
                PACK SIZE
              </th>
              <th style={{ padding: '16px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#64748b', fontWeight: 600 }}>
                PRICE / BOX (₹)
              </th>
              <th style={{ padding: '16px', background: '#f0fdf4', borderBottom: '2px solid #cbd5e1', color: '#166534', fontWeight: 700, width: '150px' }}>
                QTY (BOXES)
              </th>
              <th style={{ padding: '16px', background: '#f0fdf4', borderBottom: '2px solid #cbd5e1', color: '#166534', fontWeight: 700, textAlign: 'right' }}>
                TOTAL VALUE (₹)
              </th>
            </tr>
          </thead>
          <tbody>
            {catalog.map((product, index) => {
              const variant = product.variants[0];
              const qty = orderData[product.product_id] || '';
              const rowValue = qty ? (qty * variant.distributor_rate) : 0;
              
              return (
                <tr key={product.product_id} style={{ background: index % 2 === 0 ? '#fff' : '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
                  <td style={{ padding: '12px 16px', fontWeight: 600, color: '#0f172a' }}>
                    {product.name}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b' }}>
                    {variant.pack_size}
                  </td>
                  <td style={{ padding: '12px 16px', color: '#64748b', fontWeight: 500 }}>
                    ₹{variant.distributor_rate.toFixed(2)}
                  </td>
                  <td style={{ padding: '12px 16px', background: '#f0fdf4' }}>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={qty}
                      onChange={(e) => handleQtyChange(product.product_id, e.target.value)}
                      style={{ 
                        width: '100%', 
                        padding: '8px', 
                        textAlign: 'center', 
                        border: '1px solid #cbd5e1', 
                        borderRadius: '6px',
                        outlineColor: 'var(--primary)',
                        fontWeight: 'bold',
                        fontSize: '16px'
                      }}
                    />
                  </td>
                  <td style={{ padding: '12px 16px', textAlign: 'right', fontWeight: 'bold', color: rowValue > 0 ? '#166534' : '#9ca3af', background: '#f0fdf4' }}>
                    ₹{rowValue.toFixed(2)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Sticky Bottom Bar */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: '250px', // Adjust depending on sidebar width
        right: 0,
        background: '#fff',
        padding: '16px 32px',
        boxShadow: '0 -4px 12px rgba(0,0,0,0.1)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 100
      }}>
        <div style={{ display: 'flex', gap: '48px' }}>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Total Quantity</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#0f172a' }}>{grandTotalQty} Boxes</div>
          </div>
          <div>
            <div style={{ fontSize: '12px', color: '#64748b', fontWeight: 600, textTransform: 'uppercase' }}>Grand Total Value</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#10b981' }}>₹{grandTotalValue.toFixed(2)}</div>
          </div>
        </div>

        <button 
          onClick={handleSubmitOrder} 
          disabled={submitting || grandTotalQty === 0}
          style={{
            padding: '16px 32px',
            fontSize: '18px',
            fontWeight: 'bold',
            background: (submitting || grandTotalQty === 0) ? '#cbd5e1' : 'var(--primary)',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: (submitting || grandTotalQty === 0) ? 'not-allowed' : 'pointer',
            boxShadow: '0 4px 6px rgba(37, 99, 235, 0.2)',
            transition: 'all 0.2s'
          }}
        >
          {submitting ? 'Placing Order...' : 'Submit Bulk Order'}
        </button>
      </div>
    </div>
  );
};

export default BulkOrderForm;
