const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getCompanySettings, updateCompanySettings, getQRCode } = require('../controllers/settingsController');

const storage = multer.memoryStorage();
const upload = multer({ storage });

router.get('/company', getCompanySettings);
router.put('/company', upload.single('qr_code_image'), updateCompanySettings);
router.get('/company/qr', getQRCode);

module.exports = router;
