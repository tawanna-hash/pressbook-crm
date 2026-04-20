// Shared constants for Industry Events. Kept in a plain module so both
// client and server components can import safely.

export const EVENT_COLORS = [
  "#3D0740", // plum (default)
  "#DB1924", // red
  "#F97316", // orange
  "#3B82F6", // blue
  "#10B981", // green
  "#8B5CF6", // violet
  "#EC4899", // pink
  "#0891B2", // teal
  "#059669", // emerald
  "#021D40", // navy (RealtyLine)
] as const;

export const DEFAULT_EVENT_COLOR = "#3D0740";
