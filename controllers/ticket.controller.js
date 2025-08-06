const Ticket = require('../models/Ticket');
const User = require('../models/User');
const cloudinary = require('../utils/cloudinary');
const sendNotification = require('../utils/sendNotification');
const sendEmail = require('../utils/sendEmail'); // <-- Assumes sendEmail(to, subject, html)
const moment = require('moment');
const { getPriorityLevel } = require('../utils/priorityManager');

// Round-robin support assignment
let supportIndex = 0;

// Generate TicketID
// const generateTicketId = async (userFirstName) => {
//   const count = await Ticket.countDocuments() + 1;
//   const padded = String(count).padStart(3, '0');
//   return `SCLINT+${padded}+${userFirstName[0].toUpperCase()}`;
// };

// Round-robin support assignment (only approved support users)
const getSupportUser = async () => {
  const supportUsers = await User.find({ role: 'support', approveStatus: 'approved' });
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
// Controller to create a ticket
// exports.createTicket = async (req, res) => {
//   try {
//     const { title, description } = req.body;
//     const file = req.file;
//     const user = req.user; // from token via protect middleware

//     // Validate user
//     if (!user || !user.firstName) {
//       return res.status(400).json({
//         success: false,
//         message: 'Invalid user data from token. Please ensure the user is authenticated and has a valid firstName.',
//       });
//     }

//     // Generate ticket ID
//     const userFirstLetter = user.firstName.charAt(0).toUpperCase();
//     const count = await Ticket.countDocuments();
//     const ticketId = `SCLINT${String(count + 1).padStart(3, '0')}${userFirstLetter}`;

//     // Get support user via round-robin
//     const supportUser = await getSupportUser();

//     // Upload file to Cloudinary (if present)
//     let fileUrl = null;
//     if (file) {
//       const result = await cloudinary.uploader.upload(file.path, {
//         folder: 'scl/tickets',
//         resource_type: 'auto'
//       });
//       fileUrl = result.secure_url;
//     }

//     // Create ticket
//     const ticket = new Ticket({
//       ticketId,
//       title,
//       description,
//       fileUrl, // Store Cloudinary URL here
//       createdBy: user._id,
//       handledBy: supportUser?._id || null,
//       status: 'Pending',
//       priority: 'Low'
//     });

//     await ticket.save();

//     // Notify creator
//     await sendNotification({
//       userId: user._id,
//       title: '🎫 Ticket Created',
//       message: `Your ticket ${ticket.ticketId} has been successfully created.`
//     });

//     // Notify assigned support staff
//     if (supportUser) {
//       await sendNotification({
//         userId: supportUser._id,
//         title: '📥 New Ticket Assigned',
//         message: `You have been assigned a new ticket ${ticket.ticketId}.`
//       });
//     }

//     res.status(201).json({
//       success: true,
//       message: 'Ticket created successfully',
//       ticket
//     });

//   } catch (err) {
//     console.error('Error creating ticket:', err);
//     res.status(500).json({
//       success: false,
//       message: 'Server error while creating ticket',
//       error: err.message
//     });
//   }
// };


// AWS SDK v3
const { S3Client } = require('@aws-sdk/client-s3');

// Initialize S3 client (v3)
const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

// Generate unique ticket ID
const generateTicketId = async (userFirstLetter) => {
  let count = await Ticket.estimatedDocumentCount();
  let ticketId;
  let exists = true;

  while (exists) {
    ticketId = `SCLINT${String(count + 1).padStart(3, '0')}${userFirstLetter}`;
    const duplicate = await Ticket.findOne({ ticketId });
    if (!duplicate) exists = false;
    else count++;
  }

  return ticketId;
};

exports.createTicket = async (req, res) => {
  try {
    const { title, description } = req.body;
    const file = req.file; // file uploaded via multer-s3
    const user = req.user; // from auth middleware

    // Validate user
    if (!user || !user.firstName) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user data from token. Please ensure the user is authenticated and has a valid firstName.',
      });
    }

    const userFirstLetter = user.firstName.charAt(0).toUpperCase();
    const ticketId = await generateTicketId(userFirstLetter);

    // Get support user
    const supportUser = await getSupportUser();

    // S3 file URL
    const fileUrl = file?.location || null;

    const ticket = new Ticket({
      ticketId,
      title,
      description,
      fileUrl,
      createdBy: user._id,
      handledBy: supportUser?._id || null,
      status: 'Pending',
      priority: 'Low',
    });

    await ticket.save();

    // Notify ticket creator
    await sendNotification({
      userId: user._id,
      title: '🎫 Ticket Created',
      message: `Your ticket ${ticket.ticketId} has been successfully created.`,
    });

    // Notify assigned support staff
    if (supportUser) {
      await sendNotification({
        userId: supportUser._id,
        title: '📥 New Ticket Assigned',
        message: `You have been assigned a new ticket ${ticket.ticketId}.`,
      });
    }

    res.status(201).json({
      success: true,
      message: 'Ticket created successfully',
      ticket,
    });

  } catch (err) {
    console.error('Error creating ticket:', err);
    res.status(500).json({
      success: false,
      message: 'Server error while creating ticket',
      error: err.message,
    });
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
    const tickets = await Ticket.find({ createdBy: req.user._id }).populate('handledBy', 'firstName email').populate('forwardedTo', 'firstName email').populate('createdBy', 'firstName email');
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

    await sendNotification({
      userId: user._id,
      title: 'Ticket Status Updated',
      message: `Your ticket ${ticket.title} (${ticket.ticketId}) status has been updated to ${ticket.status}.`
    });

    if (handler) {
      await sendNotification({
        userId: handler._id,
        title: 'Ticket Status Changed',
        message: `The status of ticket ${ticket.ticketId} has been changed to ${ticket.status}.`
      });
    }

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

    await sendNotification({
      userId: ticket.createdBy._id,
      title: '🔁 Ticket Forwarded',
      message: `Your ticket ${ticket.ticketId} has been forwarded to ${supportUser.firstName}`
    });

    await sendNotification({
      userId: supportUser._id,
      title: '📥 New Ticket Assigned',
      message: `You have been assigned a forwarded ticket ${ticket.ticketId}`
    });

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
    const pending = await Ticket.countDocuments({ status: 'Pending' });
    const solved = await Ticket.countDocuments({ status: 'Solved' });
    const breached = await Ticket.countDocuments({ status: 'Breached' });
    const closed = await Ticket.countDocuments({ status: 'Closed' });
    const open = await Ticket.countDocuments({ status: 'Open' });

    res.json({ total, pending, solved, breached, closed, open });
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

        await sendNotification({
          userId: ticket.createdBy._id,
          title: '⏰ Ticket Breached',
          message: `Your ticket ${ticket.ticketId} has breached the SLA limit.`
        });

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

    if (
      req.user._id.toString() !== ticket.createdBy.toString() &&
      !['admin', 'support'].includes(req.user.role)
    ) {
      return res.status(403).json({ message: 'Unauthorized to update ticket' });
    }

    Object.assign(ticket, updates);

    if (req.file) {
      ticket.file = req.file.path;
    }

    await ticket.save();

    await sendNotification({
      userId: ticket.createdBy,
      title: '🛠 Ticket Updated',
      message: `Your ticket ${ticket.ticketId} has been updated.`
    });

    if (ticket.handledBy) {
      await sendNotification({
        userId: ticket.handledBy,
        title: '🔔 Ticket Modified',
        message: `Ticket ${ticket.ticketId} has been updated.`
      });
    }

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



exports.updateTicketByUser = async (req, res) => {
  try {
    const { id } = req.params;
    const userId = req.user._id; // from auth middleware
    const { title, description } = req.body;

    // Find the ticket
    const ticket = await Ticket.findById(id);
    if (!ticket) {
      return res.status(404).json({ message: 'Ticket not found' });
    }

    // Ensure the user owns the ticket
    if (ticket.createdBy.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Unauthorized: You can only update your own ticket' });
    }

    // Update file if new file is uploaded
    if (req.file && req.file.location) {
      ticket.fileUrl = req.file.location; // S3 file URL
    }

    // Update title and description if provided
    if (title) ticket.title = title;
    if (description) ticket.description = description;

    await ticket.save();

    res.status(200).json({
      message: 'Ticket updated successfully',
      ticket,
    });

  } catch (error) {
    console.error('❌ Error updating ticket by user:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
};



exports.getMyTicketStats = async (req, res) => {
  try {
    const userId = req.user._id;

    const tickets = await Ticket.find({ createdBy: userId });

    const stats = {
      total: tickets.length,
      pending: 0,
      open: 0,
      solved: 0,
      closed: 0,
      breached: 0,
    };

    tickets.forEach(ticket => {
      const status = ticket.status?.toLowerCase();
      if (status === 'pending') stats.pending += 1;
      else if (status === 'open') stats.open += 1;
      else if (status === 'solved') stats.solved += 1;
      else if (status === 'closed') stats.closed += 1;
      else if (status === 'breached') stats.breached += 1;
    });

    res.status(200).json({
      success: true,
      message: "User ticket stats fetched successfully",
      data: stats,
    });
  } catch (error) {
    console.error('Error getting user ticket stats:', error);
    res.status(500).json({
      success: false,
      message: 'Internal Server Error',
    });
  }
};


exports.getTicketStatsByMonth = async (req, res) => {
  try {
    const { month } = req.query;

    if (!month) {
      return res.status(400).json({
        success: false,
        message: 'month query parameter is required in YYYY-MM format',
      });
    }

    const start = moment(month, 'YYYY-MM').startOf('month').toDate();
    const end = moment(month, 'YYYY-MM').endOf('month').toDate();

    const tickets = await Ticket.find({
      createdAt: { $gte: start, $lte: end },
    });

    const monthlyStats = {
      total: 0,
      pending: 0,
      open: 0,
      solved: 0,
      closed: 0,
      breached: 0,
    };

    tickets.forEach(ticket => {
      monthlyStats.total += 1;

      const status = ticket.status?.toLowerCase();
      if (status === 'pending') monthlyStats.pending += 1;
      else if (status === 'open') monthlyStats.open += 1;
      else if (status === 'solved') monthlyStats.solved += 1;
      else if (status === 'closed') monthlyStats.closed += 1;
      else if (status === 'breached') monthlyStats.breached += 1;
    });

    res.status(200).json({
      success: true,
      message: `Ticket stats for ${month} fetched successfully`,
      data: { [month]: monthlyStats },
    });
  } catch (error) {
    console.error('Error fetching ticket stats by month:', error);
    res.status(500).json({
      success: false,
      message: 'Internal server error',
    });
  }
};



exports.getMyAssignedTickets = async (req, res) => {
  try {
    const user = req.user; // Populated by protect middleware

    if (!user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    // Optional: Ensure only support role can access this route
    if (user.role !== 'support') {
      return res.status(403).json({ message: 'Access denied: Only support users can view assigned tickets' });
    }

    const tickets = await Ticket.find({ handledBy: user._id })
      .populate('createdBy', 'firstName lastName email') // optional: show who created it
      .sort({ createdAt: -1 }); // newest first

    res.status(200).json({
      success: true,
      message: `Tickets assigned to ${user.firstName}`,
      total: tickets.length,
      tickets,
    });
  } catch (error) {
    console.error('Error fetching assigned tickets:', error);
    res.status(500).json({ message: 'Failed to fetch assigned tickets' });
  }
};