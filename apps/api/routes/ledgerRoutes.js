const express = require('express');
const router = express.Router();
const { getInvoices, getInvoiceDetail } = require('../controllers/ledgerController');

router.get('/', getInvoices);
router.get('/invoice/:order_id', getInvoiceDetail);

module.exports = router;
