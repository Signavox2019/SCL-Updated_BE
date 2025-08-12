const express = require('express');
const router = express.Router();
const batchController = require('../controllers/batch.controller');
const { protect, allowRoles } = require('../middleware/auth.middleware');


// Example: GET /api/batches/date-range?startDate=2025-06-01&endDate=2025-07-30
router.get('/date-range', protect, allowRoles('admin'), batchController.getBatchesByDateRange);



router.post('/',  protect, allowRoles('admin'),  batchController.createBatch);
router.get('/',  protect, allowRoles('admin', 'support'),  batchController.getAllBatches);
router.get('/stats',  protect, allowRoles('admin', 'support'),  batchController.getBatchStats);
router.get('/:id',  protect, allowRoles('admin'),  batchController.getBatchById);
router.put('/:id',  protect, allowRoles('admin'),  batchController.updateBatch);
router.delete('/:id',  protect, allowRoles('admin'),  batchController.deleteBatch);



router.post('/send-certificates', protect, allowRoles('admin'), batchController.sendBatchCertificates);
router.get('/batch-certificates/stats/:batchId', protect, allowRoles('admin'), batchController.getBatchCertificateStatus);
router.get('/batch-certificates/stats/', protect, allowRoles('admin'), batchController.getAllBatchesCertificateStatus);

// GET /api/batches/available-users/:courseId
router.get('/available-users/:courseId', batchController.getAvailableUsersForBatch);

// GET /api/batches/user-breakdown/:courseId/:batchId
router.get('/user-breakdown/:courseId/:batchId', batchController.getBatchUserBreakdown);


module.exports = router;
