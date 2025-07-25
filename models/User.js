const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  // Personal Details
  title: { type: String, enum: ['Mr', 'Mrs', 'Ms','Dr','Prof'], default: 'Mr' },
  firstName: { type: String, required: true },
  middleName: { type: String },
  lastName: { type: String, required: true },
  fullName: { type: String },

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
  organizationName: { type: String, default: 'Signavox' },
  offerLetter: { type: String },
  placeOfWork: { type: String },
  reportingDate: { type: Date },
  shiftTimings: {
    start: { type: String },
    end: { type: String }
  },
  workingDays: [{ type: String }],
  hrName: { type: String },
  employeeAddress: { type: String },
  stipend: { type: String },

  // Course Payment & Registration
  courseRegisteredFor: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' },
  amount: {
    courseAmount: { type: Number },
    paidAmount: { type: Number },
    balanceAmount: { type: Number }
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

// Middleware to update fullName automatically
userSchema.pre('save', function (next) {
  this.fullName = [this.firstName, this.middleName, this.lastName].filter(Boolean).join(' ');
  next();
});

// Middleware for fullName update on findOneAndUpdate and updateOne
userSchema.pre('findOneAndUpdate', function (next) {
  const update = this.getUpdate();
  if (update.firstName || update.middleName || update.lastName) {
    const firstName = update.firstName || this._update.firstName;
    const middleName = update.middleName || this._update.middleName;
    const lastName = update.lastName || this._update.lastName;
    update.fullName = [firstName, middleName, lastName].filter(Boolean).join(' ');
    this.setUpdate(update);
  }
  next();
});

module.exports = mongoose.model('User', userSchema);
