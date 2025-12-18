const User = require('../models/User');
const Professor = require('../models/Professor');
const { generateAndUploadOfferLetter } = require('../utils/generateAndUploadOfferLetter');
const nodemailer = require('nodemailer');

const uploadToS3 = require('../utils/uploadToS3');
const multer = require('multer');
const storage = multer.memoryStorage();
const upload = multer({ storage });

// Nodemailer transporter setup (make sure you’ve already done this)
const transporter = nodemailer.createTransport({
  host: process.env.MAIL_HOST,           // smtp.office365.com
  port: parseInt(process.env.MAIL_PORT), // 587
  secure: process.env.MAIL_SECURE === 'true' ? true : false, // STARTTLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS,
  },
  tls: {
    ciphers: 'SSLv3',
    rejectUnauthorized: false // optional but may help for dev
  }
});






// ✅ Add Installment (Admin)
// exports.addInstallment = async (req, res) => {
//   try {
//     const userId = req.params.userId;
//     const { amountPaid, dateOfPayment, referenceId, description } = req.body;

//     if (!req.file) return res.status(400).json({ message: "Payment snapshot is required" });

//     const paymentSnapshot = await uploadToS3(req.file);

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });

//     // Push installment
//     user.amount.installments.push({
//       amountPaid,
//       dateOfPayment: dateOfPayment || new Date(),
//       referenceId,
//       paymentSnapshot,
//       description
//     });

//     // Save user
//     await user.save();

//     // Get the last installment (this will have _id)
//     const lastInstallment = user.amount.installments.at(-1); // or [user.amount.installments.length - 1]

//     res.status(200).json({
//       message: 'Installment added successfully',
//       installment: lastInstallment
//     });

//   } catch (error) {
//     res.status(500).json({ message: 'Failed to add installment', error });
//   }
// };


// ✅ Add Installment (Admin)
exports.addInstallment = async (req, res) => {
  try {
    const { userId } = req.params;
    const { amountPaid, dateOfPayment, referenceId, description } = req.body;

    let paymentSnapshot = null;
    if (req.file) {
      paymentSnapshot = await uploadToS3(req.file);
    }

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Check uniqueness of referenceId
    const isDuplicate = user.amount.installments.some(
      inst => inst.referenceId === referenceId
    );
    if (isDuplicate) {
      return res.status(400).json({ message: 'Reference ID must be unique' });
    }

    // Create new installment object
    const newInstallment = {
      amountPaid,
      dateOfPayment: dateOfPayment || new Date(),
      referenceId,
      paymentSnapshot, // optional
      description
    };

    // Push and save
    user.amount.installments.push(newInstallment);
    await user.save();

    // Return only the newly created installment
    res.status(201).json({
      message: "Installment added successfully",
      installment: newInstallment
    });
  } catch (error) {
    console.error("Add installment error:", error);
    res.status(500).json({ message: "Failed to add installment", error });
  }
};






// ✅ Update Installment (Admin)
exports.updateInstallment = async (req, res) => {
  try {
    const { userId, installmentId } = req.params;
    const updates = req.body;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    const installment = user.amount.installments.id(installmentId);
    if (!installment) return res.status(404).json({ message: 'Installment not found' });

    Object.assign(installment, updates);

    if (req.file) {
      installment.paymentSnapshot = await uploadToS3(req.file);
    }

    // Recalculate totals
    user.amount.totalPaid = user.amount.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
    user.amount.balanceAmount = Math.max(user.amount.finalAmount - user.amount.totalPaid, 0);

    await user.save();
    res.status(200).json({ message: 'Installment updated', installment });
  } catch (error) {
    res.status(500).json({ message: 'Failed to update installment', error });
  }
};

// ✅ Delete Installment (Admin)
exports.deleteInstallment = async (req, res) => {
  try {
    const { userId, installmentId } = req.params;

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: 'User not found' });

    // Remove the installment
    const initialLength = user.amount.installments.length;
    user.amount.installments = user.amount.installments.filter(
      inst => inst._id.toString() !== installmentId
    );

    if (user.amount.installments.length === initialLength) {
      return res.status(404).json({ message: 'Installment not found' });
    }

    // Recalculate totals
    user.amount.totalPaid = user.amount.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
    user.amount.balanceAmount = Math.max(user.amount.finalAmount - user.amount.totalPaid, 0);

    await user.save();

    res.status(200).json({ message: 'Installment deleted successfully' });

  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Failed to delete installment', error });
  }
};


// ✅ Get Installments (Admin)
exports.getInstallments = async (req, res) => {
  try {
    const user = await User.findById(req.params.userId).select(
      "name email phone amount"
    );

    if (!user) return res.status(404).json({ message: "User not found" });

    res.status(200).json({
      message: "Installments fetched successfully",
      userDetails: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone
      },
      amountDetails: user.amount,
      installments: user.amount.installments
    });
  } catch (error) {
    console.error("Get installments error:", error);
    res.status(500).json({ message: "Failed to fetch installments", error });
  }
};
















// ✅ Get all users (Admin)
exports.getAllUsers = async (req, res) => {
  try {
    const users = await User.find().sort({ registeredAt: -1 }).populate('courseRegisteredFor', 'title').populate('batchAssigned', 'batchName');
    res.status(200).json(users);
  } catch (error) {
    res.status(500).json({ message: "Failed to fetch users", error });
  }
};

// ✅ Get a specific user profile
exports.getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('courseRegisteredFor', 'title').populate('batchAssigned', 'batchName');
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
        <div style="font-family: 'Segoe UI', sans-serif; background-color: #f3f4f6; padding: 40px;">
          <div style="max-width: 620px; margin: auto; background-color: #ffffff; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.08); overflow: hidden;">
            
            <!-- Header Banner -->
            <div style="background-color: #ffffff;">
              <img src="https://res.cloudinary.com/dse4pdvw5/image/upload/v1753878636/MacBook_Air_-_1_1_1_dcjrnt.png" alt="Signavox Banner" style="width: 100%; max-height: 180px; object-fit: cover; display: block;" />
            </div>

            <!-- Body Content -->
            <div style="padding: 32px;">
              <div style="text-align: center;">
                <h2 style="color: #2E86DE; margin-bottom: 10px;">Welcome to Signavox Career Ladder 🎓</h2>
                <p style="font-size: 16px; color: #333333; margin: 8px 0;">Hi <strong>${user.name}</strong>,</p>
                <p style="font-size: 16px; color: #444444;">We’re thrilled to have you onboard! Your account has been <span style="color: green; font-weight: bold;">approved</span> and you're now ready to dive into your learning experience.</p>
              </div>

              <div style="margin-top: 28px;">
                <p style="font-size: 15px; font-weight: 600; color: #333;">🔐 Your Login Credentials:</p>
                <div style="background-color: #f0f4f8; padding: 16px 20px; border-radius: 8px; margin-top: 10px;">
                  <p style="margin: 6px 0;"><strong>Email:</strong> ${user.email}</p>
                  <p style="margin: 6px 0;"><strong>Password:</strong> ${user.generatedPassword}</p>
                </div>
                <p style="font-size: 14px; color: #666; margin-top: 12px;">⚠️ Please change your password after your first login for security.</p>
              </div>

              <!-- CTA Button -->
              <div style="text-align: center; margin: 36px 0 24px;">
                <a href="https://scl.signavoxtechnologies.com" style="background-color: #2E86DE; color: white; padding: 14px 28px; border-radius: 10px; font-size: 16px; font-weight: bold; text-decoration: none; display: inline-block;">🚀 Go to Dashboard</a>
              </div>

              <!-- Divider -->
              <hr style="border: none; border-top: 1px solid #e0e0e0; margin: 32px 0;">

              <!-- Footer -->
              <div style="font-size: 13px; color: #999999; text-align: center;">
                <p>Need help? Reach out at <a href="mailto:support.scl@signavoxtechnologies.com" style="color: #2E86DE;">support.scl@signavoxtechnologies.com</a></p>
                <p style="margin-top: 6px;">&copy; ${new Date().getFullYear()} Signavox Technologies. All rights reserved.</p>
              </div>
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
    const supports = await User.find({ role: 'support' });
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
        supports: supports.length,
        approvedUsers: approved.length,
        pendingApprovals: pending.length,
        rejectedUsers: rejected.length,
      },
      users: {
        interns,
        professors,
        admins,
        supports,
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
    let updates = { ...req.body };

    // ❌ Prevent installments from being overwritten
    if (updates.amount && updates.amount.installments) {
      delete updates.amount.installments;
    }

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
    console.error('Error updating user by admin:', error);
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
      'title',
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




// exports.generateOfferLetter = async (req, res) => {
//   try {
//     const userId = req.params.userId;

//     const user = await User.findById(userId);
//     if (!user) return res.status(404).json({ message: 'User not found' });
//     // console.log('Generating offer letter for user:', user);

//     const offerLetterUrl = await generateAndUploadOfferLetter(user);

//     // Save URL in user schema
//     await User.findByIdAndUpdate(user._id, {
//       offerLetter: offerLetterUrl,
//     });

//     res.status(200).json({
//       message: 'Offer letter generated and uploaded successfully.',
//       url: offerLetterUrl,
//     });
//   } catch (error) {
//     console.error('Offer Letter Error:', error);
//     res.status(500).json({ message: 'Failed to generate offer letter.' });
//   }
// };


// Generate Offer Letter by Admin only
exports.generateOfferLetterByAdmin = async (req, res) => {
  try {
    const { userId } = req.params;

    const user = await User.findById(userId)
      .populate('courseRegisteredFor')
      .populate('batchAssigned');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // 1️⃣ Check approval
    if (user.approveStatus !== 'approved') {
      return res.status(400).json({
        message: 'User must be approved before generating offer letter'
      });
    }

    // 2️⃣ Check mandatory profile fields
    const requiredFields = [
      'firstName',
      'lastName',
      'email',
      'phone',
      'degree',
      'collegeName'
    ];

    const missingFields = requiredFields.filter(
      field => !user[field]
    );

    if (missingFields.length > 0) {
      return res.status(400).json({
        message: 'User profile is incomplete',
        missingFields
      });
    }

    // 3️⃣ Course & Batch check
    if (!user.courseRegisteredFor) {
      return res.status(400).json({
        message: 'Course is not assigned to the user'
      });
    }

    if (!user.batchAssigned) {
      return res.status(400).json({
        message: 'Batch is not assigned to the user'
      });
    }

    // 4️⃣ Prevent duplicate generation
    if (user.offerLetter) {
      return res.status(400).json({
        message: 'Offer letter already generated',
        offerLetter: user.offerLetter
      });
    }

    // 5️⃣ Generate + Upload Offer Letter
    const offerLetterUrl = await generateAndUploadOfferLetter(user);

    user.offerLetter = offerLetterUrl;
    user.offerLetterGeneratedAt = new Date();
    await user.save();

    res.status(201).json({
      message: 'Offer letter generated successfully',
      offerLetterUrl
    });

  } catch (error) {
    console.error('Generate Offer Letter Error:', error);
    res.status(500).json({
      message: 'Failed to generate offer letter',
      error: error.message
    });
  }
};


// User side
exports.getMyOfferLetter = async (req, res) => {
  try {
    const userId = req.user._id;

    const user = await User.findById(userId).select('name email offerLetter');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.offerLetter) {
      return res.status(404).json({
        message: 'Offer letter has not been generated yet'
      });
    }

    res.status(200).json({
      message: 'Offer letter fetched successfully',
      offerLetterUrl: user.offerLetter
    });

  } catch (error) {
    console.error('Get Offer Letter Error:', error);
    res.status(500).json({
      message: 'Failed to fetch offer letter',
      error: error.message
    });
  }
};
