const Batch = require('../models/Batch');
const Course = require('../models/Course');
const Progress = require('../models/Progress');
const User = require('../models/User');
const moment = require('moment');
const sendEmail = require('../utils/sendAdminBatchCompletionReminder'); // utility you use for mailing
const ADMIN_EMAIL = process.env.ADMIN_EMAIL;
const Professor = require('../models/Professor');
const Certificate = require('../models/Certificate');




const fs = require('fs');
const path = require('path');
const { generateCertificate } = require('../utils/certificateGenerator');
const generateCertificateId = require('../utils/generateCertificateId');
const uploadCertificateToCloudinary = require('../utils/uploadCertificateToCloudinary');
const sendCertificateMail = require('../utils/sendCertificateMail');






exports.createBatch = async (req, res) => {
  try {
    const { batchName, course, users, professor, startDate, endDate } = req.body;

    const courseDoc = await Course.findById(course);
    if (!courseDoc) return res.status(404).json({ message: 'Course not found' });

    const totalLessons = courseDoc.modules.flatMap(m => m.lessons).length;

    const batch = new Batch({
      batchName, course, users, professor, startDate, endDate,
      batchProgress: {
        completedModules: [],
        completedLessons: [],
        percentage: 0
      }
    });

    await batch.save();

    // 🔹 Update assigned batch in User schema
    if (users && users.length > 0) {
      await User.updateMany(
        { _id: { $in: users } },
        {
          $set: {
            batchAssigned: batch._id,
            // courseRegisteredFor: course,
            batchStartDate: startDate,
            batchEndDate: endDate || null
          }
        }
      );
    }

    res.status(201).json({ message: 'Batch created successfully', batch });
  } catch (error) {
    res.status(500).json({ message: 'Error creating batch', error });
  }
};

// exports.getAllBatches = async (req, res) => {
//   try {
//     const batches = await Batch.find()
//       .populate('course')
//       .populate('professor')
//       .populate('users')
//       .lean(); // Convert Mongoose docs to plain JS objects

//     const enrichedBatches = [];

//     for (const batch of batches) {
//       const course = batch.course;
//       if (!course) continue;

//       // Build maps for lookup
//       const moduleMap = {};
//       const lessonMap = {};
//       const topicMap = {};

//       course.modules.forEach(mod => {
//         const modId = mod._id.toString();
//         moduleMap[modId] = {
//           _id: mod._id,
//           title: mod.moduleTitle,
//           description: mod.moduleDescription,
//           completedLessons: []
//         };

//         mod.lessons.forEach(les => {
//           const lesId = les._id.toString();
//           lessonMap[lesId] = {
//             _id: les._id,
//             title: les.title,
//             moduleId: modId,
//             completedTopics: []
//           };

//           les.topics.forEach(top => {
//             topicMap[top._id.toString()] = {
//               _id: top._id,
//               title: top.title,
//               lessonId: lesId
//             };
//           });
//         });
//       });

//       // Get all lesson IDs in the course
//       const allLessonIds = Object.keys(lessonMap);
//       const completedLessons = batch.batchProgress?.completedLessons || [];
//       const completedTopics = batch.batchProgress?.completedTopics || [];

//       // Filter valid lessons
//       const validCompletedLessonIds = completedLessons.filter(id => allLessonIds.includes(id.toString()));
//       const uniqueCompletedLessonIds = [...new Set(validCompletedLessonIds.map(id => id.toString()))];

//       const percentage = allLessonIds.length === 0
//         ? 0
//         : Math.round((uniqueCompletedLessonIds.length / allLessonIds.length) * 100);

//       // Group topics into lessons
//       completedTopics.forEach(topicId => {
//         const topic = topicMap[topicId.toString()];
//         if (topic && lessonMap[topic.lessonId]) {
//           lessonMap[topic.lessonId].completedTopics.push({
//             _id: topic._id,
//             title: topic.title
//           });
//         }
//       });

//       // Group lessons into modules
//       uniqueCompletedLessonIds.forEach(lessonId => {
//         const lesson = lessonMap[lessonId];
//         if (lesson && moduleMap[lesson.moduleId]) {
//           moduleMap[lesson.moduleId].completedLessons.push({
//             _id: lesson._id,
//             title: lesson.title,
//             completedTopics: lesson.completedTopics
//           });
//         }
//       });

//       // Group modules
//       const completedModules = (batch.batchProgress?.completedModules || []).map(moduleId => {
//         const mod = moduleMap[moduleId.toString()];
//         if (mod) {
//           return {
//             _id: mod._id,
//             title: mod.title,
//             description: mod.description,
//             completedLessons: mod.completedLessons
//           };
//         }
//         return null;
//       }).filter(Boolean);

//       // Add enriched batch progress
//       enrichedBatches.push({
//         ...batch,
//         batchProgress: {
//           completedModules,
//           percentage
//         }
//       });
//     }

//     res.status(200).json({ batches: enrichedBatches });
//   } catch (error) {
//     console.error('Error fetching batches:', error);
//     res.status(500).json({ message: 'Error fetching batches', error });
//   }
// };


exports.getAllBatches = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('course')
      .populate('professor')
      .populate('users')
      .populate('quizzes')
      .populate('events')
      .lean(); // Convert Mongoose docs to plain JS objects

    const enrichedBatches = [];

    for (const batch of batches) {
      const course = batch.course;
      if (!course || !Array.isArray(course.modules)) continue;

      // Build lookup maps
      const moduleMap = {};
      const lessonMap = {};
      const topicMap = {};

      course.modules.forEach(mod => {
        const modId = mod._id.toString();
        moduleMap[modId] = {
          _id: mod._id,
          title: mod.moduleTitle,
          description: mod.moduleDescription,
          completedLessons: []
        };

        if (!Array.isArray(mod.lessons)) return;
        mod.lessons.forEach(les => {
          const lesId = les._id.toString();
          lessonMap[lesId] = {
            _id: les._id,
            title: les.title,
            moduleId: modId,
            completedTopics: []
          };

          if (!Array.isArray(les.topics)) return;
          les.topics.forEach(top => {
            topicMap[top._id.toString()] = {
              _id: top._id,
              title: top.title,
              lessonId: lesId
            };
          });
        });
      });

      const allLessonIds = Object.keys(lessonMap);
      const completedLessons = batch.batchProgress?.completedLessons || [];
      const completedTopics = batch.batchProgress?.completedTopics || [];

      const validCompletedLessonIds = completedLessons.filter(id =>
        allLessonIds.includes(id.toString())
      );
      const uniqueCompletedLessonIds = [...new Set(validCompletedLessonIds.map(id => id.toString()))];

      const percentage = allLessonIds.length === 0
        ? 0
        : Math.round((uniqueCompletedLessonIds.length / allLessonIds.length) * 100);

      // Group topics into their respective lessons
      completedTopics.forEach(topicId => {
        const topic = topicMap[topicId.toString()];
        if (topic && lessonMap[topic.lessonId]) {
          lessonMap[topic.lessonId].completedTopics.push({
            _id: topic._id,
            title: topic.title
          });
        }
      });

      // Group lessons into modules
      uniqueCompletedLessonIds.forEach(lessonId => {
        const lesson = lessonMap[lessonId];
        if (lesson && moduleMap[lesson.moduleId]) {
          moduleMap[lesson.moduleId].completedLessons.push({
            _id: lesson._id,
            title: lesson.title,
            completedTopics: lesson.completedTopics
          });
        }
      });

      // Group completed modules
      const completedModuleIds = batch.batchProgress?.completedModules || [];
      const completedModules = completedModuleIds.map(moduleId => {
        const mod = moduleMap[moduleId.toString()];
        return mod
          ? {
            _id: mod._id,
            title: mod.title,
            description: mod.description,
            completedLessons: mod.completedLessons
          }
          : null;
      }).filter(Boolean);

      enrichedBatches.push({
        ...batch,
        batchProgress: {
          completedModules,
          percentage
        }
      });
    }

    res.status(200).json({ batches: enrichedBatches });
  } catch (error) {
    console.error('Error fetching batches:', error);
    res.status(500).json({ message: 'Error fetching batches', error: error.message || error });
  }
};



// Get batch by ID with progress tracking
// exports.getBatchById = async (req, res) => {
//   try {
//     const { id } = req.params;

//     const batch = await Batch.findById(id)
//       .populate('course')
//       .populate('users', 'name email')
//       .populate('professor', 'name email')
//       .lean();

//     if (!batch) return res.status(404).json({ message: 'Batch not found' });

//     const { batchProgress, course } = batch;

//     const moduleMap = {};
//     const lessonMap = {};
//     const topicMap = {};

//     // Build Maps for lookup
//     course.modules.forEach(mod => {
//       const modId = mod._id.toString();
//       moduleMap[modId] = {
//         _id: mod._id,
//         title: mod.moduleTitle,
//         description: mod.moduleDescription,
//         completedLessons: []
//       };

//       mod.lessons.forEach(les => {
//         const lesId = les._id.toString();
//         lessonMap[lesId] = {
//           _id: les._id,
//           title: les.title,
//           moduleId: modId,
//           completedTopics: []
//         };

//         les.topics.forEach(top => {
//           topicMap[top._id.toString()] = {
//             _id: top._id,
//             title: top.title,
//             lessonId: lesId
//           };
//         });
//       });
//     });

//     // Group completedTopics into their lessons
//     batchProgress.completedTopics.forEach(topicId => {
//       const topic = topicMap[topicId.toString()];
//       if (topic) {
//         const lesson = lessonMap[topic.lessonId];
//         if (lesson) {
//           lesson.completedTopics.push({
//             _id: topic._id,
//             title: topic.title
//           });
//         }
//       }
//     });

//     // Group completedLessons into their modules
//     batchProgress.completedLessons.forEach(lessonId => {
//       const lesson = lessonMap[lessonId.toString()];
//       if (lesson) {
//         moduleMap[lesson.moduleId].completedLessons.push({
//           _id: lesson._id,
//           title: lesson.title,
//           completedTopics: lesson.completedTopics || []
//         });
//       }
//     });

//     // Get only completed modules with nested lessons & topics
//     const populatedModules = batchProgress.completedModules.map(moduleId => {
//       const module = moduleMap[moduleId.toString()];
//       if (module) {
//         return {
//           _id: module._id,
//           title: module.title,
//           description: module.description,
//           completedLessons: module.completedLessons || []
//         };
//       }
//       return null;
//     }).filter(Boolean); // remove nulls

//     batch.batchProgress = {
//       completedModules: populatedModules,
//       percentage: batchProgress.percentage
//     };

//     res.status(200).json({
//       message: 'Batch fetched successfully',
//       batch
//     });
//   } catch (error) {
//     console.error('Error fetching batch by ID:', error); // ✅ Add this to see real error
//     res.status(500).json({ message: 'Error fetching batch', error: error.message || error });
//   }
// };

exports.getBatchById = async (req, res) => {
  try {
    const { id } = req.params;

    const batch = await Batch.findById(id)
      .populate({
        path: 'course',
        populate: {
          path: 'modules',
          populate: {
            path: 'lessons',
            populate: { path: 'topics' },
          },
        },
      })
      .populate('professor')
      .populate('users');

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const course = batch.course;
    if (!course) {
      return res.status(400).json({ message: 'No course assigned to this batch' });
    }

    // Build lookup maps
    const moduleMap = {};
    const lessonMap = {};
    const topicMap = {};

    course.modules.forEach((mod) => {
      const modId = mod._id.toString();
      moduleMap[modId] = {
        _id: mod._id,
        title: mod.moduleTitle,
        description: mod.moduleDescription,
        completedLessons: [],
      };

      mod.lessons.forEach((les) => {
        const lesId = les._id.toString();
        lessonMap[lesId] = {
          _id: les._id,
          title: les.title,
          moduleId: modId,
          completedTopics: [],
        };

        les.topics.forEach((top) => {
          topicMap[top._id.toString()] = {
            _id: top._id,
            title: top.title,
            lessonId: lesId,
          };
        });
      });
    });

    const allLessonIds = Object.keys(lessonMap);
    const completedLessons = batch.batchProgress?.completedLessons || [];
    const completedTopics = batch.batchProgress?.completedTopics || [];

    const validCompletedLessonIds = completedLessons.filter((id) =>
      allLessonIds.includes(id.toString())
    );
    const uniqueCompletedLessonIds = [...new Set(validCompletedLessonIds.map((id) => id.toString()))];

    const percentage =
      allLessonIds.length === 0
        ? 0
        : Math.round((uniqueCompletedLessonIds.length / allLessonIds.length) * 100);

    // Group topics into lessons
    completedTopics.forEach((topicId) => {
      const topic = topicMap[topicId.toString()];
      if (topic && lessonMap[topic.lessonId]) {
        lessonMap[topic.lessonId].completedTopics.push({
          _id: topic._id,
          title: topic.title,
        });
      }
    });

    // Group lessons into modules
    uniqueCompletedLessonIds.forEach((lessonId) => {
      const lesson = lessonMap[lessonId];
      if (lesson && moduleMap[lesson.moduleId]) {
        moduleMap[lesson.moduleId].completedLessons.push({
          _id: lesson._id,
          title: lesson.title,
          completedTopics: lesson.completedTopics,
        });
      }
    });

    const completedModules = (batch.batchProgress?.completedModules || []).map((modId) => {
      const mod = moduleMap[modId.toString()];
      if (mod) {
        return {
          _id: mod._id,
          title: mod.title,
          description: mod.description,
          completedLessons: mod.completedLessons,
        };
      }
      return null;
    }).filter(Boolean);

    // Count totals
    const totalLessons = allLessonIds.length;
    const completedLessonCount = uniqueCompletedLessonIds.length;
    const totalTopics = Object.keys(topicMap).length;
    const completedTopicCount = completedTopics.length;

    res.status(200).json({
      message: 'Batch fetched successfully',
      batch,
      progress: {
        percentage,
        totalLessons,
        completedLessons: completedLessonCount,
        totalTopics,
        completedTopics: completedTopicCount,
        completedModules,
      },
    });
  } catch (error) {
    console.error('Error fetching batch by ID:', error);
    res.status(500).json({
      message: 'Error fetching batch',
      error: error.message || error,
    });
  }
};




// Update batch with progress tracking
// exports.updateBatch = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       batchName,
//       course,
//       users,
//       professor,
//       startDate,
//       endDate,
//       quizzes,
//       events,
//       completedModules = [],
//       completedLessons = [],
//       completedTopics = [],
//       markAsCompleted = false
//     } = req.body;

//     const batch = await Batch.findById(id);
//     if (!batch) return res.status(404).json({ message: 'Batch not found' });

//     const courseDoc = await Course.findById(course || batch.course).lean();
//     if (!courseDoc) return res.status(404).json({ message: 'Course not found' });

//     // ✅ Count total lessons across all modules
//     const allLessons = [];
//     courseDoc.modules.forEach(mod => {
//       mod.lessons.forEach(les => {
//         allLessons.push(les._id.toString());
//       });
//     });

//     const totalLessons = allLessons.length;

//     const completedLessonIds = completedLessons.map(id => id.toString());
//     const uniqueCompletedLessons = [...new Set(completedLessonIds.filter(id => allLessons.includes(id)))];

//     const percentage = totalLessons === 0 ? 0 : Math.round((uniqueCompletedLessons.length / totalLessons) * 100);

//     // ✅ Update batch fields
//     batch.batchName = batchName || batch.batchName;
//     batch.course = course || batch.course;
//     batch.users = users || batch.users;
//     batch.professor = professor || batch.professor;
//     batch.startDate = startDate || batch.startDate;
//     batch.endDate = endDate || batch.endDate;
//     batch.quizzes = quizzes || batch.quizzes;
//     batch.events = events || batch.events;

//     batch.batchProgress = {
//       completedModules,
//       completedLessons: uniqueCompletedLessons,
//       completedTopics,
//       percentage
//     };

//     // ✅ Mark as completed and send email
//     // ✅ Handle course completion toggle
//     if (markAsCompleted && !batch.courseCompleted) {
//       // ✅ Mark as completed
//       batch.courseCompleted = true;
//       batch.courseCompletedAt = new Date();

//       const adminEmail = process.env.ADMIN_EMAIL || ADMIN_EMAIL;

//       await sendEmail(
//         adminEmail,
//         `${batch.batchName}`,
//         `${courseDoc.title}`,  // FIXED: using courseDoc, not batch.course
//         `${batch.users.length}`
//       );
//     } else if (!markAsCompleted && batch.courseCompleted) {
//       // ❌ Unmark as completed
//       batch.courseCompleted = false;
//       batch.courseCompletedAt = null;
//     }
//     // ✅ Save the batch

//     await batch.save();

//     // ✅ Create nested structure response
//     const moduleMap = {};
//     const lessonMap = {};
//     const topicMap = {};

//     courseDoc.modules.forEach(mod => {
//       const modId = mod._id.toString();
//       moduleMap[modId] = {
//         _id: mod._id,
//         title: mod.moduleTitle,
//         description: mod.moduleDescription,
//         completedLessons: []
//       };

//       mod.lessons.forEach(les => {
//         const lesId = les._id.toString();
//         lessonMap[lesId] = {
//           _id: les._id,
//           title: les.title,
//           moduleId: modId,
//           completedTopics: []
//         };

//         les.topics.forEach(top => {
//           topicMap[top._id.toString()] = {
//             _id: top._id,
//             title: top.title,
//             lessonId: lesId
//           };
//         });
//       });
//     });

//     // ✅ Assign completed topics to lessons
//     completedTopics.forEach(topicId => {
//       const topic = topicMap[topicId.toString()];
//       if (topic && lessonMap[topic.lessonId]) {
//         lessonMap[topic.lessonId].completedTopics.push({
//           _id: topic._id,
//           title: topic.title
//         });
//       }
//     });

//     // ✅ Assign completed lessons to modules
//     uniqueCompletedLessons.forEach(lessonId => {
//       const lesson = lessonMap[lessonId.toString()];
//       if (lesson && moduleMap[lesson.moduleId]) {
//         moduleMap[lesson.moduleId].completedLessons.push({
//           _id: lesson._id,
//           title: lesson.title,
//           completedTopics: lesson.completedTopics
//         });
//       }
//     });

//     // ✅ Prepare completedModules for response
//     const populatedModules = completedModules.map(moduleId => {
//       const mod = moduleMap[moduleId.toString()];
//       if (mod) {
//         return {
//           _id: mod._id,
//           title: mod.title,
//           description: mod.description,
//           completedLessons: mod.completedLessons
//         };
//       }
//       return null;
//     }).filter(Boolean);

//     const responseBatch = batch.toObject();
//     responseBatch.batchProgress = {
//       completedModules: populatedModules,
//       percentage
//     };

//     res.status(200).json({
//       message: 'Batch updated successfully',
//       batch: responseBatch
//     });

//   } catch (error) {
//     console.error('Error updating batch:', error);
//     res.status(500).json({ message: 'Error updating batch', error });
//   }
// };



// exports.updateBatch = async (req, res) => {
//   try {
//     const { id } = req.params;
//     const {
//       batchName,
//       course,
//       users,
//       professor,
//       startDate,
//       endDate,
//       quizzes,
//       events,
//       completedModules = [],
//       completedLessons = [],
//       completedTopics = [],
//       markAsCompleted = false
//     } = req.body;

//     let batch = await Batch.findById(id);
//     if (!batch) {
//       return res.status(404).json({ message: 'Batch not found' });
//     }

//     // Update batch fields
//     batch.batchName = batchName || batch.batchName;
//     batch.course = course || batch.course;
//     batch.users = users || batch.users;
//     batch.professor = professor || batch.professor;
//     batch.startDate = startDate || batch.startDate;
//     batch.endDate = endDate || batch.endDate;
//     batch.quizzes = quizzes || batch.quizzes;
//     batch.events = events || batch.events;

//     // Progress update
//     if (!batch.batchProgress) batch.batchProgress = {};
//     batch.batchProgress.completedModules = completedModules;
//     batch.batchProgress.completedLessons = completedLessons;
//     batch.batchProgress.completedTopics = completedTopics;

//     // Get total counts from course to calculate percentage
//     const courseDoc = await Course.findById(course);
//     let totalModules = 0, totalLessons = 0, totalTopics = 0;

//     if (courseDoc && courseDoc.modules) {
//       totalModules = courseDoc.modules.length;

//       courseDoc.modules.forEach(mod => {
//         if (mod.lessons) {
//           totalLessons += mod.lessons.length;
//           mod.lessons.forEach(lesson => {
//             if (lesson.topics) totalTopics += lesson.topics.length;
//           });
//         }
//       });
//     }

//     // Count completed
//     const completedModulesCount = completedModules.length;
//     const completedLessonsCount = completedLessons.length;
//     const completedTopicsCount = completedTopics.length;

//     // Safe checks to avoid division by 0
//     const totalProgressItems = totalModules + totalLessons + totalTopics || 1;
//     const completedProgressItems = completedModulesCount + completedLessonsCount + completedTopicsCount;

//     const percentage = Math.floor((completedProgressItems / totalProgressItems) * 100);
//     batch.batchProgress.percentage = percentage;

//     // Handle course completion
//     if (markAsCompleted && percentage === 100) {
//       batch.courseCompleted = true;
//       batch.batchProgress.percentage = 100;

//       // Set inactive date for 15 days after completion
//       const completionDate = moment().add(15, 'days').toDate();
//       batch.inactiveDate = completionDate;

//       // Send fancy email to admin
//       await sendEmail(
//         ADMIN_EMAIL,
//         `🎓 Reminder: Generate Certificates for "${batch.batchName}"`,
//         `<h2 style="color: #4caf50;">Batch "${batch.batchName}" Completed!</h2>
//          <p>The course <strong>${courseDoc?.title || 'this course'}</strong> has been marked complete.</p>
//          <p><strong>Professor:</strong> ${batch.professor}</p>
//          <p><strong>Users:</strong> ${batch.users.length} interns</p>
//          <p>Please generate the certificates within 15 days to avoid auto-deactivation.</p>`
//       );
//     }

//     await batch.save();

//     return res.status(200).json({
//       message: 'Batch updated successfully',
//       batch
//     });

//   } catch (error) {
//     console.error('❌ Error updating batch:', error);
//     return res.status(500).json({ message: 'Internal server error', error });
//   }
// };


exports.updateBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      batchName,
      course,
      users,
      professor,
      startDate,
      endDate,
      quizzes,
      events,
      completedModules = [],
      completedLessons = [],
      completedTopics = [],
      markAsCompleted
    } = req.body;

    let batch = await Batch.findById(id);
    if (!batch) return res.status(404).json({ message: '❌ Batch not found' });

    // Update fields
    batch.batchName = batchName || batch.batchName;
    batch.course = course || batch.course;
    batch.users = users || batch.users;
    batch.professor = professor || batch.professor;
    batch.startDate = startDate || batch.startDate;
    batch.endDate = endDate || batch.endDate;
    batch.quizzes = quizzes || [];
    batch.events = events || [];

    // Initialize progress structure
    if (!batch.batchProgress) batch.batchProgress = {};
    batch.batchProgress.completedModules = completedModules;
    batch.batchProgress.completedLessons = completedLessons;
    batch.batchProgress.completedTopics = completedTopics;

    // Load actual course structure
    const courseData = await Course.findById(course);
    if (!courseData) return res.status(404).json({ message: '❌ Course not found' });

    // Calculate total modules, lessons, topics
    const allModuleIds = courseData.modules.map(mod => mod._id.toString());
    const allLessonIds = [];
    const allTopicIds = [];

    courseData.modules.forEach(mod => {
      mod.lessons.forEach(lesson => {
        allLessonIds.push(lesson._id.toString());
        lesson.topics.forEach(topic => {
          allTopicIds.push(topic._id.toString());
        });
      });
    });

    const totalModules = allModuleIds.length;
    const totalLessons = allLessonIds.length;
    const totalTopics = allTopicIds.length;

    // Ensure only valid IDs are counted
    const completedModuleCount = completedModules.filter(id => allModuleIds.includes(id)).length;
    const completedLessonCount = completedLessons.filter(id => allLessonIds.includes(id)).length;
    const completedTopicCount = completedTopics.filter(id => allTopicIds.includes(id)).length;

    const totalItems = totalModules + totalLessons + totalTopics;
    const completedItems = completedModuleCount + completedLessonCount + completedTopicCount;

    const percentage = totalItems === 0 ? 0 : Math.floor((completedItems / totalItems) * 100);
    batch.batchProgress.percentage = percentage;

    console.log("✔ Total:", totalItems, "Completed:", completedItems, "→ %:", percentage);

    // Handle markAsCompleted toggle
    if (typeof markAsCompleted === 'boolean') {
      batch.courseCompleted = markAsCompleted;
    }

    // Handle full completion
    if (markAsCompleted && percentage === 100) {
      batch.courseCompleted = true;
      batch.batchProgress.percentage = 100;

      // Set inactive after 15 days
      const completionDate = moment().add(15, 'days').toDate();
      batch.inactiveDate = completionDate;

      // Fetch professor details for email
      const profDoc = await Professor.findById(professor);
      console.log("✔ Professor:", profDoc);

      // Send reminder email to admin
      await sendEmail(
        ADMIN_EMAIL,
        `🎓 Reminder: Generate Certificates for "${batch.batchName}"`,
        `<h2 style="color: #4caf50;">Batch "${batch.batchName}" Completed!</h2>
         <p>The course <strong>${courseData.title}</strong> has been marked complete.</p>
         <p><strong>Professor:</strong> ${profDoc?.name || 'N/A'}</p>
         <p><strong>Users:</strong> ${batch.users.length} interns</p>
         <p>Please generate the certificates within 15 days to avoid auto-deactivation.</p>`
      );
    }

    // Save and return
    await batch.save();

    if (users) {
      // Remove batch from users no longer in it
      const removedUsers = oldUsers.filter(uid => !users.includes(uid));
      if (removedUsers.length > 0) {
        await User.updateMany(
          { _id: { $in: removedUsers } },
          {
            $unset: { batchAssigned: "", batchStartDate: "", batchEndDate: "" }
          }
        );
      }

      // Assign batch to new users
      const newUsers = users.filter(uid => !oldUsers.includes(uid));
      if (newUsers.length > 0) {
        await User.updateMany(
          { _id: { $in: newUsers } },
          {
            $set: {
              batchAssigned: batch._id,
              batchStartDate: batch.startDate,
              batchEndDate: batch.endDate || null
            }
          }
        );
      }
    }

    const populated = await Batch.findById(batch._id)
      .populate('course', 'title')
      .populate('users', 'name email')
      .populate('professor', 'name email');

    return res.status(200).json({
      message: "✅ Batch updated successfully",
      batch: populated
    });

  } catch (error) {
    console.error("❌ Error updating batch:", error);
    return res.status(500).json({ message: '❌ Internal Server Error', error: error.message });
  }
};




exports.deleteBatch = async (req, res) => {
  try {
    const { id } = req.params;
    const deleted = await Batch.findByIdAndDelete(id);
    if (!deleted) return res.status(404).json({ message: 'Batch not found' });

    res.status(200).json({ message: 'Batch deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting batch', error });
  }
};

// exports.getBatchStats = async (req, res) => {
//   try {
//     const [total, active, completed, allBatches] = await Promise.all([
//       Batch.countDocuments(),
//       Batch.countDocuments({ isActive: true }),
//       Batch.countDocuments({ courseCompleted: true }),
//       Batch.find({})
//         .populate("users", "name email role")
//         .populate("course", "title")
//         .populate("professor", "name")
//         .lean()
//     ]);

//     // ✅ Graph Data: Batches Created per Month
//     const creationGraph = {};
//     allBatches.forEach(batch => {
//       const createdAt = moment(batch.createdAt).format("YYYY-MM");
//       creationGraph[createdAt] = (creationGraph[createdAt] || 0) + 1;
//     });

//     // ✅ Graph Data: Completed Batches per Month
//     const completedGraph = {};
//     allBatches.forEach(batch => {
//       if (batch.courseCompletedAt) {
//         const completedMonth = moment(batch.courseCompletedAt).format("YYYY-MM");
//         completedGraph[completedMonth] = (completedGraph[completedMonth] || 0) + 1;
//       }
//     });

//     // ✅ Top 5 Batches by User Count
//     const topBatches = [...allBatches]
//       .sort((a, b) => b.users.length - a.users.length)
//       .slice(0, 5)
//       .map(batch => ({
//         batchName: batch.batchName,
//         courseTitle: batch.course?.title || "N/A",
//         userCount: batch.users.length,
//         progress: batch.batchProgress?.percentage || 0
//       }));

//     // ✅ Detailed Batch Info
//     const detailedBatches = allBatches.map(batch => ({
//       id: batch._id,
//       batchName: batch.batchName,
//       course: batch.course?.title || "N/A",
//       professor: batch.professor?.name || "N/A",
//       users: batch.users.map(u => ({ name: u.name, email: u.email, role: u.role })),
//       startDate: batch.startDate,
//       endDate: batch.endDate,
//       isActive: batch.isActive,
//       courseCompleted: batch.courseCompleted,
//       percentage: batch.batchProgress?.percentage || 0
//     }));

//     res.status(200).json({
//       summary: {
//         totalBatches: total,
//         activeBatches: active,
//         completedBatches: completed
//       },
//       graphData: {
//         batchesCreatedMonthly: creationGraph,
//         batchesCompletedMonthly: completedGraph
//       },
//       topBatches,
//       detailedBatches
//     });
//   } catch (error) {
//     console.error("Error fetching batch stats:", error);
//     res.status(500).json({ message: "Error fetching batch stats", error });
//   }
// };


// exports.getBatchStats = async (req, res) => {
//   try {
//     const batches = await Batch.find()
//       .populate('course', 'title')
//       .populate('professor', 'name')
//       .populate('users', 'name email role');

//     const now = moment();
//     const summary = {
//       totalBatches: batches.length,
//       activeBatches: batches.filter(b => b.isActive).length,
//       completedBatches: batches.filter(b => b.courseCompleted).length,
//     };

//     const batchesCreatedMonthly = {};
//     const batchesCompletedMonthly = {};

//     const topBatches = [];
//     const detailedBatches = [];

//     for (const batch of batches) {
//       const createdMonth = moment(batch.createdAt).format('YYYY-MM');
//       batchesCreatedMonthly[createdMonth] = (batchesCreatedMonthly[createdMonth] || 0) + 1;

//       if (batch.courseCompleted) {
//         const completedMonth = moment(batch.updatedAt).format('YYYY-MM');
//         batchesCompletedMonthly[completedMonth] = (batchesCompletedMonthly[completedMonth] || 0) + 1;
//       }

//       // Progress percentage (fallback to 0 if not present)
//       const progress = batch.percentage || 0;

//       // Add to topBatches
//       topBatches.push({
//         batchName: batch.batchName,
//         courseTitle: batch.course?.title || '',
//         userCount: batch.users.length,
//         progress,
//       });

//       // Add to detailedBatches
//       detailedBatches.push({
//         id: batch._id,
//         batchName: batch.batchName,
//         course: batch.course?.title || '',
//         professor: batch.professor?.name || '',
//         users: batch.users.map(u => ({
//           name: u.name,
//           email: u.email,
//           role: u.role,
//         })),
//         startDate: batch.startDate,
//         endDate: batch.endDate,
//         isActive: batch.isActive,
//         courseCompleted: batch.courseCompleted,
//         percentage: progress,
//       });
//     }

//     // Sort topBatches by progress descending
//     topBatches.sort((a, b) => b.progress - a.progress);

//     res.json({
//       summary,
//       graphData: {
//         batchesCreatedMonthly,
//         batchesCompletedMonthly,
//       },
//       topBatches,
//       detailedBatches,
//     });

//   } catch (error) {
//     console.error('Error getting batch dashboard data:', error);
//     res.status(500).json({ message: 'Server error' });
//   }
// };



exports.getBatchStats = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate({
        path: 'course',
        populate: {
          path: 'modules',
          populate: {
            path: 'lessons',
            populate: {
              path: 'topics',
            },
          },
        },
      })
      .populate('professor', 'name')
      .populate('users', 'name email role');

    const now = moment();
    const summary = {
      totalBatches: batches.length,
      activeBatches: batches.filter(b => b.isActive).length,
      completedBatches: batches.filter(b => b.courseCompleted).length,
    };

    const batchesCreatedMonthly = {};
    const batchesCompletedMonthly = {};

    const topBatches = [];
    const detailedBatches = [];

    for (const batch of batches) {
      const createdMonth = moment(batch.createdAt).format('YYYY-MM');
      batchesCreatedMonthly[createdMonth] = (batchesCreatedMonthly[createdMonth] || 0) + 1;

      if (batch.courseCompleted) {
        const completedMonth = moment(batch.updatedAt).format('YYYY-MM');
        batchesCompletedMonthly[completedMonth] = (batchesCompletedMonthly[completedMonth] || 0) + 1;
      }

      // --- 🧠 Calculate Dynamic Percentage ---
      let totalLessons = 0;
      const allLessonIds = [];

      if (batch.course?.modules) {
        batch.course.modules.forEach(module => {
          module.lessons.forEach(lesson => {
            totalLessons++;
            allLessonIds.push(lesson._id.toString());
          });
        });
      }

      const completedLessons = (batch.batchProgress?.completedLessons || []).map(id => id.toString());
      const uniqueCompletedLessons = [...new Set(completedLessons.filter(id => allLessonIds.includes(id)))];

      const percentage = totalLessons > 0
        ? Math.round((uniqueCompletedLessons.length / totalLessons) * 100)
        : 0;

      // --- 📊 Add to Aggregates ---
      topBatches.push({
        batchName: batch.batchName,
        courseTitle: batch.course?.title || '',
        userCount: batch.users.length,
        progress: percentage,
      });

      detailedBatches.push({
        id: batch._id,
        batchName: batch.batchName,
        course: batch.course?.title || '',
        professor: batch.professor?.name || '',
        users: batch.users.map(u => ({
          name: u.name,
          email: u.email,
          role: u.role,
        })),
        startDate: batch.startDate,
        endDate: batch.endDate,
        isActive: batch.isActive,
        courseCompleted: batch.courseCompleted,
        percentage: percentage,
      });
    }

    // Sort top batches by progress descending
    topBatches.sort((a, b) => b.progress - a.progress);

    // Respond with full dashboard data
    res.json({
      summary,
      graphData: {
        batchesCreatedMonthly,
        batchesCompletedMonthly,
      },
      topBatches,
      detailedBatches,
    });

  } catch (error) {
    console.error('Error getting batch dashboard data:', error);
    res.status(500).json({ message: 'Server error' });
  }
};













// Send certificate emails to selected users
// exports.sendBatchCertificates = async (req, res) => {
//   try {
//     const { batchId } = req.body;

//     // Step 1: Get batch, course, and users
//     const batch = await Batch.findById(batchId).populate('users course');
//     if (!batch) return res.status(404).json({ message: 'Batch not found' });

//     const { users, course } = batch;
//     if (!users.length) return res.status(400).json({ message: 'No users in batch' });
//     if (!course) return res.status(400).json({ message: 'Course not associated with batch' });

//     // Step 2: Loop through users
//     for (const user of users) {
//       const certId = generateCertificateId();

//       // Generate PDF Buffer
//       const pdfBuffer = await generateCertificate({
//         userName: user.name,
//         courseTitle: course.title,
//       });

//       // Save PDF temporarily to disk
//       const tempFilePath = path.join(__dirname, `../temp/${certId}.pdf`);
//       fs.writeFileSync(tempFilePath, pdfBuffer);

//       // Upload to Cloudinary
//       const certUrl = await uploadCertificateToCloudinary(tempFilePath, `${certId}.pdf`);

//       // Save progress update
//       await Progress.findOneAndUpdate(
//         { user: user._id, course: course._id },
//         {
//           isCompleted: true,
//           completedAt: new Date(),
//           certificateUrl: certUrl,
//           certificateId: certId
//         },
//         { new: true, upsert: true }
//       );

//       // Send fancy email with certificate
//       await sendCertificateMail({
//         to: user.email,
//         name: user.name,
//         courseTitle: course.title,
//         certUrl,
//         certId
//       });
//     }

//     // Step 3: Update batch certificate issuance info
//     batch.certificatesIssued = true;
//     batch.certificatesIssuedAt = new Date();
//     await batch.save();

//     // Step 4: Return success response
//     return res.status(200).json({
//       message: `Certificates successfully sent to all ${users.length} users in batch "${batch.batchName}"`,
//       courseTitle: course.title,
//     });
//   } catch (error) {
//     console.error('Error sending certificates:', error);
//     return res.status(500).json({ message: 'Error sending certificates', error });
//   }
// };



exports.sendBatchCertificates = async (req, res) => {
  try {
    const { batchId } = req.body;

    const batch = await Batch.findById(batchId).populate('users course');
    if (!batch) return res.status(404).json({ message: 'Batch not found' });

    const { users, course } = batch;
    if (!users.length) return res.status(400).json({ message: 'No users in batch' });
    if (!course) return res.status(400).json({ message: 'Course not associated with batch' });

    const issued = [];
    const notIssued = [];

    for (const user of users) {
      try {
        const certId = generateCertificateId();

        // Generate certificate PDF
        const pdfBuffer = await generateCertificate({
          userName: user.name,
          courseTitle: course.title,
        });

        const tempFilePath = path.join(__dirname, `../temp/${certId}.pdf`);
        fs.writeFileSync(tempFilePath, pdfBuffer);

        // Upload to Cloudinary
        const certUrl = await uploadCertificateToCloudinary(tempFilePath, `${certId}.pdf`);

        // Save to progress
        await Progress.findOneAndUpdate(
          { user: user._id, course: course._id },
          {
            isCompleted: true,
            completedAt: new Date(),
            certificateUrl: certUrl,
            certificateId: certId
          },
          { new: true, upsert: true }
        );

        // Send fancy email
        await sendCertificateMail({
          to: user.email,
          name: user.name,
          courseTitle: course.title,
          certUrl,
          certId
        });

        issued.push({ userId: user._id.toString(), name: user.name, email: user.email });

        // Clean up temporary file only if it exists
        if (fs.existsSync(tempFilePath)) {
          fs.unlinkSync(tempFilePath);
        }
      } catch (err) {
        console.error(`❌ Certificate failed for ${user.email}:`, err);
        notIssued.push({ userId: user._id.toString(), name: user.name, email: user.email });
      }
    }

    // Update batch fields
    batch.certificatesIssued = issued.length === users.length;
    batch.certificatesIssuedAt = new Date();
    batch.certificatesIssuedTo = issued.map(u => u.userId);
    await batch.save();

    return res.status(200).json({
      message: 'Batch certificate process completed.',
      issuedCount: issued.length,
      notIssuedCount: notIssued.length,
      issuedTo: issued,
      notIssuedTo: notIssued
    });
  } catch (error) {
    console.error('Error sending certificates:', error);
    return res.status(500).json({ message: 'Error sending certificates', error });
  }
};


// get batch certificate status by batch ID
exports.getBatchCertificateStatus = async (req, res) => {
  try {
    const { batchId } = req.params;

    const batch = await Batch.findById(batchId)
      .populate('users', 'name email') // get user details
      .populate('certificatesIssuedTo', 'name email'); // get issuedTo details

    if (!batch) {
      return res.status(404).json({ message: 'Batch not found' });
    }

    const allUsers = batch.users || [];
    const issuedUsers = batch.certificatesIssuedTo || [];

    // Convert to string for safe comparison
    const issuedIds = issuedUsers.map(u => u._id.toString());

    // Separate issued and not issued
    const issuedTo = issuedUsers.map(user => ({
      _id: user._id,
      name: user.name,
      email: user.email
    }));

    const notIssuedTo = allUsers
      .filter(user => !issuedIds.includes(user._id.toString()))
      .map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email
      }));

    res.status(200).json({
      message: 'Batch certificate status fetched successfully',
      totalUsers: allUsers.length,
      issuedCount: issuedTo.length,
      notIssuedCount: notIssuedTo.length,
      issuedTo,
      notIssuedTo
    });
  } catch (error) {
    console.error('Error fetching batch certificate status:', error);
    res.status(500).json({
      message: 'Error fetching batch certificate status',
      error
    });
  }
};


// get all batches certificate status 
exports.getAllBatchesCertificateStatus = async (req, res) => {
  try {
    const batches = await Batch.find()
      .populate('users', 'name email')
      .populate('certificatesIssuedTo', 'name email');

    const results = [];

    for (const batch of batches) {
      const allUsers = batch.users || [];
      const issuedUsers = batch.certificatesIssuedTo || [];

      const issuedIds = issuedUsers.map(user => user._id.toString());

      const issuedTo = issuedUsers.map(user => ({
        _id: user._id,
        name: user.name,
        email: user.email
      }));

      const notIssuedTo = allUsers
        .filter(user => !issuedIds.includes(user._id.toString()))
        .map(user => ({
          _id: user._id,
          name: user.name,
          email: user.email
        }));

      results.push({
        batchId: batch._id,
        batchName: batch.batchName,
        totalUsers: allUsers.length,
        issuedCount: issuedTo.length,
        notIssuedCount: notIssuedTo.length,
        issuedTo,
        notIssuedTo
      });
    }

    return res.status(200).json({
      message: 'All batches certificate status fetched successfully',
      totalBatches: results.length,
      data: results
    });
  } catch (error) {
    console.error('Error fetching all batch certificate statuses:', error);
    return res.status(500).json({
      message: 'Error fetching all batch certificate statuses',
      error: error.message || error
    });
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



exports.getBatchesByDateRange = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required.' });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);

    // Fetch batches started between given dates
    const batches = await Batch.find({
      startDate: { $gte: start, $lte: end },
    });

    // Group batches by month
    const monthCounts = {};

    batches.forEach((batch) => {
      const monthKey = moment(batch.startDate).format('YYYY-MM');
      if (!monthCounts[monthKey]) {
        monthCounts[monthKey] = 0;
      }
      monthCounts[monthKey]++;
    });

    // Format for chart-friendly structure
    const formatted = Object.entries(monthCounts).map(([month, count]) => ({
      month,
      count,
    }));

    res.status(200).json({
      message: `Batch count by month from ${startDate} to ${endDate}`,
      totalBatches: batches.length,
      data: formatted, // For graphs
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching monthly batch stats', error });
  }
};
