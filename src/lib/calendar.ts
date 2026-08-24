import {
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addDays,
  isSameMonth,
  isSameDay,
} from "date-fns";

export const WEEK_STARTS_ON = 6; // Saturday

export function getMonthGrid(anchor: Date) {
  const monthStart = startOfMonth(anchor);
  const monthEnd = endOfMonth(anchor);
  const gridStart = startOfWeek(monthStart, { weekStartsOn: WEEK_STARTS_ON });
  const gridEnd = endOfWeek(monthEnd, { weekStartsOn: WEEK_STARTS_ON });
  const days = eachDayOfInterval({ start: gridStart, end: gridEnd });

  return days.map((date) => ({
    date,
    inMonth: isSameMonth(date, anchor),
    isToday: isSameDay(date, new Date()),
  }));
}

export function getWeekDays(anchor: Date) {
  const weekStart = startOfWeek(anchor, { weekStartsOn: WEEK_STARTS_ON });
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

export const WEEKDAY_LABELS = ["السبت", "الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة"];
