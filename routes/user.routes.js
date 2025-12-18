const express = require('express');
const router = express.Router();
const userController = require('../controllers/user.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Installments CRUD (admin only)
router.post('/:userId/installments', protect, allowRoles('admin'), upload.single('paymentSnapshot'), userController.addInstallment);
router.put('/:userId/installments/:installmentId', protect, allowRoles('admin'), upload.single('paymentSnapshot'), userController.updateInstallment);
router.delete('/:userId/installments/:installmentId', protect, allowRoles('admin'), userController.deleteInstallment);
router.get('/:userId/installments', protect, allowRoles('admin', 'support'), userController.getInstallments);

// Logged-in user's own profile
router.get('/me', protect, userController.getOwnProfile);

// Own offer letter
// router.get('/:userId/offer-letter', protect, userController.generateOfferLetter);

// ✅ Waiting users – only for admin
router.get('/waiting', protect, allowRoles('admin'), userController.getWaitingUsers);

// ✅ All users – admin and support can access
router.get('/', protect, allowRoles('admin', 'support'), userController.getAllUsers);

// ✅ Specific user by ID – admin and support can access
router.get('/:id', protect, allowRoles('admin', 'support'), userController.getUser);

// ✅ Approve/reject user – still admin only
router.put('/status/:id', protect, allowRoles('admin'), userController.updateUserStatus);

// ✅ Admin update a user – admin and support
router.put('/admin/update-user/:id', protect, allowRoles('admin', 'support'), userController.updateUserByAdmin);

// ✅ Self profile update
router.put('/me/update-profile', protect, userController.updateOwnProfile);

// ✅ Delete user – admin and support
router.delete('/:id', protect, allowRoles('admin', 'support'), userController.deleteUser);

// ✅ User metrics – admin and support
router.get('/stats/metrics', protect, allowRoles('admin', 'support'), userController.userStats);

router.post(
  '/:userId/offer-letter',
  protect,
  allowRoles('admin'),
  userController.generateOfferLetterByAdmin
);

router.get(
  '/me/offer-letter',
  protect,
  userController.getMyOfferLetter
);

module.exports = router;
