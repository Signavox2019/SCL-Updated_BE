const http = require('http');
const app = require('./app');
const { initializeSocket } = require('./socketServer'); // ✅ correct import


const server = http.createServer(app);

initializeSocket(server); // ✅ setup socket before listen

require('./corn/priorityUpdater'); // ✅ Start cron job when server starts

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});
