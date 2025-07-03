const User = require('../models/User');
const Professor = require('../models/Professor');

const nodemailer = require('nodemailer');

// Nodemailer transporter setup (make sure you’ve already done this)
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

// ✅ Get all users (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ registeredAt: -1 });
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error });
  }
};

// ✅ Get a specific user profile
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: "User not found" });
    res.status(200).json(user);
  } catch (error) {
    res.status(500).json({ message: "Error retrieving user", error });
  }
};

// ✅ Approve or Reject User Registration (Admin)
exports.updateUserStatus = async (req, res) => {
  try {
    const { isApproved } = req.body;

    // Include generatedPassword during fetch
    let user = await User.findById(req.params.id).select('+generatedPassword');
    if (!user) return res.status(404).json({ message: "User not found" });

    // Update status
    user.isApproved = isApproved;
    await user.save();

    console.log(isApproved, user.generatedPassword)

    // Send credentials email if approved
    if (isApproved && user.generatedPassword) {
      // await transporter.sendMail({
      //   from: process.env.EMAIL_USER,
      //   to: user.email,
      //   subject: "Signavox Career Ladder - Account Approved",
      //   html: `
      //     <p>Hello ${user.name},</p>
      //     <p>Your account has been approved by the admin.</p>
      //     <p><strong>Login Credentials:</strong><br/>
      //     Email: ${user.email}<br/>
      //     Password: ${user.generatedPassword}</p>
      //     <p><a href="https://scl.signavoxtechnologies.com">Click here to login</a></p>
      //     <p>We recommend you change your password after first login.</p>
      //   `
      // });

      await transporter.sendMail({
        from: process.env.EMAIL_USER,
        to: user.email,
        subject: "🎉 You're Approved! | Signavox Career Ladder",
        html: `
  <div style="font-family: 'Segoe UI', sans-serif; background-color: #f4f6f8; padding: 30px;">
    <div style="max-width: 600px; margin: auto; background-color: white; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px;">
      <div style="text-align: center;">
        <img src="https://i.imgur.com/DPnG0wq.png" alt="Signavox Logo" style="width: 100px; margin-bottom: 20px;" />
        <h2 style="color: #2E86DE;">Welcome to Signavox Career Ladder 🎓</h2>
        <p style="font-size: 16px; color: #555;">Hello <strong>${user.name}</strong>,</p>
        <p style="font-size: 16px; color: #333;">Your account has been <strong style="color: green;">approved</strong> by the admin. You can now access your learning dashboard and begin your journey!</p>
      </div>
      <hr style="margin: 20px 0; border: none; border-top: 1px solid #ddd;">
      <div style="font-size: 16px; color: #444;">
        <p><strong>Login Credentials:</strong></p>
        <ul style="list-style: none; padding-left: 0;">
          <li><strong>Email:</strong> ${user.email}</li>
          <li><strong>Password:</strong> ${user.generatedPassword}</li>
        </ul>
        <p style="margin-top: 20px;">For security reasons, please change your password after first login.</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="https://scl.signavoxtechnologies.com" style="background-color: #2E86DE; color: white; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold;">🚀 Go to Dashboard</a>
        </div>
      </div>
      <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">
      <div style="font-size: 14px; color: #999; text-align: center;">
        <p>If you have any questions, contact us at <a href="mailto:support@signavoxtechnologies.com" style="color: #2E86DE;">support@signavoxtechnologies.com</a></p>
        <p>&copy; ${new Date().getFullYear()} Signavox Technologies. All rights reserved.</p>
      </div>
    </div>
  </div>
  `
      });


      // Remove plaintext password from DB for security
      user.generatedPassword = undefined;
      await user.save();
    }

    res.status(200).json({ message: "User status updated", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating user status", error });
  }
};

exports.updateUserRole = async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    // const validRoles = ['Admin', 'Intern', 'Professor', 'Viewer'];
    const validRoles = ['Admin', 'Intern', 'Viewer'];
    if (!validRoles.includes(newRole)) return res.status(400).json({ message: 'Invalid role' });

    const user = await User.findByIdAndUpdate(userId, { role: newRole }, { new: true });
    res.status(200).json({ message: 'User role updated', user });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update role', error: err.message });
  }
};


// ✅ Delete User (Admin)
exports.deleteUser = async (req, res) => {
  try {
    const deleted = await User.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: "User not found" });
    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    res.status(500).json({ message: "Error deleting user", error });
  }
};

// ✅ Metrics Count (Admin)
exports.userStats = async (req, res) => {
  try {
    const total = await User.countDocuments();
    const interns = await User.find({ role: 'intern' });
    const admins = await User.find({ role: 'admin' });
    const approved = await User.find({ isApproved: true });
    const pending = await User.find({ isApproved: false });

    const professors = await Professor.find(); // Fetch from Professor model
    const professorCount = await Professor.countDocuments();

    res.status(200).json({
      totalUsers: total,
      counts: {
        interns: interns.length,
        professors: professorCount,
        admins: admins.length,
        approvedUsers: approved.length,
        pendingApprovals: pending.length,
      },
      users: {
        interns,
        professors,
        admins,
        approved,
        pending
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user stats", error });
  }
};


// ✅ Get all users waiting for approval
exports.getWaitingUsers = async (req, res) => {
  try {
    const waitingUsers = await User.find({ isApproved: false }).sort({ registeredAt: -1 });
    res.status(200).json({
      message: 'Pending users fetched successfully',
      count: waitingUsers.length,
      users: waitingUsers
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch pending users', error });
  }
};
