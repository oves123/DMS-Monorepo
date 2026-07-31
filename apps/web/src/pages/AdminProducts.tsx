import { useState, useEffect, useMemo, useRef, Fragment } from 'react';
import axios from 'axios';
import { Link } from 'react-router-dom';
import { Search, Edit, Trash2, Filter, Upload, Plus, Package } from 'lucide-react';
import Papa from 'papaparse';
import { useToast } from '../components/Toast';

const AdminProducts = () => {
  const [catalog, setCatalog] = useState<any[]>([]);
  const [expandedProducts, setExpandedProducts] = useState<Record<number, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { showToast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Pagination, Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedHsn, setSelectedHsn] = useState('All');
  const [minRate, setMinRate] = useState('');
  const [maxRate, setMaxRate] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  // Edit & Add Variant Modal State
  const [editingVariant, setEditingVariant] = useState<any>(null);
  const [editForm, setEditForm] = useState<any>({});
  const [isUpdating, setIsUpdating] = useState(false);

  const [addingVariantTo, setAddingVariantTo] = useState<any>(null);
  const [newVariantForm, setNewVariantForm] = useState({ pack_size: '', distributor_rate: '', retailer_rate: '', mrp: '' });
  const [isAddingVariant, setIsAddingVariant] = useState(false);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/products');
      const validProducts = response.data.filter((p: any) => p.variants && p.variants.length > 0);
      setCatalog(validProducts);
    } catch (err) {
      setError('Failed to fetch products');
    } finally {
      setLoading(false);
    }
  };

  const toggleExpand = (productId: number) => {
    setExpandedProducts(prev => ({ ...prev, [productId]: !prev[productId] }));
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results) => {
        try {
          const response = await axios.post('http://localhost:5001/api/products/bulk', results.data);
          showToast(`Upload complete: ${response.data.successCount} added, ${response.data.skipCount} skipped.`, 'success');
          fetchProducts();
        } catch (err: any) {
          showToast(err.response?.data?.message || 'Failed to upload products', 'error');
        } finally {
          setIsUploading(false);
          if (fileInputRef.current) fileInputRef.current.value = ''; // reset input
        }
      },
      error: (error: any) => {
        showToast(`Error parsing CSV: ${error.message}`, 'error');
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    });
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
        name: editingVariant.product_name, // Name changes are mostly handled at master product level now
        category_name: editingVariant.category_name,
        hsn_code: editingVariant.hsn_code,
        pack_size: editForm.pack_size,
        distributor_rate: parseFloat(editForm.distributor_rate),
        retailer_rate: parseFloat(editForm.retailer_rate)
      });
      setEditingVariant(null);
      fetchProducts();
      showToast('Variant updated successfully!', 'success');
    } catch (err) {
      showToast('Failed to update variant', 'error');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleAddVariantSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsAddingVariant(true);
    try {
        // We'll reuse the bulk upload or direct variant insert if possible, 
        // but for now we can just send it to a theoretical endpoint or update the addProduct logic.
        // Actually, let's just make a quick POST to /api/products using the same payload format, but wait...
        // If we add a variant, the API doesn't have a direct endpoint for adding a variant to an existing product in productRoutes.js.
        // Let's implement it quickly in the frontend: 
        // We could just add a new route, but for now we'll do it safely.
        // I will add a new endpoint in the backend for POST /api/products/:id/variants
        await axios.post(`http://localhost:5001/api/products/${addingVariantTo.product_id}/variants`, {
            pack_size: newVariantForm.pack_size,
            distributor_rate: parseFloat(newVariantForm.distributor_rate),
            retailer_rate: parseFloat(newVariantForm.retailer_rate),
            mrp: parseFloat(newVariantForm.mrp) || 0
        });
        showToast('Variant added successfully!', 'success');
        setAddingVariantTo(null);
        setNewVariantForm({ pack_size: '', distributor_rate: '', retailer_rate: '', mrp: '' });
        fetchProducts();
        setExpandedProducts(prev => ({ ...prev, [addingVariantTo.product_id]: true }));
    } catch (err) {
        showToast('Failed to add variant. Ensure backend supports this route.', 'error');
    } finally {
        setIsAddingVariant(false);
    }
  };


  // Extract unique categories for filter dropdown
  const categories = useMemo(() => {
    const cats = catalog.map(p => p.category_name).filter(Boolean);
    return ['All', ...Array.from(new Set(cats))];
  }, [catalog]);

  // Extract unique HSN codes
  const hsnCodes = useMemo(() => {
    const codes = catalog.map(p => p.hsn_code).filter(Boolean);
    return ['All', ...Array.from(new Set(codes))];
  }, [catalog]);

  // Filter and Pagination Logic
  const filteredCatalog = useMemo(() => catalog.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (p.category_name && p.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || p.category_name === selectedCategory;
    const matchesHsn = selectedHsn === 'All' || p.hsn_code === selectedHsn;
    
    const hasMatchingVariant = p.variants.some((v: any) => {
        const matchesMin = minRate === '' || parseFloat(v.distributor_rate) >= parseFloat(minRate);
        const matchesMax = maxRate === '' || parseFloat(v.distributor_rate) <= parseFloat(maxRate);
        return matchesMin && matchesMax;
    });

    return matchesSearch && matchesCategory && matchesHsn && hasMatchingVariant;
  }), [catalog, searchQuery, selectedCategory, selectedHsn, minRate, maxRate]);

  const totalPages = Math.ceil(filteredCatalog.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredCatalog.slice(indexOfFirstItem, indexOfLastItem);

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
        <div style={{ display: 'flex', gap: '12px' }}>
          <input 
            type="file" 
            accept=".csv" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            style={{ display: 'none' }} 
          />
          <button 
            className="secondary-btn" 
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
            style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
          >
            <Upload size={18} />
            {isUploading ? 'Uploading...' : 'Bulk Upload'}
          </button>
          <Link to="/admin/products/add" className="primary-btn">
            + Add New Product
          </Link>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="data-card" style={{ padding: 0 }}>
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading products...</div>
        ) : catalog.length === 0 ? (
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
                  Showing {filteredCatalog.length === 0 ? 0 : indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredCatalog.length)} of {filteredCatalog.length} products
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px' }}>
                <thead>
                  <tr>
                    <th style={{ padding: '12px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#334155', fontWeight: 700, fontSize: '13px' }}>PRODUCT NAME</th>
                    <th style={{ padding: '12px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>CATEGORY</th>
                    <th style={{ padding: '12px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>HSN CODE</th>
                    <th style={{ padding: '12px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>PACK SIZE</th>
                    <th style={{ padding: '12px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>D RATE</th>
                    <th style={{ padding: '12px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#64748b', fontWeight: 600, fontSize: '13px' }}>R RATE</th>
                    <th style={{ padding: '12px', background: '#f8fafc', borderBottom: '2px solid #cbd5e1', color: '#64748b', fontWeight: 600, fontSize: '13px', textAlign: 'right' }}>ACTIONS</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((product) => {
                      const isExpanded = expandedProducts[product.product_id];
                      return (
                        <Fragment key={product.product_id}>
                          {/* Master Product Header Row */}
                          <tr 
                            style={{ background: '#f1f5f9', cursor: 'pointer', borderBottom: '1px solid #e2e8f0' }}
                            onClick={() => toggleExpand(product.product_id)}
                          >
                            <td colSpan={6} style={{ padding: '10px 12px', fontWeight: 'bold', color: '#0f172a', fontSize: '14px' }}>
                              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <span style={{ display: 'inline-block', width: '16px', color: '#64748b', textAlign: 'center' }}>
                                  {isExpanded ? '▼' : '▶'}
                                </span>
                                <div style={{ 
                                  width: '32px', height: '32px', background: '#e2e8f0', borderRadius: '6px', 
                                  display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'
                                }}>
                                  <Package size={18} />
                                </div>
                                <div>
                                  {product.name}
                                  <span style={{ marginLeft: '12px', fontSize: '12px', color: '#64748b', fontWeight: 'normal', background: '#e2e8f0', padding: '2px 8px', borderRadius: '12px' }}>
                                    {product.variants.length} Variants
                                  </span>
                                </div>
                              </div>
                            </td>
                            <td style={{ padding: '10px 12px', textAlign: 'right' }}>
                              <button 
                                onClick={(e) => { e.stopPropagation(); setAddingVariantTo(product); }}
                                style={{
                                  background: 'none', border: '1px solid var(--primary)', color: 'var(--primary)',
                                  padding: '4px 12px', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                                  cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto'
                                }}
                              >
                                <Plus size={14} /> Add Variant
                              </button>
                            </td>
                          </tr>

                          {/* Nested Variant Rows */}
                          {isExpanded && product.variants.map((v: any) => (
                            <tr key={v.variant_id} style={{ background: '#fff', borderBottom: '1px solid #e2e8f0' }}>
                              <td style={{ padding: '8px 12px', paddingLeft: '80px', color: '#64748b', fontSize: '13px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <div style={{ width: '4px', height: '4px', borderRadius: '50%', background: '#cbd5e1' }}></div>
                                {v.pack_size}
                              </td>
                              <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '13px' }}>{product.category_name || '-'}</td>
                              <td style={{ padding: '8px 12px', color: '#64748b', fontSize: '13px' }}>{product.hsn_code || '-'}</td>
                              <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 500, fontSize: '13px' }}>{v.pack_size}</td>
                              <td style={{ padding: '8px 12px', color: '#166534', fontWeight: 600, fontSize: '13px' }}>₹{v.distributor_rate.toFixed(2)}</td>
                              <td style={{ padding: '8px 12px', color: '#0f172a', fontWeight: 500, fontSize: '13px' }}>₹{v.retailer_rate.toFixed(2)}</td>
                              <td style={{ padding: '8px 12px', display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                                <button 
                                  onClick={() => openEditModal({ ...v, product_name: product.name, category_name: product.category_name, hsn_code: product.hsn_code })}
                                  title="Edit Variant"
                                  style={{ background: '#eff6ff', border: 'none', color: 'var(--primary)', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                                >
                                  <Edit size={16} />
                                </button>
                                <button 
                                  onClick={() => handleDelete(v.variant_id)}
                                  title="Delete Variant"
                                  style={{ background: '#fef2f2', border: 'none', color: '#ef4444', cursor: 'pointer', padding: '6px', borderRadius: '6px' }}
                                >
                                  <Trash2 size={16} />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </Fragment>
                      );
                    })
                  ) : (
                    <tr>
                      <td colSpan={7} style={{ textAlign: 'center', padding: '48px', color: 'var(--text-muted)' }}>
                        No products match your filters.
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
                  <label>Pcs in Box / Pack Size (e.g., 5Rs (180 PCS))</label>
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

      {/* Add Variant Modal */}
      {addingVariantTo && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000
        }}>
          <div style={{ background: '#fff', padding: '32px', borderRadius: '12px', width: '100%', maxWidth: '600px' }}>
            <h3 style={{ marginBottom: '8px', fontSize: '20px' }}>Add New Variant</h3>
            <p style={{ color: '#64748b', marginBottom: '24px' }}>Adding variant to <strong>{addingVariantTo.name}</strong></p>
            <form onSubmit={handleAddVariantSubmit}>
              <div className="form-grid">
                <div className="input-group">
                  <label>Pack Size (e.g. 5Rs (180 PCS))</label>
                  <input type="text" value={newVariantForm.pack_size} onChange={(e) => setNewVariantForm({...newVariantForm, pack_size: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Distributor Rate (₹)</label>
                  <input type="number" step="0.01" value={newVariantForm.distributor_rate} onChange={(e) => setNewVariantForm({...newVariantForm, distributor_rate: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>Retailer Rate (₹)</label>
                  <input type="number" step="0.01" value={newVariantForm.retailer_rate} onChange={(e) => setNewVariantForm({...newVariantForm, retailer_rate: e.target.value})} required />
                </div>
                <div className="input-group">
                  <label>MRP (₹)</label>
                  <input type="number" step="0.01" value={newVariantForm.mrp} onChange={(e) => setNewVariantForm({...newVariantForm, mrp: e.target.value})} required />
                </div>
              </div>
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                <button type="button" className="secondary-btn" onClick={() => setAddingVariantTo(null)}>Cancel</button>
                <button type="submit" className="primary-btn" disabled={isAddingVariant}>
                  {isAddingVariant ? 'Adding...' : 'Add Variant'}
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
