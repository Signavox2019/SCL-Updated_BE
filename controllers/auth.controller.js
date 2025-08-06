const User = require('../models/User');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const nodemailer = require('nodemailer');
const generateToken = require('../utils/generateToken');
const crypto = require('crypto');

// const token = generateToken(user._id, user.role); // optional: pass user.role


// ✅ Helper: OTP generator
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// ✅ Mailer setup
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


// exports.register = async (req, res) => {
//   try {
//     const {
//       name, email, phone, role,
//       collegeName, department, university,
//       degree, specialization, cgpa, currentYear,
//       isGraduated, yearOfPassing, hasExperience,
//       previousCompany, position, yearsOfExperience
//     } = req.body;

//     const existing = await User.findOne({ email });
//     if (existing) return res.status(400).json({ message: "User already exists" });

//     // Generate random secure password
//     const generatedPassword = crypto.randomBytes(6).toString('hex'); // 12-char password
//     const hashedPassword = await bcrypt.hash(generatedPassword, 10);

//     const user = await User.create({
//       name,
//       email,
//       password: hashedPassword,
//       generatedPassword, // Temporary storage to send in approval email
//       role,
//       phone,
//       collegeName,
//       department,
//       university,
//       degree,
//       specialization,
//       cgpa,
//       currentYear,
//       isGraduated,
//       yearOfPassing,
//       hasExperience,
//       previousCompany,
//       position,
//       yearsOfExperience
//     });

//     // Send confirmation email (without password)
//     // await transporter.sendMail({
//     //   from: process.env.EMAIL_USER,
//     //   to: email,
//     //   subject: "Signavox Registration Received",
//     //   html: `<p>Hello ${name},</p><p>Your registration is successful and is pending admin approval. You will receive your login credentials once approved.</p>`
//     // });

//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "📩 Registration Received | Signavox Career Ladder",
//       html: `
//   <div style="font-family: 'Segoe UI', sans-serif; background-color: #f9f9f9; padding: 40px;">
//     <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px;">
//       <div style="text-align: center;">
//         <img src="https://i.imgur.com/DPnG0wq.png" alt="Signavox Logo" style="width: 90px; margin-bottom: 20px;" />
//         <h2 style="color: #2E86DE;">Registration Received</h2>
//       </div>

//       <div style="margin-top: 20px; color: #333; font-size: 16px;">
//         <p>Hello <strong>${name}</strong>,</p>
//         <p>Thank you for registering for <strong>Signavox Career Ladder</strong>. We have received your application and it is currently under review.</p>
//         <p>Once approved by our admin team, you will receive an email with your login credentials to access the platform.</p>
//       </div>

//       <div style="margin-top: 30px; text-align: center;">
//         <img src="https://i.imgur.com/6LZ5XwQ.png" alt="Pending Review" style="width: 100%; max-width: 300px;" />
//       </div>

//       <div style="margin-top: 30px; font-size: 14px; color: #666;">
//         <p>In the meantime, feel free to explore our <a href="https://signavoxtechnologies.com" style="color: #2E86DE; text-decoration: none;">website</a> or contact us at <a href="mailto:support.scl@signavoxtechnologies.com" style="color: #2E86DE;">support.scl@signavoxtechnologies.com</a> for any queries.</p>
//       </div>

//       <div style="margin-top: 40px; text-align: center; font-size: 13px; color: #aaa;">
//         <p>&copy; ${new Date().getFullYear()} Signavox Technologies. All rights reserved.</p>
//       </div>
//     </div>
//   </div>
//   `
//     });


//     res.status(201).json({ message: "Registration successful. Awaiting admin approval.", user });
//   } catch (error) {
//     res.status(500).json({ message: "Registration failed", error });
//   }
// };


// ✅ Login

exports.register = async (req, res) => {
  try {
    const {
      title,              // Optional: e.g. Mr., Ms., Dr.
      // Personal Details
      firstName,
      middleName,
      lastName,
      email,
      phone,
      role = 'intern',
      profilePhoto,

      // Education Info
      collegeName,
      department,
      university,
      degree,
      specialization,
      cgpa,
      currentYear,
      isGraduated,
      yearOfPassing,

      // Work Experience
      hasExperience,
      previousCompany,
      position,
      yearsOfExperience,

      // Organization & Employment Details
      organizationName,
      offerLetter,
      placeOfWork,
      reportingDate,
      shiftTimings,         // Example: { start: "09:00", end: "17:00" }
      workingDays,          // Example: ["Monday", "Tuesday", "Wednesday"]
      hrName,
      employeeAddress,
      stipend,
      amount = {
        courseAmount: 0,
        paidAmount: 0,
        balanceAmount: 0
      }
    } = req.body;

    // Check if user already exists
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ message: "User already exists" });

    // Generate password and hash
    const generatedPassword = crypto.randomBytes(6).toString('hex'); // 12-character
    const hashedPassword = await bcrypt.hash(generatedPassword, 10);

    // Generate full name
    const name = [firstName, middleName, lastName].filter(Boolean).join(' ');

    // Create new user
    const user = await User.create({
      title,
      firstName,
      middleName,
      lastName,
      name,
      email,
      phone,
      role,
      password: hashedPassword,
      generatedPassword,
      profilePhoto,

      // Education
      collegeName,
      department,
      university,
      degree,
      specialization,
      cgpa,
      currentYear,
      isGraduated,
      yearOfPassing,

      // Experience
      hasExperience,
      previousCompany,
      position,
      yearsOfExperience,

      // Organization
      organizationName,
      offerLetter,
      placeOfWork,
      reportingDate,
      shiftTimings,
      workingDays,
      hrName,
      employeeAddress,
      stipend,

      approveStatus: 'waiting',
      certificates: [],
      // courseRegisteredFor: null, // Initially null
      amount: {
        courseAmount: amount.courseAmount || 0,
        paidAmount: amount.paidAmount || 0,
        balanceAmount: amount.balanceAmount || 0
      }
    });

    // Send confirmation email
    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "📩 Registration Received | Signavox Career Ladder",
      html: `
<div style="font-family: 'Segoe UI', sans-serif; background-color: #f2f4f8; padding: 0; margin: 0;">
  <!-- Header Banner -->
  <div style="width: 100%; background-color: #ffffff;">
    <img src="https://res.cloudinary.com/dse4pdvw5/image/upload/v1753878636/MacBook_Air_-_1_1_1_dcjrnt.png" alt="Signavox Banner" style="width: 100%; max-height: 180px; object-fit: cover; display: block;" />
  </div>

  <!-- Card Container -->
  <div style="max-width: 640px; margin: -50px auto 0; background-color: #ffffff; border-radius: 16px; box-shadow: 0 12px 24px rgba(0,0,0,0.08); padding: 40px 30px; position: relative; z-index: 10;">
    
    <!-- Greeting & Title -->
    <div style="text-align: center;">
      <h2 style="color: #2E86DE; font-size: 24px; margin-bottom: 10px;">Welcome to Signavox Career Ladder</h2>
      <p style="color: #555; font-size: 16px; line-height: 1.6;">Hi <strong>${name}</strong>, we're thrilled to have you on board!</p>
    </div>

    <!-- Body -->
    <div style="margin-top: 30px; color: #333; font-size: 15px; line-height: 1.7;">
      <p>Thank you for registering with <strong>Signavox Career Ladder</strong>, our flagship learning platform tailored to empower aspiring professionals like you.</p>
      <p>Your application has been received and is currently under review by our admin team.</p>
      <p>Once approved, you'll receive an email with your login credentials to access exclusive learning paths, real-time events, and certification programs.</p>
    </div>

    <!-- CTA Button -->
    <div style="text-align: center; margin-top: 35px;">
      <a href="https://signavoxtechnologies.com" style="background-color: #2E86DE; color: #fff; text-decoration: none; padding: 12px 28px; border-radius: 6px; font-weight: 600; font-size: 15px; display: inline-block;">Visit Our Website</a>
    </div>

    <!-- Contact Info -->
    <div style="margin-top: 40px; font-size: 13px; color: #777; text-align: center;">
      <p>Need help? Reach out to us at <a href="mailto:support.scl@signavoxtechnologies.com" style="color: #2E86DE;">support.scl@signavoxtechnologies.com</a></p>
    </div>

    <!-- Footer -->
    <div style="margin-top: 30px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #eee; padding-top: 20px;">
      <p>&copy; ${new Date().getFullYear()} Signavox Technologies. All rights reserved.</p>
    </div>
  </div>

  <!-- Spacer -->
</div>

      `
    });

    res.status(201).json({
      message: "Registration successful. Awaiting admin approval.",
      user,
    });

  } catch (error) {
    console.error("Registration Error:", error);
    res.status(500).json({ message: "Registration failed", error });
  }
};



// exports.register = async (req, res) => {
//   try {
//     const {
//       firstName,
//       middleName,
//       lastName,
//       email,
//       phone,
//       role = 'intern',
//       profilePhoto,

//       // Education Info
//       collegeName,
//       department,
//       university,
//       degree,
//       specialization,
//       cgpa,
//       currentYear,
//       isGraduated,
//       yearOfPassing,

//       // Work Experience
//       hasExperience,
//       previousCompany,
//       position,
//       yearsOfExperience,

//     } = req.body;

//     const existing = await User.findOne({ email });
//     if (existing) return res.status(400).json({ message: "User already exists" });

//     // Generate secure password
//     const generatedPassword = crypto.randomBytes(6).toString('hex'); // 12-character
//     const hashedPassword = await bcrypt.hash(generatedPassword, 10);

//     // Auto-generate name
//     const name = [firstName, middleName, lastName].filter(Boolean).join(' ');

//     const user = await User.create({
//       firstName,
//       middleName,
//       lastName,
//       name,
//       email,
//       phone,
//       role,
//       password: hashedPassword,
//       generatedPassword,
//       profilePhoto,

//       collegeName,
//       department,
//       university,
//       degree,
//       specialization,
//       cgpa,
//       currentYear,
//       isGraduated,
//       yearOfPassing,

//       hasExperience,
//       previousCompany,
//       position,
//       yearsOfExperience,

//       approveStatus: 'waiting', // Default
//       certificates: [], // Default empty
//     });

//     // Send confirmation email
//     await transporter.sendMail({
//       from: process.env.EMAIL_USER,
//       to: email,
//       subject: "📩 Registration Received | Signavox Career Ladder",
//       html: `
//   <div style="font-family: 'Segoe UI', sans-serif; background-color: #f9f9f9; padding: 40px;">
//     <div style="max-width: 600px; margin: auto; background-color: #ffffff; border-radius: 12px; box-shadow: 0 4px 12px rgba(0,0,0,0.1); padding: 30px;">
//       <div style="text-align: center;">
//         <img src="https://i.imgur.com/DPnG0wq.png" alt="Signavox Logo" style="width: 90px; margin-bottom: 20px;" />
//         <h2 style="color: #2E86DE;">Registration Received</h2>
//       </div>

//       <div style="margin-top: 20px; color: #333; font-size: 16px;">
//         <p>Hello <strong>${name}</strong>,</p>
//         <p>Thank you for registering for <strong>Signavox Career Ladder</strong>. We have received your application and it is currently under review.</p>
//         <p>Once approved by our admin team, you will receive an email with your login credentials to access the platform.</p>
//       </div>

//       <div style="margin-top: 30px; text-align: center;">
//         <img src="https://i.imgur.com/6LZ5XwQ.png" alt="Pending Review" style="width: 100%; max-width: 300px;" />
//       </div>

//       <div style="margin-top: 30px; font-size: 14px; color: #666;">
//         <p>In the meantime, feel free to explore our <a href="https://signavoxtechnologies.com" style="color: #2E86DE; text-decoration: none;">website</a> or contact us at <a href="mailto:support.scl@signavoxtechnologies.com" style="color: #2E86DE;">support.scl@signavoxtechnologies.com</a> for any queries.</p>
//       </div>

//       <div style="margin-top: 40px; text-align: center; font-size: 13px; color: #aaa;">
//         <p>&copy; ${new Date().getFullYear()} Signavox Technologies. All rights reserved.</p>
//       </div>
//     </div>
//   </div>
//       `
//     });

//     res.status(201).json({ message: "Registration successful. Awaiting admin approval.", user });
//   } catch (error) {
//     console.error("Registration Error:", error);
//     res.status(500).json({ message: "Registration failed", error });
//   }
// };





exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: "Invalid email or password" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: "Invalid email or password" });

    if (!user.isApproved) {
      return res.status(403).json({ message: "Account not approved by admin yet" });
    }

    const token = jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
      expiresIn: '7d'
    });

    res.status(200).json({ message: "Login successful", token, user });
  } catch (error) {
    res.status(500).json({ message: "Login failed", error });
  }
};

// ✅ Forgot Password (send OTP)
exports.sendOTP = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const otp = generateOTP();
    user.otp = otp;
    user.otpExpiresAt = Date.now() + 10 * 60 * 1000;
    await user.save();

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset OTP - Signavox Career Ladder",
      html: `<p>Your OTP to reset password is: <strong>${otp}</strong>.<br/>It is valid for 10 minutes.</p>`
    });

    res.status(200).json({ message: "OTP sent to email" });
  } catch (error) {
    res.status(500).json({ message: "Failed to send OTP", error });
  }
};

// ✅ Reset Password using OTP
exports.resetPassword = async (req, res) => {
  try {
    const { email, otp, newPassword } = req.body;

    const user = await User.findOne({ email });
    if (!user || user.otp !== otp || Date.now() > user.otpExpiresAt) {
      return res.status(400).json({ message: "Invalid or expired OTP" });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    user.otp = null;
    user.otpExpiresAt = null;
    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (error) {
    res.status(500).json({ message: "Failed to reset password", error });
  }
};


// controllers/authController.js

// GET /api/auth/validate
// Header: Authorization: Bearer <token>
exports.validateToken = async (req, res) => {
  try {
    /* 
      protect middleware should already:
      1. Verify the JWT
      2. Attach the decoded payload to req.user
    */
    if (!req.user) {
      // Either protect() middleware was not applied or token verification failed
      return res.status(401).json({
        valid: false,
        message: 'Invalid or missing token',
      });
    }

    // Optionally expose issued‑at / expires‐at if your middleware sets them
    const response = {
      valid: true,
      user: req.user,       // basic profile info (sans password)
      message: 'Token is valid',
    };

    // If you stored iat/exp in req after verification, include them
    if (req.iat) response.issuedAt = req.iat;
    if (req.exp) response.expiresAt = req.exp;

    return res.status(200).json(response);
  } catch (error) {
    console.error('Token validation error →', error);
    return res.status(500).json({
      valid: false,
      message: 'Token validation failed',
      error: error?.message || 'Unknown error',
    });
  }
};