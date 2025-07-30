const calculateWorkingHours = require('./workingHours');

function getPriorityLevel(createdAt) {
  const now = new Date();
  const workingHoursElapsed = calculateWorkingHours(createdAt, now); // Returns hours

  if (workingHoursElapsed < 6) return 'Low';
  if (workingHoursElapsed < 12) return 'Medium';
  if (workingHoursElapsed < 18) return 'High';
  return 'Critical';
}

module.exports = getPriorityLevel;
