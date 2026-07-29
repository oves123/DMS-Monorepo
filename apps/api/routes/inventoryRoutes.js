const express = require('express');
const router = express.Router();
const { getInventory, updateStock } = require('../controllers/inventoryController');

router.get('/', getInventory);
router.post('/update', updateStock);

module.exports = router;
