const express = require('express');
const router = express.Router();
const { getInvoices, getInvoiceDetail, recordPayment, recordBulkPayment, getInvoicePayments, getDistributorLedger, downloadInvoicePdf, deleteInvoice } = require('../controllers/ledgerController');
const { protect, adminOnly } = require('../middleware/authMiddleware');

router.get('/', protect, getInvoices);
router.get('/invoice/:order_id', protect, getInvoiceDetail);
router.get('/invoice/:order_id/download', protect, downloadInvoicePdf);
router.delete('/invoice/:invoice_number', protect, adminOnly, deleteInvoice);

router.post('/payment/record', protect, adminOnly, recordPayment);
router.post('/payment/record-bulk', protect, adminOnly, recordBulkPayment);
router.get('/payment/invoice/:invoice_id', protect, getInvoicePayments);
router.get('/payment/distributor/:distributor_id', protect, getDistributorLedger);

module.exports = router;
