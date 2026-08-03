const express = require('express');
const router = express.Router();
const { getInventory, updateStock, updateStockInline } = require('../controllers/inventoryController');

router.get('/', getInventory);
router.post('/update', updateStock);
router.put('/inline/:variant_id', updateStockInline);

module.exports = router;
