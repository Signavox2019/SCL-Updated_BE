const Progress = require('../models/Progress');
const Enrollment = require('../models/Enrollment');
const Course = require('../models/Course');
const User = require('../models/User');
const sendCertificateMail = require('../utils/mailer');
const fs = require('fs');
const path = require('path');
const { sendEmail } = require('../utils/mailer');
const { generateCertificate } = require('../utils/certificateGenerator');
const uploadCertificateToCloudinary = require('../utils/uploadCertificateToCloudinary');


// Create or update progress
exports.updateProgress = async (req, res) => {
  try {
    const { user, course, enrollment, moduleId, lessonId, topic, quizScore, feedback } = req.body;

    let progress = await Progress.findOne({ user, course });

    if (!progress) {
      progress = await Progress.create({
        user, course, enrollment,
        completedModules: [{
          moduleId,
          completedLessons: [{
            lessonId,
            completedTopics: [topic],
            quizScore,
            feedback
          }]
        }]
      });
    } else {
      // Add or update topic
      const module = progress.completedModules.find(mod => mod.moduleId.toString() === moduleId);
      if (module) {
        const lesson = module.completedLessons.find(les => les.lessonId === lessonId);
        if (lesson) {
          if (!lesson.completedTopics.includes(topic)) lesson.completedTopics.push(topic);
          lesson.quizScore = quizScore || lesson.quizScore;
          lesson.feedback = feedback || lesson.feedback;
        } else {
          module.completedLessons.push({ lessonId, completedTopics: [topic], quizScore, feedback });
        }
      } else {
        progress.completedModules.push({
          moduleId,
          completedLessons: [{ lessonId, completedTopics: [topic], quizScore, feedback }]
        });
      }

      await progress.save();
    }

    res.status(200).json({ message: 'Progress updated', progress });
  } catch (err) {
    res.status(500).json({ message: 'Failed to update progress', error: err });
  }
};

// Mark course as completed & generate certificate
// exports.completeCourse = async (req, res) => {
//   try {
//     const { userId, courseId, certificateUrl } = req.body;

//     const progress = await Progress.findOne({ user: userId, course: courseId });
//     if (!progress) return res.status(404).json({ message: "Progress not found" });

//     progress.isCompleted = true;
//     progress.completedAt = new Date();
//     progress.certificateUrl = certificateUrl;
//     await progress.save();

//     res.status(200).json({ message: "Course marked as completed", progress });
//   } catch (error) {
//     res.status(500).json({ message: "Error completing course", error });
//   }
// };

exports.completeCourse = async (req, res) => {
  try {
    const { userId, courseId } = req.body;

    if (!userId || !courseId) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    const progress = await Progress.findOne({ user: userId, course: courseId }).populate('user').populate('course');
    if (!progress) return res.status(404).json({ message: "Progress not found" });

    const user = progress.user;
    const course = progress.course;

    const fileName = `CERT-${user._id}-${Date.now()}.pdf`;
    const localPath = path.join(__dirname, `../certificates/${fileName}`);

    await generateCertificate({
      userName: user.name,
      courseTitle: course.title,
      outputPath: localPath
    });

    const certificateUrl = await uploadCertificateToCloudinary(localPath, fileName);

    progress.isCompleted = true;
    progress.completedAt = new Date();
    progress.certificateUrl = certificateUrl;
    await progress.save();

    await sendCertificateMail(user.email, user.name, course.title, certificateUrl);

    res.status(200).json({ message: "Course marked as completed", progress });
  } catch (error) {
    console.error("Completion Error →", error);
    res.status(500).json({
      message: "Error completing course",
      error: error?.message || "Unknown error"
    });
  }
};


// Batch course complete
exports.completeCoursesBulk = async (req, res) => {
  try {
    const { users } = req.body; // Array of { userId, courseId }
    const completedUsers = [];

    for (const item of users) {
      const user = await User.findById(item.userId);
      const course = await Course.findById(item.courseId);

      if (!user || !course) continue;

      const progress = await Progress.findOne({ user: user._id, course: course._id });
      if (!progress || progress.isCompleted) continue;

      const fileName = `CERT-${user._id}-${Date.now()}.pdf`;
      const localPath = path.join(__dirname, `../certificates/${fileName}`);

      await generateCertificate({
        userName: user.name,
        courseTitle: course.title,
        outputPath: localPath
      });

      const certificateUrl = await uploadCertificateToCloudinary(localPath, fileName);

      progress.isCompleted = true;
      progress.completedAt = new Date();
      progress.certificateUrl = certificateUrl;
      await progress.save();

      const htmlContent = `
        <div style="font-family: Arial; padding: 20px; background: #f4f4f4; border-radius: 10px;">
          <h2 style="color: #2b5a9e;">🎓 Congratulations ${user.name}!</h2>
          <p>You have successfully completed the <strong>${course.title}</strong> course.</p>
          <p>Your certificate is ready. Click the button below to download it:</p>
          <a href="${certificateUrl}" target="_blank" 
             style="display: inline-block; margin-top: 15px; padding: 10px 20px; background: #2b5a9e; color: white; text-decoration: none; border-radius: 5px;">
             🎉 View Your Certificate
          </a>
          <p style="margin-top: 20px;">Thank you for learning with <strong>Signavox Career Ladder</strong>!</p>
        </div>
      `;

      await sendCertificateMail(user.email, user.name, course.title, certificateUrl, htmlContent);
      completedUsers.push(user._id);
    }

    res.status(200).json({
      message: `${completedUsers.length} users marked as completed and emailed`,
      completedUsers
    });
  } catch (error) {
    console.error('Bulk completion error:', error);
    res.status(500).json({ message: "Bulk course completion failed", error });
  }
};


// Get All User Progress
exports.getAllUserProgress = async (req, res) => {
  try {
    const allProgress = await Progress.find()
      .populate('user', 'name email role')
      .populate('course', 'title duration')
      .lean();

    res.status(200).json({ message: "All user progress", data: allProgress });
  } catch (error) {
    res.status(500).json({ message: "Error fetching all user progress", error });
  }
};

// Get progress
// exports.getUserProgress = async (req, res) => {
//   try {
//     const userId = req.user.id; // ✅ this is correct
//     const { courseId } = req.params;

//     const progress = await Progress.findOne({ user: userId, course: courseId })
//       .populate('course')
//       .populate('user');

//     if (!progress) return res.status(404).json({ message: "Progress not found" });
//     res.status(200).json(progress);
//   } catch (error) {
//     res.status(500).json({ message: "Error getting progress", error });
//   }
// };


exports.getUserProgress = async (req, res) => {
  try {
    const userId = req.user.id; // From token middleware
    const { courseId } = req.params;

    const progress = await Progress.findOne({ user: userId, course: courseId }).populate('user').lean();
    if (!progress) return res.status(404).json({ message: "Progress not found" });

    const course = await Course.findById(courseId).lean();
    if (!course) return res.status(404).json({ message: "Course not found" });

    // Create maps for faster lookup
    const moduleMap = new Map();
    course.modules.forEach(mod => {
      const lessonMap = new Map();
      mod.lessons.forEach(lesson => {
        lessonMap.set(lesson._id.toString(), {
          id: lesson._id,
          lessonTitle: lesson.title
        });
      });

      moduleMap.set(mod._id.toString(), {
        id: mod._id,
        moduleTitle: mod.moduleTitle,
        lessons: lessonMap
      });
    });

    // Format completedModules
    const formattedModules = progress.completedModules.map(mod => {
      const modInfo = moduleMap.get(mod.moduleId.toString()) || { id: mod.moduleId, moduleTitle: "Unknown Module", lessons: new Map() };

      const formattedLessons = mod.completedLessons.map(lesson => {
        const lessonInfo = modInfo.lessons.get(lesson.lessonId.toString()) || { id: lesson.lessonId, lessonTitle: "Unknown Lesson" };

        return {
          lessonId: lessonInfo,
          completedTopics: lesson.completedTopics,
          quizScore: lesson.quizScore,
          feedback: lesson.feedback,
          _id: lesson._id
        };
      });

      return {
        moduleId: {
          id: modInfo.id,
          moduleTitle: modInfo.moduleTitle
        },
        completedLessons: formattedLessons,
        _id: mod._id
      };
    });

    res.status(200).json({
      ...progress,
      course,
      completedModules: formattedModules
    });

  } catch (error) {
    res.status(500).json({ message: "Error getting progress", error });
  }
};




// Progress stats
exports.progressStats = async (req, res) => {
  try {
    const totalCompletions = await Progress.countDocuments({ isCompleted: true });
    const totalInProgress = await Progress.countDocuments({ isCompleted: false });
    res.status(200).json({
      completed: totalCompletions,
      inProgress: totalInProgress
    });
  } catch (error) {
    res.status(500).json({ message: "Error fetching stats", error });
  }
};
