const express = require('express');
const router = express.Router();
const { getAdminOrders, executeOrder, createOrder, getDistributorOrders } = require('../controllers/orderController');

router.get('/admin', getAdminOrders);
router.put('/:id/execute', executeOrder);

// Distributor Routes
router.post('/', createOrder);
router.get('/distributor/:user_id', getDistributorOrders);

module.exports = router;
