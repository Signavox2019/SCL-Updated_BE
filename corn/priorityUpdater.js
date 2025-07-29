const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const { getPriorityLevel } = require('../utils/priorityManager');

const updateTicketPriorities = async () => {
  try {
    const tickets = await Ticket.find({ status: { $ne: 'Closed' } });

    for (let ticket of tickets) {
      const newPriority = getPriorityLevel(ticket.createdAt);
      if (ticket.priority !== newPriority) {
        ticket.priority = newPriority;
        await ticket.save();
      }
    }

    console.log(`[CRON] Ticket priorities updated at ${new Date().toISOString()}`);
  } catch (err) {
    console.error('[CRON] Error updating ticket priorities:', err);
  }
};

// Run every hour between 9am and 6pm, Monday to Friday
cron.schedule('0 9-18 * * 1-5', updateTicketPriorities);
