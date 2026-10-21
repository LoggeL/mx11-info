export function berlinSeconds(date = new Date()) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/Berlin', hour: '2-digit', minute: '2-digit', second: '2-digit', hourCycle: 'h23' }).formatToParts(date).map(part => [part.type, part.value]));
  return Number(parts.hour) * 3600 + Number(parts.minute) * 60 + Number(parts.second);
}
export function maintenanceState(date = new Date()) {
  const seconds = berlinSeconds(date);
  const state = seconds >= 23400 && seconds < 25200 ? 'active' : seconds >= 21600 && seconds < 23400 ? 'warning' : 'normal';
  return { state, ms: ((state === 'active' ? 25200 : 23400 + (seconds >= 25200 ? 86400 : 0)) - seconds) * 1000 };
}
export function formatTime(ms, short = false) {
  const s = Math.max(0, Math.floor(ms / 1000)), h = Math.floor(s / 3600), m = Math.floor(s % 3600 / 60), sec = s % 60;
  if (short && h > 0) return `${h}h ${String(m).padStart(2, '0')}m`;
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}m ${String(sec).padStart(2, '0')}s`;
  return `${String(m).padStart(2, '0')}:${String(sec).padStart(2, '0')}`;
}
