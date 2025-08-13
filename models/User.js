const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Personal Details
  title: { type: String, enum: ['Mr', 'Mrs', 'Ms', 'Dr', 'Prof'], default: 'Mr' },
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  name: { type: String },

  email: { type: String, unique: true, required: true },
  password: { type: String, required: true },
  generatedPassword: { type: String, select: false },
  role: { type: String, enum: ['intern', 'admin', 'support'], default: 'intern' },
  approveStatus: {
    type: String,
    enum: ['approved', 'rejected', 'waiting'],
    default: 'waiting'
  },
  isApproved: { type: Boolean, default: false },
  profileImage: String,
  phone: String,
  resume: String,

  // Organization Details
  organizationName: { type: String, default: 'Signavox Technologies' },
  offerLetter: { type: String },
  placeOfWork: { type: String, default: 'Signavox Technologies' },
  reportingDate: { type: Date },
  shiftTimings: {
    start: { type: String },
    end: { type: String },
    default: { type: String, default: '9:30 AM - 6:30 PM' }
  },
  workingDays: {
    type: [String],
    default: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
  },
  hrName: { type: String, default: 'HR Manager' },
  employeeAddress: { type: String },
  stipend: { type: String, default: '₹ 7,000' },

  // Course & Batch Details
  courseRegisteredFor: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // Link to Course model
  batchAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },         // Link to Batch model
  batchStartDate: { type: Date },
  batchEndDate: { type: Date },
  batchTiming: { type: String }, // e.g., "10:00 AM - 12:00 PM"
  batchMode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'offline' },

  // Payment Details
  amount: {
    courseAmount: { type: Number, default: 0 },   // Actual course price
    discount: { type: Number, default: 0 },       // Discount manually applied
    finalAmount: { type: Number, default: 0 },    // Calculated = courseAmount - discount
    paidAmount: { type: Number, default: 0 },     // Amount paid by user
    balanceAmount: { type: Number, default: 0 }   // Calculated = finalAmount - paidAmount
  },

  // College Details
  collegeName: String,
  department: String,
  university: String,

  // Graduation Details
  degree: String,
  specialization: String,
  cgpa: String,
  currentYear: {
    type: String,
    enum: ['1st Year', '2nd Year', '3rd Year', '4th Year', 'Graduated'],
    default: '1st Year'
  },
  isGraduated: { type: Boolean, default: false },
  yearOfPassing: String,

  // Experience
  hasExperience: { type: Boolean, default: false },
  previousCompany: String,
  position: String,
  yearsOfExperience: String,

  // OTP for password reset
  otp: String,
  otpExpiresAt: Date,

  registeredAt: { type: Date, default: Date.now }
});

// Auto update name and amounts before save
userSchema.pre('save', function (next) {
  this.name = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');

  if (this.amount) {
    this.amount.finalAmount = Math.max((this.amount.courseAmount || 0) - (this.amount.discount || 0), 0);
    this.amount.balanceAmount = Math.max((this.amount.finalAmount || 0) - (this.amount.paidAmount || 0), 0);
  }

  next();
});

// Auto update name and amounts on findOneAndUpdate / updateOne
userSchema.pre(['findOneAndUpdate', 'updateOne'], function (next) {
  const update = this.getUpdate();

  if (update.firstName || update.middleName || update.lastName) {
    const firstName = update.firstName ?? this._update.firstName;
    const middleName = update.middleName ?? this._update.middleName;
    const lastName = update.lastName ?? this._update.lastName;
    update.name = [firstName, middleName, lastName].filter(Boolean).join(' ');
  }

  if (update.amount) {
    const courseAmount = update.amount.courseAmount ?? 0;
    const discount = update.amount.discount ?? 0;
    const paidAmount = update.amount.paidAmount ?? 0;

    update.amount.finalAmount = Math.max(courseAmount - (courseAmount * discount / 100), 0);
    
    update.amount.balanceAmount = Math.max(update.amount.finalAmount - paidAmount, 0);
  }

  this.setUpdate(update);
  next();
});

module.exports = mongoose.model('User', userSchema);
