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
// ✅ Approve or Reject User Registration (Admin)
exports.updateUserStatus = async (req, res) => {
  try {
    const { approveStatus } = req.body;

    // Validate incoming approveStatus value
    const validStatuses = ['approved', 'rejected', 'waiting'];
    if (!validStatuses.includes(approveStatus)) {
      return res.status(400).json({ message: "Invalid approve status" });
    }

    // Find user and include generatedPassword
    // let user = await User.findById(req.params.id).select('+generatedPassword');
    let user = await User.findById(req.params.id).select('+generatedPassword');

    if (!user) return res.status(404).json({ message: "User not found" });
    console.log('User found:', user);
    // Update approval fields
    user.approveStatus = approveStatus;
    user.isApproved = approveStatus === 'approved';

    await user.save();

    // ✅ Send approval email only if approved and password exists
    // console.log('Generated password:', user.generatedPassword, approveStatus);
    if (approveStatus === 'approved' && user.generatedPassword) {
      // console.log('Generated password:', user.generatedPassword, approveStatus);
      // console.log('Generated password:', user.generatedPassword);
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

      // Remove plaintext password for security
      user.generatedPassword = undefined;
      await user.save();
    }

    res.status(200).json({ message: "User status updated successfully", user });
  } catch (error) {
    res.status(500).json({ message: "Error updating user status", error });
  }
};



exports.updateUserRole = async (req, res) => {
  try {
    const { userId, newRole } = req.body;
    // const validRoles = ['Admin', 'Intern'];
    const validRoles = ['Admin', 'Intern'];
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
    const approved = await User.find({ approveStatus: 'approved' });
    const pending = await User.find({ approveStatus: 'waiting' });
    const rejected = await User.find({ approveStatus: 'rejected' });

    const professorCount = await Professor.countDocuments();
    const professors = await Professor.find();

    res.status(200).json({
      totalUsers: total,
      counts: {
        interns: interns.length,
        professors: professorCount,
        admins: admins.length,
        approvedUsers: approved.length,
        pendingApprovals: pending.length,
        rejectedUsers: rejected.length,
      },
      users: {
        interns,
        professors,
        admins,
        approved,
        pending,
        rejected
      }
    });
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch user stats", error });
  }
};



// ✅ Get all users waiting for approval
exports.getWaitingUsers = async (req, res) => {
  try {
    const waitingUsers = await User.find({ approveStatus: 'waiting' }).sort({ registeredAt: -1 });

    res.status(200).json({
      message: 'Users awaiting approval fetched successfully',
      count: waitingUsers.length,
      users: waitingUsers
    });
  } catch (error) {
    res.status(500).json({ message: 'Failed to fetch users awaiting approval', error });
  }
};

// Admin can update any user's profile
exports.updateUserByAdmin = async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const updatedUser = await User.findByIdAndUpdate(id, updates, {
      new: true,
      runValidators: true
    });

    if (!updatedUser) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.status(200).json({
      message: 'User updated successfully by admin',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating user by admin', error });
  }
};



// Get own profile
exports.getOwnProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('-password -generatedPassword');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};


// Update own profile (intern-safe)
exports.updateOwnProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const allowedFields = [
      'firstName', 'middleName', 'lastName',
      'profileImage', 'phone', 'resume',
      'collegeName', 'department', 'university',
      'degree', 'specialization', 'cgpa', 'currentYear', 'isGraduated', 'yearOfPassing',
      'hasExperience', 'previousCompany', 'position', 'yearsOfExperience',
      'employeeAddress'
    ];

    const updates = {};
    allowedFields.forEach(field => {
      if (req.body[field] !== undefined) updates[field] = req.body[field];
    });

    const updatedUser = await User.findByIdAndUpdate(userId, updates, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      message: 'Profile updated successfully',
      user: updatedUser
    });
  } catch (error) {
    res.status(500).json({ message: 'Error updating profile', error });
  }
};



exports.getOwnProfile = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('-password -generatedPassword');

    if (!user) return res.status(404).json({ message: 'User not found' });

    res.status(200).json({ user });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching profile', error });
  }
};
