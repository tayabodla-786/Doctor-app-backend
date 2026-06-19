export const formatDateKey = (input) => {
  if (input === undefined || input === null || input === "") return null;

  const str = String(input).trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  const d = new Date(str);
  if (Number.isNaN(d.getTime())) return null;

  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
};

export const getDayRangeFromKey = (dateInput) => {
  const dateKey = formatDateKey(dateInput);
  if (!dateKey) return null;

  const [y, m, d] = dateKey.split("-").map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);

  return { dateKey, start, end };
};

export const normalizeTime = (time) => {
  if (time === undefined || time === null) return "";
  const value = String(time).trim();
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return value;
  return `${match[1].padStart(2, "0")}:${match[2]}`;
};

export const timesMatch = (left, right) =>
  normalizeTime(left) === normalizeTime(right);
