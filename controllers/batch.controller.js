const Course = require('../models/Course');
const Batch = require('../models/Batch');
const User = require('../models/User');

exports.createBatch = async (req, res) => {
  try {
    const { batchName, course, users, professor, startDate, endDate } = req.body;

    // Fetch the course to get enrolled users
    const courseData = await Course.findById(course);
    if (!courseData) {
      return res.status(404).json({ message: 'Course not found' });
    }

    // Filter out only users who are enrolled in this course
    const validUsers = users.filter(userId =>
      courseData.enrolledUsers.includes(userId)
    );

    // If no valid users found
    if (validUsers.length === 0) {
      return res.status(400).json({ message: 'No selected users are enrolled in this course' });
    }

    // Create batch only with enrolled users
    const batch = await Batch.create({
      batchName,
      course,
      users: validUsers,
      professor,
      startDate,
      endDate
    });

    res.status(201).json({ message: 'Batch created with enrolled users only', batch });
  } catch (error) {
    console.error("Batch creation failed →", error);
    res.status(500).json({ message: 'Error creating batch', error });
  }
};

exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('course')
      .populate('users', 'name email')
      .populate('professor', 'name email');
    res.status(200).json(batches);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching batches', error });
  }
};

exports.assignQuizToBatch = async (req, res) => {
  try {
    const { batchId, quiz } = req.body;
    const batch = await Batch.findById(batchId);
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    batch.quizzes.push(quiz);
    await batch.save();

    res.status(200).json({ message: 'Quiz assigned', batch });
  } catch (error) {
    res.status(500).json({ message: 'Error assigning quiz', error });
  }
};


// Get single batch
exports.getBatch = async (req, res) => {
  try {
    const batch = await Batch.findById(req.params.id)
      .populate('course')
      .populate('users', 'name email')
      .populate('professor');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });
    res.status(200).json(batch);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching batch', error });
  }
};

// Update batch
exports.updateBatch = async (req, res) => {
  try {
    const updated = await Batch.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!updated) return res.status(404).json({ message: 'Batch not found' });
    res.status(200).json({ message: 'Batch updated', batch: updated });
  } catch (error) {
    res.status(500).json({ message: 'Error updating batch', error });
  }
};

// Delete batch
exports.deleteBatch = async (req, res) => {
  try {
    const deleted = await Batch.findByIdAndDelete(req.params.id);
    if (!deleted) return res.status(404).json({ message: 'Batch not found' });
    res.status(200).json({ message: 'Batch deleted' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting batch', error });
  }
};

// Send certificate emails to selected users
exports.sendBatchCertificates = async (req, res) => {
  try {
    const { userIds, courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const users = await User.find({ _id: { $in: userIds } });

    for (const user of users) {
      // Simulate certificate generation
      const certUrl = `/certificates/CERT-${user._id}-${Date.now()}.pdf`;

      // Update user's progress
      await Progress.findOneAndUpdate(
        { user: user._id, course: courseId },
        { isCompleted: true, completedAt: new Date(), certificateUrl: certUrl },
        { new: true }
      );

      // Send fancy email
      await sendCertificateMail(user.email, user.name, course.title, certUrl);
    }

    res.status(200).json({ message: 'Certificates sent successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error sending certificates', error });
  }
};


exports.getAvailableUsersForBatch = async (req, res) => {
  try {
    const { courseId } = req.params;

    // Step 1: Find the course and its enrolled users
    const course = await Course.findById(courseId);
    if (!course) {
      return res.status(404).json({ message: 'Course not found' });
    }

    const enrolledUserIds = course.enrolledUsers;

    // Step 2: Get users already assigned to a batch of this course
    const batches = await Batch.find({ course: courseId }, 'users');
    const assignedUserIds = batches.flatMap(batch => batch.users.map(id => id.toString()));

    // Step 3: Filter users who are enrolled but not yet assigned to any batch
    const unassignedUserIds = enrolledUserIds.filter(
      userId => !assignedUserIds.includes(userId.toString())
    );

    // Step 4: Fetch full user details of the unassigned users
    const unassignedUsers = await User.find({ _id: { $in: unassignedUserIds } }, 'name email');

    res.status(200).json({
      courseId,
      courseTitle: course.title,
      totalEnrolled: enrolledUserIds.length,
      alreadyAssigned: assignedUserIds.length,
      availableUsers: unassignedUsers.length,
      users: unassignedUsers
    });

  } catch (error) {
    console.error("Error fetching available users for batch:", error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};


exports.getBatchUserBreakdown = async (req, res) => {
  try {
    const { courseId, batchId } = req.params;

    // Step 1: Fetch the course
    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: 'Course not found' });

    const enrolledUserIds = course.enrolledUsers.map(id => id.toString());

    // Step 2: Fetch all batches of this course
    const allBatches = await Batch.find({ course: courseId });

    const assignedUserMap = new Map(); // userId -> batchId
    for (const batch of allBatches) {
      for (const userId of batch.users) {
        assignedUserMap.set(userId.toString(), batch._id.toString());
      }
    }

    // Step 3: Classify users
    const assignedToThisBatch = [];
    const assignedToOtherBatches = [];
    const unassignedUsers = [];

    for (const userId of enrolledUserIds) {
      const assignedBatchId = assignedUserMap.get(userId);

      if (!assignedBatchId) {
        unassignedUsers.push(userId);
      } else if (assignedBatchId === batchId) {
        assignedToThisBatch.push(userId);
      } else {
        assignedToOtherBatches.push(userId);
      }
    }

    // Step 4: Fetch full user details
    const [usersThisBatch, usersOtherBatches, usersAvailable] = await Promise.all([
      User.find({ _id: { $in: assignedToThisBatch } }, 'name email'),
      User.find({ _id: { $in: assignedToOtherBatches } }, 'name email'),
      User.find({ _id: { $in: unassignedUsers } }, 'name email')
    ]);

    res.status(200).json({
      courseId,
      courseTitle: course.title,
      totalEnrolled: enrolledUserIds.length,
      batchId,
      breakdown: {
        assignedToThisBatch: {
          count: usersThisBatch.length,
          users: usersThisBatch
        },
        assignedToOtherBatches: {
          count: usersOtherBatches.length,
          users: usersOtherBatches
        },
        availableUsers: {
          count: usersAvailable.length,
          users: usersAvailable
        }
      }
    });
  } catch (error) {
    console.error("Error fetching batch user breakdown:", error);
    res.status(500).json({ message: 'Internal server error', error });
  }
};