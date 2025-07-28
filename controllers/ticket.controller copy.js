const Ticket = require('../models/Ticket');
const User = require('../models/User');
const cloudinary = require('../utils/cloudinary');
const sendNotification = require('../utils/sendNotification');
const sendEmail = require('../utils/sendEmail'); // <-- Assumes sendEmail(to, subject, html)
const moment = require('moment');

// Round-robin support assignment
let supportIndex = 0;

// Generate TicketID
const generateTicketId = async (userFirstName) => {
  const count = await Ticket.countDocuments() + 1;
  const padded = String(count).padStart(3, '0');
  return `SCLINT+${padded}+${userFirstName[0].toUpperCase()}`;
};

// Round-robin support assignment
const getSupportUser = async () => {
  const supportUsers = await User.find({ role: 'support' });
  if (supportUsers.length === 0) return null;
  const user = supportUsers[supportIndex % supportUsers.length];
  supportIndex++;
  return user;
};

// Priority calculation based on time left
const calculatePriority = (createdAt) => {
  const diff = moment().diff(moment(createdAt), 'hours');
  if (diff < 12) return 'low';
  if (diff < 18) return 'medium';
  if (diff < 23) return 'high';
  return 'critical';
};

// Create a ticket
exports.createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file;

    const user = req.user; // from token

    // Generate TicketID: SCLINT+001+<FirstLetter>
    const userFirstLetter = user.firstName.charAt(0).toUpperCase();
    const count = await Ticket.countDocuments();
    const ticketId = `SCLINT${String(count + 1).padStart(3, '0')}${userFirstLetter}`;

    const ticket = new Ticket({
      ticketId,
      title,
      description,
      file: file ? file.path : null,
      createdBy: user._id,
      status: 'Open',
      priority: 'Low',
    });

    await ticket.save();

    // TODO: Trigger round-robin assignment + notify support team

    res.status(201).json({ message: 'Ticket created', ticket });
  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({ message: 'Server error' });
  }
};


// Get all tickets (admin/support)
exports.getAllTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find().populate('createdBy handledBy forwardedTo', 'firstName email');
    res.json(tickets);
  } catch (err) {
    console.error('❌ Error fetching tickets:', err);
    res.status(500).json({ message: 'Failed to fetch tickets' });
  }
};

// get ticket by ID
exports.getTicketById = async (req, res) => {
  try {
    const { id } = req.params;
    const ticket = await Ticket.findById(id).populate('createdBy handledBy forwardedTo', 'firstName email');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });
    res.json(ticket);
  } catch (err) {
    console.error('❌ Error fetching ticket:', err);
    res.status(500).json({ message: 'Failed to fetch ticket' });
  }
}

// Get current user's tickets
exports.getMyTickets = async (req, res) => {
  try {
    const tickets = await Ticket.find({ createdBy: req.user._id });
    res.json(tickets);
  } catch (err) {
    console.error('❌ Error fetching user tickets:', err);
    res.status(500).json({ message: 'Failed to fetch your tickets' });
  }
};

// Update ticket status and notify
exports.updateStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const ticket = await Ticket.findById(id).populate('createdBy handledBy');
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    ticket.status = status;
    ticket.updatedAt = new Date();
    if (status === 'solved') ticket.resolvedAt = new Date();

    await ticket.save();

    const user = ticket.createdBy;
    const handler = ticket.handledBy;

    // Socket notification
    // sendNotification(user._id, `📢 Your ticket "${ticket.title}" is now marked as *${status.toUpperCase()}*`);
    // console.log(ticket.createdBy._id);
    // console.log(ticket.createdBy);

    // sendNotification({
    //   userId: ticket.createdBy._id,
    //   title: 'Ticket Status Update',
    //   message: `Your ticket "${ticket.title}" is now marked as "${ticket.status}".`
    // });


    await sendNotification({
      userId: ticket.createdBy._id,
      title: 'Ticket Status Updated',
      message: `Your ticket ${ticket.title} (${ticket.ticketId}) status has been updated to ${ticket.status}.`
    });
    console.log("✅ Notification triggered for ticket:", ticket.ticketId);


    // Email notification
    await sendEmail(
      user.email,
      `🎫 Ticket "${ticket.title}" Updated`,
      `
        <p>Hello ${user.firstName},</p>
        <p>Your ticket "<strong>${ticket.title}</strong>" has been updated to <strong>${status.toUpperCase()}</strong>.</p>
        <p><strong>Handled By:</strong> ${handler?.firstName || 'Support Team'}</p>
        <p>Thank you,<br/>SCL Support Team</p>
      `
    );

    res.json({ message: 'Status updated successfully', ticket });
  } catch (err) {
    console.error('❌ Error updating ticket status:', err);
    res.status(500).json({ message: 'Failed to update ticket status' });
  }
};

// Forward ticket to another support user
exports.forwardTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const { supportUserId } = req.body;

    const ticket = await Ticket.findById(id).populate('createdBy');
    const supportUser = await User.findById(supportUserId);

    if (!ticket || !supportUser || supportUser.role !== 'support') {
      return res.status(400).json({ message: 'Invalid ticket or user' });
    }

    ticket.forwardedTo = supportUser._id;
    ticket.handledBy = supportUser._id;
    ticket.updatedAt = new Date();

    await ticket.save();

    sendNotification(ticket.createdBy._id, `🔁 Ticket "${ticket.title}" was forwarded to ${supportUser.firstName}`);

    await sendEmail(
      ticket.createdBy.email,
      `🔁 Ticket "${ticket.title}" Forwarded`,
      `
        <p>Hello ${ticket.createdBy.firstName},</p>
        <p>Your ticket "<strong>${ticket.title}</strong>" has been forwarded to <strong>${supportUser.firstName}</strong>.</p>
        <p>We appreciate your patience.</p>
      `
    );

    res.json({ message: 'Ticket forwarded successfully', ticket });
  } catch (err) {
    console.error('❌ Error forwarding ticket:', err);
    res.status(500).json({ message: 'Failed to forward ticket' });
  }
};

// Ticket stats summary
exports.getTicketStats = async (req, res) => {
  try {
    const total = await Ticket.countDocuments();
    const pending = await Ticket.countDocuments({ status: 'pending' });
    const solved = await Ticket.countDocuments({ status: 'solved' });
    const breached = await Ticket.countDocuments({ status: 'breached' });

    res.json({ total, pending, solved, breached });
  } catch (err) {
    console.error('❌ Error fetching ticket stats:', err);
    res.status(500).json({ message: 'Failed to fetch stats' });
  }
};

// Check for ticket breaches (for cron)
exports.checkTicketBreaches = async () => {
  try {
    const now = new Date();
    const tickets = await Ticket.find({ status: 'pending' }).populate('createdBy');

    for (const ticket of tickets) {
      const hoursPassed = moment(now).diff(moment(ticket.createdAt), 'hours');

      if (hoursPassed >= 24) {
        ticket.status = 'breached';
        await ticket.save();

        sendNotification(ticket.createdBy._id, `⏰ Ticket "${ticket.title}" is now marked as BREACHED`);
        await sendEmail(
          ticket.createdBy.email,
          `🚨 Ticket "${ticket.title}" Breached`,
          `<p>Your ticket "<strong>${ticket.title}</strong>" has been marked as <strong>BREACHED</strong> due to SLA violation.</p>`
        );
      } else {
        ticket.priority = calculatePriority(ticket.createdAt);
        await ticket.save();
      }
    }
  } catch (err) {
    console.error('❌ Error in breach detection job:', err);
  }
};


// Update ticket - title, description, status, etc.
exports.updateTicket = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Only creator or admin/support can update
    if (
      req.user._id.toString() !== ticket.createdBy.toString() &&
      !['admin', 'support'].includes(req.user.role)
    ) {
      return res.status(403).json({ message: 'Unauthorized to update ticket' });
    }

    // Apply updates
    Object.assign(ticket, updates);

    // If file update (optional)
    if (req.file) {
      ticket.file = req.file.path;
    }

    await ticket.save();
    res.status(200).json({ message: 'Ticket updated successfully', ticket });
  } catch (error) {
    console.error('Error updating ticket:', error);
    res.status(500).json({ message: 'Server error' });
  }
};



// Delete ticket - only creator or admin can delete
exports.deleteTicket = async (req, res) => {
  try {
    const { id } = req.params;

    const ticket = await Ticket.findById(id);
    if (!ticket) return res.status(404).json({ message: 'Ticket not found' });

    // Allow only the creator or admin
    if (
      req.user._id.toString() !== ticket.createdBy.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({ message: 'Unauthorized to delete ticket' });
    }

    await Ticket.findByIdAndDelete(id);
    res.status(200).json({ message: 'Ticket deleted successfully' });
  } catch (error) {
    console.error('Error deleting ticket:', error);
    res.status(500).json({ message: 'Server error' });
  }
};
