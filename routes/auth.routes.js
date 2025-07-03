const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');

// Register new user
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

// Forgot password (send OTP)
router.post('/forgot-password', authController.sendOTP);

// Reset password using OTP
router.post('/reset-password', authController.resetPassword);

module.exports = router;
