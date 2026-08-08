const express = require('express');
const router = express.Router();
const { getAdminOrders, getDistributorOrders, createOrder, executeOrder } = require('../controllers/orderController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/admin', protect, adminOnly, getAdminOrders);
router.put('/:id/execute', protect, adminOnly, executeOrder);

// Distributor Routes
router.post('/', protect, createOrder);
router.get('/distributor/:user_id', protect, getDistributorOrders);

module.exports = router;
