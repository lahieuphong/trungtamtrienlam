import { format } from "date-fns";

export function convertDateTimeToDate(datetimeStr, type = "yyyy-MM-dd") {
  if (!datetimeStr) return
  const rawDate = new Date(datetimeStr);
  const formatted = format(rawDate, type);
  return formatted
}

export function parseTextToParts(text) {
  const urlRegex = /(https?:\/\/[^\s]+)/g;
  const parts = text.split(urlRegex);

  return parts
    .filter(p => p.trim() !== "") // loại bỏ khoảng trắng dư
    .map(part => ({
      content: part,
      isLink: /^https?:\/\//.test(part) // true nếu là link
    }));
}

export function formatDateLocal(date) {
  const pad = n => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T` +
    `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}