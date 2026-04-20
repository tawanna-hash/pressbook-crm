// Plain module (NOT "use server") so client + server components can both
// import these runtime constants safely.

export const APPOINTMENT_TYPES = [
  "Meeting",
  "Call",
  "Signing",
  "Consultation",
  "Review",
  "Other",
] as const;

export type AppointmentType = (typeof APPOINTMENT_TYPES)[number];
