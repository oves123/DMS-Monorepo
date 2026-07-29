import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, Edit, Trash2, Filter } from 'lucide-react';
import { useToast } from '../components/Toast';

const AdminProducts = () => {
  const [flatVariants, setFlatVariants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // Pagination, Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedHsn, setSelectedHsn] = useState('All');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit Modal State
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/products');
      const data = response.data;

      // Flatten to exactly match Excel columns
      const flat: any[] = [];
      data.forEach((p: any) => {
        if (p.variants && p.variants.length > 0) {
          p.variants.forEach((v: any) => {
            flat.push({
              product_id: p.product_id,
              variant_id: v.variant_id,
              category_name: p.category_name,
              product_name: p.name,
              hsn_code: p.hsn_code,
              pack_size: v.pack_size,
              distributor_rate: v.distributor_rate,
              retailer_rate: v.retailer_rate,
            });
          });
        }
      });
      setFlatVariants(flat);
    } catch (err) {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (variant_id: number) => {
    if (!window.confirm('Are you sure you want to delete this product variant?')) return;
    try {
      await axios.delete(`http://localhost:5001/api/products/${variant_id}`);
      fetchProducts(); // Refresh list
    } catch (err) {
      showToast('Failed to delete product', 'error');
    }
  };

  const openEditModal = (variant: any) => {
    setEditingVariant(variant);
    setEditForm({ ...variant });
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdating(true);
    try {
      await axios.put(`http://localhost:5001/api/products/${editingVariant.variant_id}`, {
        name: editForm.product_name,
        category_name: editForm.category_name,
        hsn_code: editForm.hsn_code,
        pack_size: editForm.pack_size,
        distributor_rate: parseFloat(editForm.distributor_rate),
        retailer_rate: parseFloat(editForm.retailer_rate)
      });
      setEditingVariant(null);
      fetchProducts();
      showToast('Product updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update product', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  // Extract unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = flatVariants.map(v => v.category_name).filter(Boolean);
    return ['All', ...Array.from(new Set(cats))];
  }, [flatVariants]);

  // Extract unique HSN codes
  const hsnCodes = useMemo(() => {
    const codes = flatVariants.map(v => v.hsn_code).filter(Boolean);
    return ['All', ...Array.from(new Set(codes))];
  }, [flatVariants]);

  // Filter and Pagination Logic
  const filteredVariants = useMemo(() => flatVariants.filter(v => {
    const matchesSearch = v.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (v.category_name && v.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || v.category_name === selectedCategory;
    const matchesHsn = selectedHsn === 'All' || v.hsn_code === selectedHsn;
    const matchesMin = minRate === '' || parseFloat(v.distributor_rate) >= parseFloat(minRate);
    const matchesMax = maxRate === '' || parseFloat(v.distributor_rate) <= parseFloat(maxRate);
    return matchesSearch && matchesCategory && matchesHsn && matchesMin && matchesMax;
  }), [flatVariants, searchQuery, selectedCategory, selectedHsn, minRate, maxRate]);

  const totalPages = Math.ceil(filteredVariants.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredVariants.slice(indexOfFirstItem, indexOfLastItem);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Reset to page 1 when searching or filtering
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, selectedHsn, minRate, maxRate]);


  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Products Catalogue</h2>
        <Link to="/admin/products/add" className="primary-btn">
          + Add New Product
        </Link>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="data-card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading products...</div>
        ) : flatVariants.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No products found. Click "Add New Product" to create your catalogue.
          </div>
        ) : (
          <div>
            {/* Filter Bar */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {/* Row 1: Search + Category + HSN */}
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
                  {/* Search */}
                  <div style={{ position: 'relative', width: '280px' }}>
                    <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                      <Search size={18} />
                    </div>
                    <input 
                      type="text" 
                      placeholder="Search products by name or category..." 
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ padding: '10px 16px 10px 38px', width: '100%', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
                      onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                      onBlur={(e) => e.target.style.borderColor = 'var(--border-color)'}
                    />
                  </div>

                  {/* Category Filter */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Filter size={16} color="#64748b" />
                    <select
                      value={selectedCategory}
                      onChange={(e) => setSelectedCategory(e.target.value)}
                      style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    >
                      {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                    </select>
                  </div>

                  {/* HSN Code Filter */}
                  <select
                    value={selectedHsn}
                    onChange={(e) => setSelectedHsn(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                  >
                    {hsnCodes.map(code => <option key={code} value={code}>{code === 'All' ? 'All HSN Codes' : `HSN: ${code}`}</option>)}
                  </select>

                  {/* Price Range */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '13px', color: '#64748b', fontWeight: 500, whiteSpace: 'nowrap' }}>D Rate:</span>
                    <input
                      type="number"
                      placeholder="Min ₹"
                      value={minRate}
                      onChange={e => setMinRate(e.target.value)}
                      style={{ width: '80px', padding: '10px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    />
                    <span style={{ color: '#9ca3af' }}>—</span>
                    <input
                      type="number"
                      placeholder="Max ₹"
                      value={maxRate}
                      onChange={e => setMaxRate(e.target.value)}
                      style={{ width: '80px', padding: '10px 10px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', boxShadow: '0 1px 2px rgba(0,0,0,0.05)' }}
                    />
                  </div>

                  {/* Clear Filters */}
                  {(searchQuery || selectedCategory !== 'All' || selectedHsn !== 'All' || minRate || maxRate) && (
                    <button
                      onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setSelectedHsn('All'); setMinRate(''); setMaxRate(''); }}
                      style={{ padding: '6px 12px', fontSize: '13px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                    >
                      ✕ Clear Filters
                    </button>
                  )}
                </div>

                <span style={{ color: 'var(--text-muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                  Showing {filteredVariants.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredVariants.length)} of {filteredVariants.length} entries
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>PRODUCT CATEGORY</th>
                    <th>PRODUCT NAME</th>
                    <th>HSN CODE</th>
                    <th>PCS IN BOX/BAG</th>
                    <th>DISTRIBUTOR RATE</th>
                    <th>RETAILER RATE</th>
                    <th>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((v) => (
                      <tr key={v.variant_id}>
                        <td>{v.category_name || '-'}</td>
                        <td style={{ fontWeight: 500 }}>{v.product_name}</td>
                        <td>{v.hsn_code || '-'}</td>
                        <td>{v.pack_size}</td>
                        <td>₹{v.distributor_rate}</td>
                        <td>₹{v.retailer_rate}</td>
                        <td style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <button 
                            onClick={() => openEditModal(v)}
                            title="Edit Product"
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
                            onClick={() => handleDelete(v.variant_id)}
                            title="Delete Product"
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
                      <td colSpan={7} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No products match your search.
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
      {editingVariant && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '24px', fontSize: '20px' }}>Edit Product</h3>
            <form onSubmit={handleUpdate}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Product Category</label>
                  <input type="text" value={editForm.category_name || ''} onChange={(e) => setEditForm({...editForm, category_name: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Product Name</label>
                  <input type="text" value={editForm.product_name || ''} onChange={(e) => setEditForm({...editForm, product_name: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>HSN Code</label>
                  <input type="text" value={editForm.hsn_code || ''} onChange={(e) => setEditForm({...editForm, hsn_code: e.target.value})} />
                </div>
                <div className="input-group">
                  <label>Pcs in Box / Pack Size</label>
                  <input type="text" value={editForm.pack_size || ''} onChange={(e) => setEditForm({...editForm, pack_size: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Distributor Rate (₹)</label>
                  <input type="number" step="0.01" value={editForm.distributor_rate || ''} onChange={(e) => setEditForm({...editForm, distributor_rate: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Retailer Rate (₹)</label>
                  <input type="number" step="0.01" value={editForm.retailer_rate || ''} onChange={(e) => setEditForm({...editForm, retailer_rate: e.target.value})} required />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="secondary-btn" onClick={() => setEditingVariant(null)}>Cancel</button>
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

export default AdminProducts;
