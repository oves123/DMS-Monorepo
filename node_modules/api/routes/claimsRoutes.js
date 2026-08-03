const express = require('express');
const router = express.Router();
const multer = require('multer');
const { submitClaim, getClaims, updateClaimStatus, getClaimImage, getDistributorClaims } = require('../controllers/claimsController');

const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// Distributor endpoints
router.post('/submit', upload.single('image'), submitClaim);
router.get('/distributor/:distributor_id', getDistributorClaims);

// Admin endpoints
router.get('/', getClaims); // Optional: add verifyToken and admin check
router.get('/:claim_id/image', getClaimImage);
router.put('/:claim_id/status', updateClaimStatus);

module.exports = router;
