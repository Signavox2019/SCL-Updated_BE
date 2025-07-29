const cron = require('node-cron');
const updateTicketPriorities = require('./priorityUpdater');

// Run every hour (adjust as needed)
cron.schedule('0 * * * *', () => {
  console.log('🕒 Running hourly ticket priority update job...');
  updateTicketPriorities();
});
