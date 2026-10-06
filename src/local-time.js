export function localDateKey(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}
export function calendarDayNumber(key) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(key || '');
  if (!match) return NaN;
  const year=Number(match[1]),month=Number(match[2]),day=Number(match[3]);
  const date = new Date(0); date.setUTCFullYear(year,month-1,day);date.setUTCHours(0,0,0,0);
  if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return NaN;
  return date.getTime()/86400000;
}
export function dayGap(previous, current = localDateKey()) { return calendarDayNumber(current)-calendarDayNumber(previous); }
export function currentStreak(profile, now = new Date()) {
  const gap = dayGap(profile.lastActive,localDateKey(now));
  return gap === 0 || gap === 1 ? Math.max(0,Number(profile.streak)||0) : 0;
}
export function clockLabel(now = new Date()) {
  return `${now.toLocaleDateString(undefined,{weekday:'short',day:'numeric',month:'short',year:'numeric'})} · ${now.toLocaleTimeString(undefined,{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false})}`;
}
