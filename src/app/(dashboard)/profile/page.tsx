import { notFound } from "next/navigation";

// Route intentionally disabled — Clerk's built-in UserButton handles profile.
export default function Removed(): never {
  notFound();
}
