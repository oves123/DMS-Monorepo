import { useState, useEffect } from 'react';
import api from '../../lib/api';

const DistributorClaims = () => {
  const [claims, setClaims] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  const user = JSON.parse(localStorage.getItem('dms_user') || '{}');

  useEffect(() => {
    fetchClaims();
  }, []);

  const fetchClaims = async () => {
    try {
      const response = await api.get(`/api/claims/distributor/${user.user_id}`);
      setClaims(response.data);
    } catch (err) {
      setError('Failed to fetch claims');
    } finally {
      setLoading(false);
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
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading claims...</div>
        ) : claims.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            You have not filed any claims yet.
          </div>
        ) : (
          <div className="table-responsive">
            <table className="data-table" style={{ minWidth: '700px' }}>
              <thead>
                <tr>
                  <th>Claim ID</th>
                  <th>Order #</th>
                  <th>Product</th>
                  <th>Claim Qty</th>
                  <th>Reason</th>
                  <th>Amount (Credit)</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {claims.map((claim) => (
                  <tr key={claim.claim_id}>
                    <td>#{claim.claim_id}</td>
                    <td>Order #{claim.order_id}</td>
                    <td>{claim.product_name} - {claim.pack_size}</td>
                    <td style={{ fontWeight: 'bold' }}>{claim.quantity}</td>
                    <td>
                      {claim.reason}
                      {claim.has_image === 1 && (
                        <div style={{ marginTop: '8px' }}>
                          <a 
                            href={`${import.meta.env.VITE_API_URL}/api/claims/${claim.claim_id}/image`} 
                            target="_blank"
                            rel="noopener noreferrer"
                            style={{ fontSize: '12px', color: '#2563eb', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: '4px' }}
                          >
                            📷 View Photo
                          </a>
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
