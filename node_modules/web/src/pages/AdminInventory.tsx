import { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import { Search, Filter } from 'lucide-react';

const AdminInventory = () => {
  const [inventory, setInventory] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Inline Editing State
  const [editingCell, setEditingCell] = useState<{ variantId: number, field: 'stock' | 'threshold' } | null>(null);
  const [editValue, setEditValue] = useState('');

  // Pagination, Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [stockFilter, setStockFilter] = useState('All');
  const [showCritical, setShowCritical] = useState(false);
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

  const handleInlineSave = async (variantId: number, field: 'stock' | 'threshold') => {
    if (editValue === '') {
      setEditingCell(null);
      return;
    }

    try {
      const payload: any = {};
      if (field === 'stock') payload.current_stock = editValue;
      if (field === 'threshold') payload.low_stock_threshold = editValue;

      await axios.put(`http://localhost:5001/api/inventory/inline/${variantId}`, payload);
      
      setEditingCell(null);
      setEditValue('');
      fetchInventory(); // Refresh to get updated data
    } catch (err) {
      setError('Failed to update value');
    }
  };

  // Extract unique categories
  const categories = useMemo(() => {
    const cats = inventory.map((item: any) => item.category_name).filter(Boolean);
    return ['All', ...Array.from(new Set(cats))];
  }, [inventory]);

  // Filter and Pagination Logic
  const filteredInventory = useMemo(() => {
    let result = inventory.filter((item: any) => {
      const matchesSearch = item.product_name.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (item.category_name && item.category_name.toLowerCase().includes(searchQuery.toLowerCase()));
      const matchesCategory = selectedCategory === 'All' || item.category_name === selectedCategory;
      const matchesStock = 
        stockFilter === 'All' ? true :
        stockFilter === 'Low Stock' ? item.current_stock <= item.low_stock_threshold :
        stockFilter === 'Out of Stock' ? item.current_stock === 0 : true;
      return matchesSearch && matchesCategory && matchesStock;
    });

    if (showCritical) {
      result.sort((a, b) => {
        const aCritical = a.current_stock <= a.low_stock_threshold;
        const bCritical = b.current_stock <= b.low_stock_threshold;
        if (aCritical && !bCritical) return -1;
        if (!aCritical && bCritical) return 1;
        return a.current_stock - b.current_stock;
      });
    }

    return result;
  }, [inventory, searchQuery, selectedCategory, stockFilter, showCritical]);

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
  }, [searchQuery, selectedCategory, stockFilter, showCritical]);


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
                {(searchQuery || selectedCategory !== 'All' || stockFilter !== 'All' || showCritical) && (
                  <button
                    onClick={() => { setSearchQuery(''); setSelectedCategory('All'); setStockFilter('All'); setShowCritical(false); }}
                    style={{ padding: '6px 12px', fontSize: '13px', background: '#fef3c7', color: '#d97706', border: '1px solid #fde68a', borderRadius: '6px', cursor: 'pointer', fontWeight: 500 }}
                  >
                    ✕ Clear Filters
                  </button>
                )}
              </div>

              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer', fontWeight: 500, color: '#dc2626' }}>
                  <input 
                    type="checkbox" 
                    checked={showCritical} 
                    onChange={(e) => setShowCritical(e.target.checked)}
                    style={{ cursor: 'pointer', accentColor: '#dc2626' }}
                  />
                  Show Critical Stock First
                </label>
                <span style={{ color: 'var(--text-muted)', fontSize: '14px', whiteSpace: 'nowrap' }}>
                  Showing {filteredInventory.length > 0 ? indexOfFirstItem + 1 : 0} to {Math.min(indexOfLastItem, filteredInventory.length)} of {filteredInventory.length} entries
                </span>
              </div>
            </div>

            <div style={{ overflowX: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>Pack Size</th>
                    <th>Current Stock</th>
                    <th>Alert Limit</th>
                  </tr>
                </thead>
                <tbody>
                  {currentItems.length > 0 ? (
                    currentItems.map((item) => {
                      const isLowStock = item.current_stock <= item.low_stock_threshold;
                      
                      return (
                      <tr key={item.variant_id}>
                        <td style={{ fontWeight: 500 }}>
                          {item.product_name} 
                          <span style={{ color: '#6b7280', fontSize: '12px', display: 'block' }}>{item.category_name}</span>
                        </td>
                        <td>{item.pack_size}</td>
                        <td 
                          onClick={() => {
                            setEditingCell({ variantId: item.variant_id, field: 'stock' });
                            setEditValue(item.current_stock.toString());
                          }}
                          style={{ cursor: 'pointer', position: 'relative' }}
                          title="Click to quickly edit stock"
                        >
                          {editingCell?.variantId === item.variant_id && editingCell.field === 'stock' ? (
                            <input 
                              type="number"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleInlineSave(item.variant_id, 'stock')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.variant_id, 'stock');
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              style={{ width: '80px', padding: '6px', border: '2px solid var(--primary)', borderRadius: '4px', outline: 'none' }}
                            />
                          ) : (
                            <span style={{ 
                              fontWeight: 'bold', 
                              color: isLowStock ? '#ef4444' : '#10b981',
                              fontSize: '16px',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              padding: '6px',
                              borderRadius: '4px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {item.current_stock}
                              {isLowStock && <span style={{ fontSize: '18px' }}>⚠️</span>}
                            </span>
                          )}
                        </td>
                        <td 
                          onClick={() => {
                            setEditingCell({ variantId: item.variant_id, field: 'threshold' });
                            setEditValue(item.low_stock_threshold?.toString() || '50');
                          }}
                          style={{ cursor: 'pointer' }}
                          title="Click to quickly edit limit"
                        >
                          {editingCell?.variantId === item.variant_id && editingCell.field === 'threshold' ? (
                            <input 
                              type="number"
                              autoFocus
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onBlur={() => handleInlineSave(item.variant_id, 'threshold')}
                              onKeyDown={(e) => {
                                if (e.key === 'Enter') handleInlineSave(item.variant_id, 'threshold');
                                if (e.key === 'Escape') setEditingCell(null);
                              }}
                              style={{ width: '80px', padding: '6px', border: '2px solid #f59e0b', borderRadius: '4px', outline: 'none' }}
                            />
                          ) : (
                            <span style={{ 
                              color: '#64748b',
                              fontSize: '15px',
                              padding: '6px',
                              borderRadius: '4px',
                              transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#f1f5f9'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                            >
                              {item.low_stock_threshold || 50}
                            </span>
                          )}
                        </td>
                      </tr>
                      );
                    })
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
