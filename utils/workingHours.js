const moment = require('moment');

function calculateWorkingHours(startDate, endDate) {
  const start = moment(startDate);
  const end = moment(endDate);

  if (!start.isValid() || !end.isValid()) {
    throw new Error('Invalid date inputs to calculateWorkingHours');
  }

  const startOfWorkDay = 9; // 9 AM
  const endOfWorkDay = 18; // 6 PM

  let totalMinutes = 0;

  // Iterate day by day
  let current = moment(start);
  while (current.isSameOrBefore(end, 'minute')) {
    const day = current.isoWeekday(); // 1 (Monday) to 7 (Sunday)

    if (day >= 1 && day <= 5) {
      // Weekday
      let workStart = current.clone().hour(startOfWorkDay).minute(0).second(0);
      let workEnd = current.clone().hour(endOfWorkDay).minute(0).second(0);

      if (current.isAfter(workEnd)) {
        // Outside working hours
        current.add(1, 'day').startOf('day');
        continue;
      }

      let effectiveStart = moment.max(current, workStart);
      let effectiveEnd = moment.min(end, workEnd);

      if (effectiveEnd.isAfter(effectiveStart)) {
        totalMinutes += effectiveEnd.diff(effectiveStart, 'minutes');
      }
    }

    current.add(1, 'day').startOf('day');
  }

  return totalMinutes / 60; // return hours
}

module.exports = calculateWorkingHours;
