// A month of daily practice gradually fills the flame from bottom to top.
export function streakFlame(streak, instance = "streak") {
  const days = Math.max(0, Math.floor(Number(streak) || 0));
  const progress = Math.min(days / 30, 1);
  const id = `streak-${String(instance).replace(/[^a-z0-9-]/gi, "")}`;
  const height = Number((20 * progress).toFixed(3));
  const path = "M12 2C13 7 19 8 19 14C19 18.5 16 22 12 22C7.5 22 5 18.5 5 15C5 11.5 7 9.5 9 8C8.5 11 9.5 12 10.5 12.5C13 10 13 6 12 2Z";
  return `<svg class="streak-flame" viewBox="0 0 24 24" role="img" aria-label="${days} day streak; blue flame ${Math.round(progress * 100)} percent filled" style="--flame-glow:${Number((progress * .5).toFixed(3))}"><defs><linearGradient id="${id}-blue" x1="0" y1="1" x2="0" y2="0"><stop offset="0%" stop-color="#176bff"/><stop offset="65%" stop-color="#39bdff"/><stop offset="100%" stop-color="#b4edff"/></linearGradient><clipPath id="${id}-fill"><rect x="0" y="${22 - height}" width="24" height="${height}"/></clipPath></defs><path class="streak-flame-empty" d="${path}"/><path d="${path}" fill="url(#${id}-blue)" clip-path="url(#${id}-fill)"/></svg>`;
}
