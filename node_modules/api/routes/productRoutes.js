const express = require('express');
const router = express.Router();
const { getCategories, addCategory, getProducts, addProduct, updateProductVariant, deleteProductVariant } = require('../controllers/productController');

// Optional: Add authMiddleware to these routes to ensure only Admin can modify products
router.get('/categories', getCategories);
router.post('/categories', addCategory);

router.get('/', getProducts);
router.post('/', addProduct);
router.put('/:variant_id', updateProductVariant);
router.delete('/:variant_id', deleteProductVariant);

module.exports = router;
