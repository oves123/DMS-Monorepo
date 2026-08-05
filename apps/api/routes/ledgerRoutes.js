const express = require('express');
const router = express.Router();
const { getInvoices, getInvoiceDetail, recordPayment, getInvoicePayments, getDistributorLedger } = require('../controllers/ledgerController');

router.get('/', getInvoices);
router.get('/invoice/:order_id', getInvoiceDetail);

router.post('/payment/record', recordPayment);
router.get('/payment/invoice/:invoice_id', getInvoicePayments);
router.get('/payment/distributor/:distributor_id', getDistributorLedger);

module.exports = router;
