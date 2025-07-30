const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const getPriorityLevel = require('../utils/priorityManager');

async function updateTicketPriorities() {
  try {
    const tickets = await Ticket.find({ status: { $ne: 'Closed' } });

    for (const ticket of tickets) {
      const newPriority = getPriorityLevel(ticket.createdAt);

      if (ticket.priority !== newPriority) {
        ticket.priority = newPriority;
        await ticket.save();
      }
    }

    console.log('[CRON] Ticket priorities updated.');
  } catch (err) {
    console.error('[CRON] Error updating ticket priorities:', err);
  }
}

// Schedule it to run every 15 mins
cron.schedule('*/15 * * * *', updateTicketPriorities);
