const { calculateWorkingHours } = require('./workingHours');

const getPriorityLevel = (createdAt) => {
  const now = new Date();
  const hoursElapsed = calculateWorkingHours(createdAt, now);

  if (hoursElapsed < 6) return 'Low';
  if (hoursElapsed < 12) return 'Medium';
  if (hoursElapsed < 18) return 'High';
  return 'Critical';
};

module.exports = { getPriorityLevel };
