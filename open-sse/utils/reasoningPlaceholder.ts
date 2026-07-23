/**
 * Internal replay sentinel used when an upstream requires non-empty reasoning content but the
 * original reasoning summary is unavailable. It is valid request scaffolding, never user-visible
 * reasoning, so response translators must suppress it before emitting client-facing events.
 */
export const NON_ANTHROPIC_THINKING_PLACEHOLDER = "(prior reasoning summary unavailable)";

export function isInternalReasoningPlaceholder(value: unknown): boolean {
  return typeof value === "string" && value.trim() === NON_ANTHROPIC_THINKING_PLACEHOLDER;
}

/**
 * Strip the internal placeholder from user-visible content. Models sometimes
 * echo the sentinel through ordinary `message.content` / `delta.content`
 * (#8081). Removes all occurrences; returns "" when nothing meaningful
 * remains so callers can skip emission entirely. Does not trim around
 * remaining text — streaming deltas rely on edge spaces as separators.
 */
export function stripInternalReasoningPlaceholder(value: string): string {
  // Remove every sentinel occurrence, but do NOT trim the remainder.
  // Streaming deltas often carry leading/trailing spaces that are significant
  // word separators ("Hello, " + "world."); trimming them glues tokens together
  // on the client (#5786 A-guard regression).
  //
  // When the placeholder was the entire payload (optionally surrounded by
  // whitespace), return "" so callers can skip emission. Otherwise preserve
  // original spacing around any non-placeholder text.
  if (typeof value !== "string" || value.length === 0) return "";
  if (value.includes(NON_ANTHROPIC_THINKING_PLACEHOLDER) === false) return value;
  const stripped = value.replaceAll(NON_ANTHROPIC_THINKING_PLACEHOLDER, "");
  if (stripped.trim() === "") return "";
  return stripped;
}
