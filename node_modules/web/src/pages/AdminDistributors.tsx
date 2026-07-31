import { useState, useEffect, useMemo, useRef } from 'react';
import axios from 'axios';
import { Search, Edit, Trash2, Filter, Upload } from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '../components/Toast';

const AdminDistributors = () => {
  const [distributors, setDistributors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingBulk, setUploadingBulk] = useState(false);

  // Pagination, Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [gstFilter, setGstFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Form State
  const [showForm, setShowForm] = useState(false);
  const [firmName, setFirmName] = useState('');
  const [gstNumber, setGstNumber] = useState('');
  const [address, setAddress] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [formLoading, setFormLoading] = useState(false);

  // Edit Modal State
  const [editingDist, setEditingDist] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchDistributors();
  }, []);

  const fetchDistributors = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/distributors');
      setDistributors(response.data);
    } catch (err) {
      setError('Failed to fetch distributors');
    } finally {
      setLoading(false);
    }
  };

  const handleAddDistributor = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormLoading(true);
    setError('');

    try {
      await axios.post('http://localhost:5001/api/distributors', {
        firm_name: firmName,
        gst_number: gstNumber,
        address: address,
        phone_number: phoneNumber,
        password: password
      });
      
      setShowForm(false);
      setFirmName('');
      setGstNumber('');
      setAddress('');
      setPhoneNumber('');
      setPassword('');
      fetchDistributors();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to add distributor');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (user_id: number) => {
    if (!window.confirm('Are you sure you want to delete this distributor?')) return;
    try {
      await axios.delete(`http://localhost:5001/api/distributors/${user_id}`);
      fetchDistributors();
    } catch (err) {
      showToast('Failed to delete distributor', 'error');
    }
  };

  const openEditModal = (dist: any) => {
    setEditingDist(dist);
    setEditForm({ ...dist });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await axios.put(`http://localhost:5001/api/distributors/${editingDist.user_id}`, {
        firm_name: editForm.firm_name,
        gst_number: editForm.gst_number,
        address: editForm.address,
        phone_number: editForm.phone_number
      });
      setEditingDist(null);
      fetchDistributors();
      showToast('Distributor updated successfully!', 'success');
    } catch (err: any) {
      showToast(err.response?.data?.message || 'Failed to update distributor', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleBulkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingBulk(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const res = await axios.post('http://localhost:5001/api/distributors/bulk', results.data);
          showToast(`Bulk upload success: ${res.data.successCount} added, ${res.data.skipCount} skipped.`, 'success');
          fetchDistributors();
        } catch (err: any) {
          showToast(err.response?.data?.message || 'Bulk upload failed', 'error');
        } finally {
          setUploadingBulk(false);
          if (fileInputRef.current) fileInputRef.current.value = '';
        }
      },
      error: (err) => {
        showToast('Error parsing CSV file', 'error');
        setUploadingBulk(false);
      }
    });
  };

  // Filter and Pagination Logic
  const filteredDistributors = useMemo(() => distributors.filter(d => {
    const matchesSearch = d.firm_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      d.phone_number.includes(searchQuery);
    const matchesGst =
      gstFilter === 'All' ? true :
      gstFilter === 'With GST' ? (d.gst_number && d.gst_number.trim() !== '') :
      !d.gst_number || d.gst_number.trim() === '';
    return matchesSearch && matchesGst;
  }), [distributors, searchQuery, gstFilter]);

  const totalPages = Math.ceil(filteredDistributors.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredDistributors.slice(indexOfFirstItem, indexOfLastItem);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Reset to page 1 when filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, gstFilter]);

  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Distributors</h2>
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="file" 
            accept=".csv" 
            style={{ display: 'none' }} 
            ref={fileInputRef} 
            onChange={handleBulkUpload}
          />
          <button 
            className="secondary-btn" 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploadingBulk}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Upload size={16} />
            {uploadingBulk ? 'Uploading...' : 'Bulk Upload (CSV)'}
          </button>
          <button className="primary-btn" onClick={() => setShowForm(!showForm)}>
            {showForm ? 'Cancel' : '+ Add New Distributor'}
          </button>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      {showForm && (
        <div className="data-card" style={{ padding: '24px', marginBottom: '24px' }}>
          <h3 style={{ marginBottom: '16px' }}>Create Distributor Account</h3>
          <form onSubmit={handleAddDistributor} className="form-grid">
            <div className="input-group">
              <label>Firm Name *</label>
              <input type="text" required value={firmName} onChange={e => setFirmName(e.target.value)} />
            </div>
            <div className="input-group">
              <label>GST Number</label>
              <input type="text" value={gstNumber} onChange={e => setGstNumber(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Address</label>
              <input type="text" value={address} onChange={e => setAddress(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Phone Number (Login ID) *</label>
              <input type="text" required value={phoneNumber} onChange={e => setPhoneNumber(e.target.value)} />
            </div>
            <div className="input-group">
              <label>Password *</label>
              <input type="text" required value={password} onChange={e => setPassword(e.target.value)} />
            </div>
            <div style={{ gridColumn: '1 / -1', textAlign: 'right' }}>
              <button type="submit" className="primary-btn" disabled={formLoading}>
                {formLoading ? 'Creating...' : 'Create Account'}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="data-card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading distributors...</div>
        ) : distributors.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No distributors found. Add one to get started.
          </div>
        ) : (
          <div>
            {/* Search Bar + GST Filter */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                <div style={{ position: 'relative', width: '320px' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                    <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search distributors by firm name or phone..." 
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    style={{ 
                      padding: '10px 16px 10px 38px', 
                      width: '100%', 
                      borderRadius: '8px', 
                      border: '1px solid var(--border-color)',
                      outline: 'none',
                      fontSize: '14px',
                      transition: 'border-color 0.2s',
                      boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)'
                    }}
                    onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                    onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                  />
                </div>

                {/* GST Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} color="#64748b" />
                  <select
                    value={gstFilter}
                    onChange={(e) => setGstFilter(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  >
                    <option value="All">All Distributors</option>
                    <option value="With GST">With GST</option>
                    <option value="Without GST">Without GST</option>
                  </select>
                </div>

                {(searchQuery || gstFilter !== 'All') && (
                  <button
                    onClick={() => { setSearchQuery(''); setGstFilter('All'); }}
                    style={{ padding: '6px 12px', fontSize: '13px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>
              <span style={{ color: 'var(--text-muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                Showing {filteredDistributors.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredDistributors.length)} of {filteredDistributors.length} entries
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Firm Name</th>
                    <th>Phone Number</th>
                    <th>GST Number</th>
                    <th>Address</th>
                    <th>Registration Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((d) => (
                      <tr key={d.user_id}>
                        <td style={{ fontWeight: 500 }}>{d.firm_name}</td>
                        <td>{d.phone_number}</td>
                        <td>{d.gst_number || '-'}</td>
                        <td>{d.address || '-'}</td>
                        <td>{new Date(d.created_at).toLocaleDateString()}</td>
                        <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            onClick={() => openEditModal(d)}
                            title="Edit Distributor"
                            style={{ 
                              background: '#eff6ff', 
                              border: 'none', 
                              color: 'var(--primary)', 
                              cursor: 'pointer', 
                              padding: '6px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                            onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                          >
                            <Edit size={16} />
                          </button>
                          <button 
                            onClick={() => handleDelete(d.user_id)}
                            title="Delete Distributor"
                            style={{ 
                              background: '#fef2f2', 
                              border: 'none', 
                              color: '#ef4444', 
                              cursor: 'pointer',
                              padding: '6px',
                              borderRadius: '6px',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#fee2e2'}
                            onMouseLeave={e => e.currentTarget.style.background = '#fef2f2'}
                          >
                            <Trash2 size={16} />
                          </button>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={5} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No distributors match your search.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border-color)', display: 'flex', justifyContent: 'flex-end', gap: '12px', alignItems: 'center' }}>
                <button 
                  onClick={handlePrevPage} 
                  disabled={currentPage === 1}
                  style={{ 
                    padding: '8px 16px', 
                    background: currentPage === 1 ? '#f3f4f6' : '#fff', 
                    color: currentPage === 1 ? '#9ca3af' : 'var(--text-main)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontWeight: 500
                  }}>
                  Previous
                </button>
                
                <span style={{ fontSize: '14px', color: 'var(--text-muted)', margin: '0 8px' }}>
                  Page {currentPage} of {totalPages}
                </span>

                <button 
                  onClick={handleNextPage} 
                  disabled={currentPage === totalPages}
                  style={{ 
                    padding: '8px 16px', 
                    background: currentPage === totalPages ? '#f3f4f6' : '#fff', 
                    color: currentPage === totalPages ? '#9ca3af' : 'var(--text-main)', 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '6px', 
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontWeight: 500
                  }}>
                  Next
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Edit Modal */}
      {editingDist && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '500px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '20px' }}>Edit Distributor</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Firm Name</label>
                  <input type="text" value={editForm.firm_name || ''} onChange={(e) => setEditForm({...editForm, firm_name: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Phone Number</label>
                  <input type="text" value={editForm.phone_number || ''} onChange={(e) => setEditForm({...editForm, phone_number: e.target.value})} required />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>GST Number</label>
                  <input type="text" value={editForm.gst_number || ''} onChange={(e) => setEditForm({...editForm, gst_number: e.target.value})} />
                </div>
                <div className="input-group" style={{ gridColumn: '1 / -1' }}>
                  <label>Address</label>
                  <input type="text" value={editForm.address || ''} onChange={(e) => setEditForm({...editForm, address: e.target.value})} />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="secondary-btn" onClick={() => setEditingDist(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={isUpdating}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDistributors;
