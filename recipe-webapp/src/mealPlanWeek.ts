// The wireframe shows a Monday-first week ("Monday | Grandma's Chili", …).
// This derives the current week's seven calendar dates (ISO, local) from
// today, Monday first, so MealPlan can ask recipe-api for exactly that range
// and label each entry by day name without storing a day-of-week of its own —
// `plannedDate` (an ISO date) is the one fact the contract carries.
export interface WeekDay {
  name: string;
  date: string; // YYYY-MM-DD
}

const DAY_NAMES = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

function toIsoDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

export function currentWeek(today = new Date()): WeekDay[] {
  const day = today.getDay(); // 0 = Sunday
  const mondayOffset = day === 0 ? -6 : 1 - day;
  const monday = new Date(today);
  monday.setDate(today.getDate() + mondayOffset);
  monday.setHours(0, 0, 0, 0);

  return DAY_NAMES.map((name, i) => {
    const d = new Date(monday);
    d.setDate(monday.getDate() + i);
    return { name, date: toIsoDate(d) };
  });
}
