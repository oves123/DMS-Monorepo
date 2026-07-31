const express = require('express');
const router = express.Router();
const { getCategories, addCategory, getProducts, addProduct, updateProductVariant, deleteProductVariant, bulkUploadProducts, addProductVariant } = require('../controllers/productController');

// Optional: Add authMiddleware to these routes to ensure only Admin can modify products
router.get('/categories', getCategories);
router.post('/categories', addCategory);

router.get('/', getProducts);
router.post('/', addProduct);
router.post('/bulk', bulkUploadProducts);
router.put('/:variant_id', updateProductVariant);
router.delete('/:variant_id', deleteProductVariant);
router.post('/:product_id/variants', addProductVariant);

module.exports = router;
