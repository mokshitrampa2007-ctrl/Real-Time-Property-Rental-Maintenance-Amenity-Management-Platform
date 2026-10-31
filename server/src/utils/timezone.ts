import { toZonedTime, fromZonedTime, format } from 'date-fns-tz';

export function isTimeInRange(
  targetTime: string, // "14:30"
  startTime: string,  // "08:00"
  endTime: string     // "22:00"
): boolean {
  return targetTime >= startTime && targetTime <= endTime;
}

export function getZonedDetails(utcDate: Date, timeZone: string) {
  try {
    const zoned = toZonedTime(utcDate, timeZone);
    const weekday = zoned.getDay(); // 0 = Sunday, 1 = Monday, ...
    const timeString = format(zoned, 'HH:mm', { timeZone });
    const dateString = format(zoned, 'yyyy-MM-dd', { timeZone });
    return { zoned, weekday, timeString, dateString };
  } catch (err) {
    // Fallback to UTC if timezone string is invalid
    const zoned = toZonedTime(utcDate, 'UTC');
    const weekday = zoned.getDay();
    const timeString = format(zoned, 'HH:mm', { timeZone: 'UTC' });
    const dateString = format(zoned, 'yyyy-MM-dd', { timeZone: 'UTC' });
    return { zoned, weekday, timeString, dateString };
  }
}

export function validateOperatingHours(
  utcStartsAt: Date,
  utcEndsAt: Date,
  timeZone: string,
  operatingHoursList: Array<{ weekday: number; openingTime: string; closingTime: string }>
): { valid: boolean; reason?: string } {
  const startDetails = getZonedDetails(utcStartsAt, timeZone);
  const endDetails = getZonedDetails(utcEndsAt, timeZone);

  // Cross-midnight bookings not supported in single slot
  if (startDetails.dateString !== endDetails.dateString) {
    return { valid: false, reason: 'Bookings spanning across midnight are not permitted.' };
  }

  const hours = operatingHoursList.find(h => h.weekday === startDetails.weekday);
  if (!hours) {
    return { valid: false, reason: `Amenity is closed on this day of the week (${['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][startDetails.weekday]}).` };
  }

  if (startDetails.timeString < hours.openingTime || endDetails.timeString > hours.closingTime) {
    return {
      valid: false,
      reason: `Booking time (${startDetails.timeString} - ${endDetails.timeString}) falls outside operating hours (${hours.openingTime} - ${hours.closingTime}) in ${timeZone}.`,
    };
  }

  return { valid: true };
}
