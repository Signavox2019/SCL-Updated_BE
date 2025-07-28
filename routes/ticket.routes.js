const express = require('express');
const router = express.Router();
const ticketController = require('../controllers/ticket.controller');
const { uploadTicketFile } = require('../middleware/upload.middleware');
const { protect, authenticate, allowRoles } = require('../middleware/auth.middleware');

router.get('/stats', protect, ticketController.getTicketStats);


// Create Ticket (with optional file upload)
router.post(
  '/',
  protect,
  uploadTicketFile.single('file'),
  ticketController.createTicket
);

// Update Ticket with file (optional)
router.put(
  '/:id',
  protect,
  uploadTicketFile.single('file'),
  ticketController.updateStatus
);


router.put('/forward/:id', protect, allowRoles('admin'), ticketController.forwardTicket);


// Other routes
router.get('/', protect, ticketController.getAllTickets);
router.get('/my', protect, ticketController.getMyTickets);
router.get('/:id', protect, ticketController.getTicketById);
router.delete('/:id', protect, ticketController.deleteTicket);

router.put(
  '/:id/update-by-user',
  protect,
  uploadTicketFile.single('file'),
  ticketController.updateTicketByUser
);

module.exports = router;
