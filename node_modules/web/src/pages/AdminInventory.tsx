import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, PackagePlus, Check, X, Filter } from 'lucide-react';

const AdminInventory = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [updateVariantId, setUpdateVariantId] = useState<number | null>(null);
  const [addQty, setAddQty] = useState('');

  // Pagination, Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchInventory();
  }, []);

  const fetchInventory = async () => {
    try {
      const response = await axios.get('http://localhost:5001/api/inventory');
      setInventory(response.data);
    } catch (err) {
      setError('Failed to fetch inventory');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateStock = async (e: React.FormEvent, variantId: number) => {
    e.preventDefault();
    if (!addQty || isNaN(Number(addQty))) return;

    try {
      await axios.post('http://localhost:5001/api/inventory/update', {
        variant_id: variantId,
        added_qty: parseInt(addQty)
      });
      
      setUpdateVariantId(null);
      setAddQty('');
      fetchInventory();
    } catch (err) {
      setError('Failed to update stock');
    }
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = inventory.map((item: any) => item.category_name).filter(Boolean);
    return ['All', ...Array.from(new Set(cats))];
  }, [inventory]);

  // Filter and Pagination Logic
  const filteredInventory = useMemo(() => inventory.filter((item: any) => {
    const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesCategory = selectedCategory === 'All' || item.category_name === selectedCategory;
    const matchesStock = 
      stockFilter === 'All' ? true :
      stockFilter === 'Low Stock' ? item.current_stock > 0 && item.current_stock < 100 :
      stockFilter === 'Out of Stock' ? item.current_stock === 0 : true;
    return matchesSearch && matchesCategory && matchesStock;
  }), [inventory, searchQuery, selectedCategory, stockFilter]);

  const totalPages = Math.ceil(filteredInventory.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredInventory.slice(indexOfFirstItem, indexOfLastItem);

  const handleNextPage = () => {
    if (currentPage < totalPages) setCurrentPage(currentPage + 1);
  };

  const handlePrevPage = () => {
    if (currentPage > 1) setCurrentPage(currentPage - 1);
  };

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, selectedCategory, stockFilter]);


  return (
    <div>
      <div className="page-header">
        <h2 className="page-title">Live Inventory Management</h2>
      </div>

      {error && <div className="error-message">{error}</div>}

      <div className="data-card">
        {loading ? (
          <div style={{ padding: '20px', textAlign: 'center' }}>Loading inventory...</div>
        ) : inventory.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
            No products found. Add products first to manage their inventory.
          </div>
        ) : (
          <div>
            {/* Search Bar + Filters */}
            <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border-color)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>

                {/* Search */}
                <div style={{ position: 'relative', width: '300px' }}>
                  <div style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }}>
                    <Search size={18} />
                  </div>
                  <input 
                    type="text" 
                    placeholder="Search by product name or category..." 
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

                {/* Category Filter */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Filter size={16} color="#64748b" />
                  <select
                    value={selectedCategory}
                    onChange={(e) => setSelectedCategory(e.target.value)}
                    style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
                  >
                    {categories.map(cat => <option key={cat} value={cat}>{cat}</option>)}
                  </select>
                </div>

                {/* Stock Level Filter */}
                <select
                  value={stockFilter}
                  onChange={(e) => setStockFilter(e.target.value)}
                  style={{ padding: '10px 16px', borderRadius: '8px', border: '1px solid var(--border-color)', outline: 'none', fontSize: '14px', cursor: 'pointer', backgroundColor: '#fff', boxShadow: '0 1px 2px 0 rgba(0,0,0,0.05)' }}
                >
                  <option value="All">All Stock Levels</option>
                  <option value="Low Stock">Low Stock (&lt;100)</option>
                  <option value="Out of Stock">Out of Stock</option>
                </select>

                {/* Clear Filters */}
                {(searchQuery || selectedCategory !== 'All' || stockFilter !== 'All') && (
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setStockFilter('All'); }}
                    style={{ padding: '6px 12px', fontSize: '13px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>

              <span style={{ color: 'var(--text-muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                Showing {filteredInventory.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredInventory.length)} of {filteredInventory.length} entries
              </span>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Pack Size</th>
                    <th>Current Stock</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item) => (
                      <tr key={item.variant_id}>
                        <td style={{ fontWeight: 500 }}>
                          {item.product_name} 
                          <span style={{ color: '#6b7280', fontSize: '12px', display: 'block' }}>{item.category_name}</span>
                        </td>
                        <td>{item.pack_size}</td>
                        <td>
                          <span style={{ 
                            fontWeight: 'bold', 
                            color: item.current_stock > 0 ? '#10b981' : '#ef4444',
                            fontSize: '16px'
                          }}>
                            {item.current_stock}
                          </span>
                        </td>
                        <td>
                          {updateVariantId === item.variant_id ? (
                            <form onSubmit={(e) => handleUpdateStock(e, item.variant_id)} style={{ display: 'flex', gap: '6px', alignItems: 'center' }}>
                              <input 
                                type="number" 
                                placeholder="+ Qty" 
                                value={addQty}
                                onChange={(e) => setAddQty(e.target.value)}
                                style={{ width: '70px', padding: '6px 8px', border: '1px solid var(--primary)', borderRadius: '6px', outline: 'none' }}
                                required
                                autoFocus
                              />
                              <button type="submit" title="Save" style={{ background: '#10b981', color: 'white', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Check size={16} />
                              </button>
                              <button type="button" title="Cancel" onClick={() => setUpdateVariantId(null)} style={{ background: '#f1f5f9', color: '#64748b', border: 'none', padding: '6px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <X size={16} />
                              </button>
                            </form>
                          ) : (
                            <button 
                              onClick={() => { setUpdateVariantId(item.variant_id); setAddQty(''); }}
                              style={{ 
                                display: 'flex', alignItems: 'center', gap: '6px',
                                background: '#eff6ff', color: 'var(--primary)', 
                                border: 'none', padding: '8px 12px', borderRadius: '6px', 
                                fontSize: '13px', fontWeight: 500, cursor: 'pointer',
                                transition: 'background 0.2s'
                              }}
                              onMouseEnter={e => e.currentTarget.style.background = '#dbeafe'}
                              onMouseLeave={e => e.currentTarget.style.background = '#eff6ff'}
                            >
                              <PackagePlus size={16} />
                              Update Stock
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={4} style={{ textAlign: 'center', padding: '32px', color: 'var(--text-muted)' }}>
                        No inventory matches your search.
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
    </div>
  );
};

export default AdminInventory;
