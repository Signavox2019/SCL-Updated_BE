const mongoose = require('mongoose');

const installmentSchema = new mongoose.Schema({
  amountPaid: { type: Number, required: true },
  dateOfPayment: { type: Date, default: Date.now },
  referenceId: { type: String, required: true, unique: true }, // Admin-entered payment reference ID
  paymentSnapshot: { type: String }, // URL of payment proof (image/pdf uploaded to Cloudinary/S3)
  description: { type: String } // Optional notes about the payment
});

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
  stipend: { type: String, default: '₹ 5,000' },

  // Course & Batch Details
  courseRegisteredFor: { type: mongoose.Schema.Types.ObjectId, ref: 'Course' }, // Link to Course model
  batchAssigned: { type: mongoose.Schema.Types.ObjectId, ref: 'Batch' },         // Link to Batch model
  batchStartDate: { type: Date },
  batchEndDate: { type: Date },
  batchTiming: { type: String }, // e.g., "10:00 AM - 12:00 PM"
  batchMode: { type: String, enum: ['online', 'offline', 'hybrid'], default: 'offline' },

  // Payment Details with Installments
  amount: {
    courseAmount: { type: Number, default: 0 },  // Actual course price
    discount: { type: Number, default: 0 },      // Discount (percentage or flat)
    finalAmount: { type: Number, default: 0 },   // Final = courseAmount - discount
    totalPaid: { type: Number, default: 0 },     // Sum of all installments
    balanceAmount: { type: Number, default: 0 }, // finalAmount - totalPaid
    installments: [installmentSchema]            // All installment payments
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
    this.amount.finalAmount = Math.max(this.amount.courseAmount - (this.amount.courseAmount * this.amount.discount / 100), 0);
    this.amount.totalPaid = this.amount.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
    this.amount.balanceAmount = Math.max((this.amount.finalAmount || 0) - (this.amount.totalPaid || 0), 0);
  }

  next();
});

// Auto update on updateOne/findOneAndUpdate
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
    update.amount.finalAmount = Math.max(courseAmount - (courseAmount * discount / 100), 0);

    if (update.amount.installments) {
      update.amount.totalPaid = update.amount.installments.reduce((sum, inst) => sum + (inst.amountPaid || 0), 0);
    }

    update.amount.balanceAmount = Math.max((update.amount.finalAmount || 0) - (update.amount.totalPaid || 0), 0);
  }

  this.setUpdate(update);
  next();
});


module.exports = mongoose.model('User', userSchema);
