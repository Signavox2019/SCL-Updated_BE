// const cron = require('node-cron');
// const Ticket = require('../models/Ticket');
// const getPriorityLevel = require('../utils/priorityManager');

// async function updateTicketPriorities() {
//   try {
//     const tickets = await Ticket.find({ status: { $ne: 'Closed' } });

//     for (const ticket of tickets) {
//       const newPriority = getPriorityLevel(ticket.createdAt);

//       if (ticket.priority !== newPriority) {
//         ticket.priority = newPriority;
//         await ticket.save();
//       }
//     }

//     console.log('[CRON] Ticket priorities updated.');
//   } catch (err) {
//     console.error('[CRON] Error updating ticket priorities:', err);
//   }
// }

// // Schedule it to run every 15 mins
// cron.schedule('*/15 * * * *', updateTicketPriorities);





const cron = require('node-cron');
const Ticket = require('../models/Ticket');
const getPriorityLevel = require('../utils/priorityManager');

async function updateTicketPriorities() {
  try {
    // Only get tickets that are not Closed or Solved
    const tickets = await Ticket.find({ status: { $nin: ['Solved', 'Closed'] } });

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

// Run every 15 minutes
cron.schedule('*/15 * * * *', updateTicketPriorities);
