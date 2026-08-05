import { useState, useEffect } from 'react';
import api from '../../lib/api';
import { useToast } from '../../components/Toast';
import { User, Phone, MapPin, Building, FileText, Lock, Save } from 'lucide-react';

const DistributorProfile = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [profile, setProfile] = useState<any>(null);
  
  // Edit State
  const [firmName, setFirmName] = useState('');
  const [ownerName, setOwnerName] = useState('');
  const [address, setAddress] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [fssaiNumber, setFssaiNumber] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);

  // Document Upload State
  const [panFile, setPanFile] = useState<File | null>(null);
  const [aadharFile, setAadharFile] = useState<File | null>(null);
  const [photoFile, setPhotoFile] = useState<File | null>(null);

  // Password Reset State
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [resettingPassword, setResettingPassword] = useState(false);

  const user = JSON.parse(localStorage.getItem('dms_user') || '{}');

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      const response = await api.get(`/api/distributors/${user.user_id}`);
      const data = response.data;
      setProfile(data);
      setFirmName(data.firm_name || '');
      setOwnerName(data.owner_name || '');
      setAddress(data.address || '');
      setGstNumber(data.gst_number || '');
      setFssaiNumber(data.fssai_number || '');
      setPhoneNumber(data.phone_number || '');
    } catch (err) {
      showToast('Failed to load profile', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingProfile(true);
    
    try {
      const formData = new FormData();
      formData.append('firm_name', firmName);
      formData.append('owner_name', ownerName);
      formData.append('address', address);
      formData.append('gst_number', gstNumber);
      formData.append('fssai_number', fssaiNumber);
      formData.append('phone_number', phoneNumber);
      
      if (panFile) formData.append('panFile', panFile);
      if (aadharFile) formData.append('aadharFile', aadharFile);
      if (photoFile) formData.append('photoFile', photoFile);

      await api.put(`/api/distributors/${user.user_id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      showToast('Profile updated successfully', 'success');
      setIsEditing(false);
      setPanFile(null);
      setAadharFile(null);
      setPhotoFile(null);
      fetchProfile();
    } catch (err) {
      showToast('Failed to update profile', 'error');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      showToast('Passwords do not match', 'error');
      return;
    }
    
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters', 'error');
      return;
    }

    setResettingPassword(true);
    try {
      await api.put('/api/auth/reset-password', {
        user_id: user.user_id,
        new_password: newPassword
      });
      showToast('Password updated successfully', 'success');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      showToast('Failed to reset password', 'error');
    } finally {
      setResettingPassword(false);
    }
  };

  const handleViewDocument = async (type: string) => {
    try {
      const response = await api.get(`/api/distributors/${user.user_id}/file/${type}`, {
        responseType: 'blob'
      });
      const url = window.URL.createObjectURL(new Blob([response.data], { type: 'image/jpeg' }));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('target', '_blank');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      showToast('Document not found', 'error');
    }
  };

  if (loading) {
    return <div style={{ padding: '40px', textAlign: 'center' }}>Loading profile...</div>;
  }

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">My Profile</h2>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '24px' }}>
        
        {/* Profile Details */}
        <div className="data-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h3 style={{ margin: 0, fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <User size={20} color="#2563eb" /> Personal Details
            </h3>
            <button 
              onClick={() => setIsEditing(!isEditing)}
              style={{ background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: '14px' }}
            >
              {isEditing ? 'Cancel' : 'Edit'}
            </button>
          </div>

          <form onSubmit={handleUpdateProfile}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '16px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>Firm Name</label>
                <div style={{ position: 'relative' }}>
                  <Building size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="text" value={firmName} onChange={e => setFirmName(e.target.value)} disabled={!isEditing} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', background: isEditing ? '#fff' : '#f8fafc', outline: 'none' }} required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>Owner Name</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="text" value={ownerName} onChange={e => setOwnerName(e.target.value)} disabled={!isEditing} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', background: isEditing ? '#fff' : '#f8fafc', outline: 'none' }} required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>Phone Number</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input type="text" value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} disabled={!isEditing} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', background: isEditing ? '#fff' : '#f8fafc', outline: 'none' }} required />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>Address</label>
                <div style={{ position: 'relative' }}>
                  <MapPin size={16} color="#9ca3af" style={{ position: 'absolute', left: '12px', top: '12px' }} />
                  <textarea value={address} onChange={e => setAddress(e.target.value)} disabled={!isEditing} style={{ width: '100%', padding: '10px 12px 10px 36px', borderRadius: '8px', border: '1px solid #e2e8f0', background: isEditing ? '#fff' : '#f8fafc', outline: 'none', minHeight: '80px' }} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>GST Number</label>
                  <input type="text" value={gstNumber} onChange={e => setGstNumber(e.target.value)} disabled={!isEditing} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: isEditing ? '#fff' : '#f8fafc', outline: 'none' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>FSSAI Number</label>
                  <input type="text" value={fssaiNumber} onChange={e => setFssaiNumber(e.target.value)} disabled={!isEditing} style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', background: isEditing ? '#fff' : '#f8fafc', outline: 'none' }} />
                </div>
              </div>

              {isEditing && (
                <button type="submit" disabled={savingProfile} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', width: '100%', padding: '12px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '8px' }}>
                  <Save size={18} /> {savingProfile ? 'Saving...' : 'Save Profile'}
                </button>
              )}
            </div>
          </form>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          
          {/* Documents Section */}
          <div className="data-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <FileText size={20} color="#10b981" /> Documents
            </h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '6px', color: '#10b981' }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#334155' }}>PAN Card</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{profile.has_pan ? 'Uploaded' : 'Not Uploaded'}</div>
                  </div>
                </div>
                {profile.has_pan === 1 && !isEditing && (
                  <button onClick={() => handleViewDocument('pan')} type="button" style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#475569' }}>View</button>
                )}
                {isEditing && (
                  <input type="file" accept="image/*,.pdf" onChange={e => e.target.files && setPanFile(e.target.files[0])} style={{ fontSize: '12px', maxWidth: '150px' }} />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '6px', color: '#10b981' }}>
                    <FileText size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#334155' }}>Aadhar Card</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{profile.has_aadhar ? 'Uploaded' : 'Not Uploaded'}</div>
                  </div>
                </div>
                {profile.has_aadhar === 1 && !isEditing && (
                  <button onClick={() => handleViewDocument('aadhar')} type="button" style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#475569' }}>View</button>
                )}
                {isEditing && (
                  <input type="file" accept="image/*,.pdf" onChange={e => e.target.files && setAadharFile(e.target.files[0])} style={{ fontSize: '12px', maxWidth: '150px' }} />
                )}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px', border: '1px solid #e2e8f0', borderRadius: '8px', background: '#f8fafc' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ padding: '8px', background: '#ecfdf5', borderRadius: '6px', color: '#10b981' }}>
                    <User size={16} />
                  </div>
                  <div>
                    <div style={{ fontWeight: 600, color: '#334155' }}>Photo</div>
                    <div style={{ fontSize: '12px', color: '#94a3b8' }}>{profile.has_photo ? 'Uploaded' : 'Not Uploaded'}</div>
                  </div>
                </div>
                {profile.has_photo === 1 && !isEditing && (
                  <button onClick={() => handleViewDocument('photo')} type="button" style={{ padding: '6px 12px', background: '#fff', border: '1px solid #cbd5e1', borderRadius: '6px', cursor: 'pointer', fontSize: '12px', fontWeight: 600, color: '#475569' }}>View</button>
                )}
                {isEditing && (
                  <input type="file" accept="image/*" onChange={e => e.target.files && setPhotoFile(e.target.files[0])} style={{ fontSize: '12px', maxWidth: '150px' }} />
                )}
              </div>
            </div>
          </div>

          {/* Reset Password */}
          <div className="data-card" style={{ padding: '24px' }}>
            <h3 style={{ margin: '0 0 20px', fontSize: '18px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ef4444' }}>
              <Lock size={20} color="#ef4444" /> Security
            </h3>
            
            <form onSubmit={handleResetPassword}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>New Password</label>
                  <input 
                    type="password" 
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                    required
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', color: '#64748b' }}>Confirm New Password</label>
                  <input 
                    type="password" 
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="Confirm new password"
                    style={{ width: '100%', padding: '10px 12px', borderRadius: '8px', border: '1px solid #e2e8f0', outline: 'none' }}
                    required
                  />
                </div>
                <button type="submit" disabled={resettingPassword} style={{ width: '100%', padding: '12px', background: '#ef4444', color: '#fff', border: 'none', borderRadius: '8px', cursor: 'pointer', fontWeight: 600, marginTop: '8px' }}>
                  {resettingPassword ? 'Updating...' : 'Update Password'}
                </button>
              </div>
            </form>
          </div>

        </div>
      </div>
    </div>
  );
};

export default DistributorProfile;
