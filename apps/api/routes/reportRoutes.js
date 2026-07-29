const express = require('express');
const router = express.Router();
const { 
    getAdminSales, 
    getAdminTopProducts, 
    getAdminTopDistributors, 
    getAdminInventoryAlerts,
    getDistributorPurchases,
    getDistributorTopProducts 
} = require('../controllers/reportsController');

// Admin Reports
router.get('/admin/sales', getAdminSales);
router.get('/admin/products', getAdminTopProducts);
router.get('/admin/distributors', getAdminTopDistributors);
router.get('/admin/inventory', getAdminInventoryAlerts);

// Distributor Reports
router.get('/distributor/:id/purchases', getDistributorPurchases);
router.get('/distributor/:id/products', getDistributorTopProducts);

module.exports = router;
