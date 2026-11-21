/** Small per-instance burst and sustained budgets, with no user identifiers. */
export function workBudget(burst: number, perMinute: number) {
  let tokens = burst;
  let updatedAt = Date.now();
  return () => {
    const now = Date.now();
    tokens = Math.min(burst, tokens + Math.max(0, now - updatedAt) * perMinute / 60_000);
    updatedAt = now;
    if (tokens < 1) return false;
    tokens -= 1;
    return true;
  };
}
