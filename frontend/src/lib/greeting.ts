/**
 * Returns a time-of-day greeting based on the user's local clock.
 *
 *  05:00 – 11:59 → "Good morning"
 *  12:00 – 16:59 → "Good afternoon"
 *  17:00 – 20:59 → "Good evening"
 *  21:00 – 04:59 → "Good night"
 */
export function getTimeGreeting(): string {
  const hour = new Date().getHours();

  if (hour >= 5 && hour < 12) return "Good morning";
  if (hour >= 12 && hour < 17) return "Good afternoon";
  if (hour >= 17 && hour < 21) return "Good evening";
  return "Good night";
}

/**
 * Extracts the first name from a full-name string.
 * Falls back to the full string if it's a single word.
 */
export function firstName(fullName?: string | null): string {
  const trimmed = (fullName ?? "").trim();
  if (!trimmed) return "";
  return trimmed.split(/\s+/)[0];
}
