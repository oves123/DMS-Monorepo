const express = require('express');
const router = express.Router();
const { loginUser, resetPassword } = require('../controllers/authController');

// POST /api/auth/login
router.post('/login', loginUser);

// PUT /api/auth/reset-password
router.put('/reset-password', resetPassword);

module.exports = router;
