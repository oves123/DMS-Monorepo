import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Save, Upload, Banknote, Building, Mail, CheckCircle } from 'lucide-react';

const AdminSettings = () => {
  const [settings, setSettings] = useState({
    account_name: '',
    account_no: '',
    bank_name: '',
    ifsc_code: '',
    branch: '',
    email: '',
    claim_window_days: 7
  });
  const [qrFile, setQrFile] = useState<File | null>(null);
  const [qrPreview, setQrPreview] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/settings/company');
      if (response.data) {
        setSettings(response.data);
      }
      setQrPreview('http://localhost:5001/api/settings/company/qr?' + new Date().getTime());
    } catch (err) {
      console.error('Failed to fetch settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSettings({ ...settings, [e.target.name]: e.target.value });
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setQrFile(file);
      setQrPreview(URL.createObjectURL(file));
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');

    try {
      const formData = new FormData();
      formData.append('account_name', settings.account_name);
      formData.append('account_no', settings.account_no);
      formData.append('bank_name', settings.bank_name);
      formData.append('ifsc_code', settings.ifsc_code);
      formData.append('branch', settings.branch);
      formData.append('email', settings.email);
      formData.append('claim_window_days', settings.claim_window_days.toString());
      if (qrFile) {
        formData.append('qr_code_image', qrFile);
      }

      await axios.put('http://localhost:5001/api/settings/company', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      setMessage('Settings updated successfully!');
      setQrFile(null); // Clear file input after save
    } catch (err) {
      setMessage('Failed to save settings.');
    } finally {
      setSaving(false);
      setTimeout(() => setMessage(''), 3000);
    }
  };

  if (loading) return <div style={{ padding: '40px', textAlign: 'center' }}>Loading Settings...</div>;

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Company Settings</h2>
      </div>

      <div className="data-card" style={{ padding: '32px', maxWidth: '900px', margin: '0 auto' }}>
        <form onSubmit={handleSave}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '40px' }}>
            
            {/* Left Column: Bank Details */}
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <Banknote size={20} color="var(--primary)" /> Bank Details
              </h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Account Name</label>
                  <input
                    type="text"
                    name="account_name"
                    value={settings.account_name}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Account Number</label>
                  <input
                    type="text"
                    name="account_no"
                    value={settings.account_no}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Bank Name</label>
                  <input
                    type="text"
                    name="bank_name"
                    value={settings.bank_name}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>IFSC Code</label>
                  <input
                    type="text"
                    name="ifsc_code"
                    value={settings.ifsc_code}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                    required
                  />
                </div>

                <div className="form-group">
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Branch</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px' }}>
                    <Building size={16} color="#94a3b8" />
                    <input
                      type="text"
                      name="branch"
                      value={settings.branch}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px', border: 'none', outline: 'none', background: 'transparent' }}
                      required
                    />
                  </div>
                </div>

                <div className="form-group" style={{ gridColumn: '1 / -1' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Contact Email</label>
                  <div style={{ display: 'flex', alignItems: 'center', background: '#fff', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '0 12px' }}>
                    <Mail size={16} color="#94a3b8" />
                    <input
                      type="email"
                      name="email"
                      value={settings.email}
                      onChange={handleInputChange}
                      style={{ width: '100%', padding: '10px', border: 'none', outline: 'none', background: 'transparent' }}
                      required
                    />
                  </div>
                </div>
                
                <div className="form-group" style={{ gridColumn: '1 / -1', marginTop: '16px' }}>
                  <h3 style={{ fontSize: '18px', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', borderTop: '1px solid var(--border-color)', paddingTop: '24px' }}>
                    Distributor Settings
                  </h3>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: 500, fontSize: '14px', color: '#475569' }}>Defect Claim Window (Days)</label>
                  <p style={{ fontSize: '12px', color: '#64748b', marginBottom: '8px' }}>How many days after order execution can a distributor file a defect claim?</p>
                  <input
                    type="number"
                    name="claim_window_days"
                    value={settings.claim_window_days}
                    onChange={handleInputChange}
                    style={{ width: '100%', padding: '10px 14px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none' }}
                    min="1"
                    required
                  />
                </div>
              </div>
            </div>

            {/* Right Column: QR Code */}
            <div>
              <h3 style={{ fontSize: '18px', marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b' }}>
                <Upload size={20} color="var(--primary)" /> Payment QR Code
              </h3>
              
              <div style={{ 
                border: '2px dashed var(--border-color)', borderRadius: '12px', padding: '24px', 
                textAlign: 'center', background: '#f8fafc', display: 'flex', flexDirection: 'column', alignItems: 'center'
              }}>
                {qrPreview ? (
                  <div style={{ marginBottom: '16px', background: '#fff', padding: '8px', borderRadius: '8px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                    <img 
                      src={qrPreview} 
                      alt="QR Code" 
                      style={{ width: '180px', height: '180px', objectFit: 'contain' }} 
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  </div>
                ) : (
                  <div style={{ width: '180px', height: '180px', background: '#e2e8f0', borderRadius: '8px', marginBottom: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8' }}>
                    No Image
                  </div>
                )}
                
                <label style={{
                  background: 'var(--primary)', color: '#fff', padding: '8px 16px', borderRadius: '6px', 
                  cursor: 'pointer', fontSize: '14px', fontWeight: 500, display: 'inline-block'
                }}>
                  Upload New QR
                  <input 
                    type="file" 
                    accept="image/*" 
                    onChange={handleFileChange} 
                    style={{ display: 'none' }}
                  />
                </label>
                <p style={{ fontSize: '12px', color: '#64748b', marginTop: '8px' }}>Recommended: Square Image (JPG/PNG)</p>
              </div>
            </div>
            
          </div>

          <div style={{ marginTop: '40px', paddingTop: '20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              {message && (
                <div style={{ 
                  color: message.includes('success') ? '#059669' : '#dc2626', 
                  display: 'flex', alignItems: 'center', gap: '6px', fontWeight: 500, fontSize: '14px' 
                }}>
                  {message.includes('success') && <CheckCircle size={16} />}
                  {message}
                </div>
              )}
            </div>
            <button 
              type="submit" 
              className="primary-btn"
              disabled={saving}
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 24px', fontSize: '15px', opacity: saving ? 0.7 : 1 }}
            >
              <Save size={18} /> {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AdminSettings;
