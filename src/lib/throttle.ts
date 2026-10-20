/**
 * Sliding-window burst throttle, kept in process memory.
 *
 * Limitation: on serverless platforms each instance has its own memory, so this is a
 * best-effort burst guard. The authoritative cost limit is the database-backed daily
 * allowance in usage_records.
 */
export function createThrottle(windowMs = 60_000, clock: () => number = () => Date.now()) {
  const hits = new Map<string, number[]>();

  return function allow(key: string, limit: number): boolean {
    const now = clock();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
    if (recent.length >= limit) {
      hits.set(key, recent);
      return false;
    }
    recent.push(now);
    hits.set(key, recent);

    if (hits.size > 5000) {
      for (const [k, list] of hits) {
        if (list.every((t) => now - t >= windowMs)) hits.delete(k);
      }
    }
    return true;
  };
}

export type Throttle = ReturnType<typeof createThrottle>;
