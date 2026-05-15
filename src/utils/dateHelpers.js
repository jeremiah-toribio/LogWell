export const formatDate = (date) => {
  const d = new Date(date);
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${month}/${day}`;
};

export const formatTime = (date) => {
  const d = new Date(date);
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
};

export const formatDateTime = (date) => {
  return `${formatDate(date)} ${formatTime(date)}`;
};

export const createDateRange = (startDate, endDate) => {
  return `${formatDate(startDate)} + ${formatDate(endDate)}`;
};

export const getTodayDate = () => {
  return new Date();
};

export const getYesterdayDate = () => {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  return yesterday;
};

// Format decimal hours (e.g., 7.50) to H:MM format (e.g., 7:30)
export const formatHoursToHMM = (decimalHours) => {
  const hours = Math.floor(parseFloat(decimalHours) || 0);
  const minutes = Math.round((parseFloat(decimalHours) % 1) * 60);
  return `${hours}:${String(minutes).padStart(2, '0')}`;
};
