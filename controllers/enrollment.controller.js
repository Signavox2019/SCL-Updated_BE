const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');

// Enroll in course (with/without payment)
exports.enrollInCourse = async (req, res) => {
  try {
    const { userId, courseId, amountPaid, paymentMethod, transactionId, paymentStatus, receiptUrl } = req.body;

    const alreadyEnrolled = await Enrollment.findOne({ user: userId, course: courseId });
    if (alreadyEnrolled) return res.status(400).json({ message: "User already enrolled" });

    const newEnrollment = await Enrollment.create({
      user: userId,
      course: courseId,
      amountPaid,
      paymentMethod,
      transactionId,
      paymentStatus,
      receiptUrl
    });

    // Add user to course.enrolledUsers
    await Course.findByIdAndUpdate(courseId, {
      $addToSet: { enrolledUsers: userId }
    });

    res.status(201).json({ message: "Enrolled successfully", enrollment: newEnrollment });
  } catch (error) {
    res.status(500).json({ message: "Error enrolling in course", error });
  }
};

// Get all enrollments (admin)
exports.getAllEnrollments = async (req, res) => {
  try {
    const enrollments = await Enrollment.find()
      .populate('user', 'name email')
      .populate('course', 'title');
    res.status(200).json(enrollments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching enrollments", error });
  }
};

// Get enrollments for a user
exports.getEnrollmentsByUser = async (req, res) => {
  try {
    const { userId } = req.params;
    const enrollments = await Enrollment.find({ user: userId })
      .populate('course', 'title');
    res.status(200).json(enrollments);
  } catch (error) {
    res.status(500).json({ message: "Error fetching user enrollments", error });
  }
};

// Enrollment stats (admin)
exports.enrollmentStats = async (req, res) => {
  try {
    const totalEnrollments = await Enrollment.countDocuments();
    const totalRevenue = await Enrollment.aggregate([
      { $match: { paymentStatus: "Success" } },
      { $group: { _id: null, total: { $sum: "$amountPaid" } } }
    ]);
    const byMethod = await Enrollment.aggregate([
      { $group: { _id: "$paymentMethod", count: { $sum: 1 } } }
    ]);

    res.status(200).json({
      totalEnrollments,
      totalRevenue: totalRevenue[0]?.total || 0,
      byMethod
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats", error });
  }
};
