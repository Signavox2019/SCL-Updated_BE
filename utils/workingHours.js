const moment = require('moment');

const WORK_START_HOUR = 9;
const WORK_END_HOUR = 18;

const isWorkingDay = (day) => {
  const dayOfWeek = day.isoWeekday(); // 1 = Monday, 7 = Sunday
  return dayOfWeek >= 1 && dayOfWeek <= 5;
};

const getNextWorkStart = (date) => {
  let next = moment(date).hour(WORK_START_HOUR).minute(0).second(0);
  while (!isWorkingDay(next)) {
    next.add(1, 'day');
  }
  return next;
};

const calculateWorkingHours = (start, end) => {
  let totalHours = 0;
  let current = moment(start);

  while (current.isBefore(end)) {
    if (isWorkingDay(current)) {
      const dayStart = moment(current).hour(WORK_START_HOUR).minute(0).second(0);
      const dayEnd = moment(current).hour(WORK_END_HOUR).minute(0).second(0);

      const rangeStart = moment.max(dayStart, current);
      const rangeEnd = moment.min(dayEnd, end);

      if (rangeStart.isBefore(rangeEnd)) {
        totalHours += rangeEnd.diff(rangeStart, 'hours', true); // count partial hours
      }
    }
    current.add(1, 'day').startOf('day');
  }

  return totalHours;
};

module.exports = {
  calculateWorkingHours,
};
