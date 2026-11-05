/**
 * List of random greeting phrases for the home chat section.
 */
export const RANDOM_GREETINGS = [
  "Good to see you",
  "Welcome back",
  "Ready when you are",
  "What are we building today?",
  "What's on your mind?",
  "How can I help you today?",
  "Great to have you here",
  "Let's create something great",
  "Where should we start today?",
  "Ask me anything",
] as const;

export type RandomGreeting = (typeof RANDOM_GREETINGS)[number];

/**
 * Returns a randomly selected greeting from the available greetings list.
 * Optionally excludes a specific greeting to prevent repeats on consecutive calls.
 */
export function getRandomGreeting(exclude?: string): string {
  const pool = exclude
    ? RANDOM_GREETINGS.filter((item) => item !== exclude)
    : RANDOM_GREETINGS;
  const index = Math.floor(Math.random() * pool.length);
  return pool[index] ?? RANDOM_GREETINGS[0];
}

/**
 * Formats a greeting with the user's first name, preserving trailing punctuation.
 *
 * Example:
 *  formatGreeting("Good to see you", "Alex Doe") -> "Good to see you, Alex"
 *  formatGreeting("What's on your mind?", "Alex Doe") -> "What's on your mind, Alex?"
 *  formatGreeting("Ask me anything", null) -> "Ask me anything"
 */
export function formatGreeting(greeting: string, fullName?: string | null): string {
  const name = firstName(fullName);
  if (!name) return greeting;

  if (greeting.endsWith("?")) {
    return `${greeting.slice(0, -1)}, ${name}?`;
  }

  return `${greeting}, ${name}`;
}

/**
 * Returns a time-of-day greeting based on the user's local clock.
 * Kept for time-based contexts or backwards compatibility.
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
