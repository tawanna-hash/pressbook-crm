/**
 * @deprecated This module used to link a Clerk user to a `contacts` row
 * by email. The client portal now uses passwordless magic-link sessions
 * (see `src/lib/auth/portal-session.ts`) and clients never create Clerk
 * accounts. Nothing in the codebase imports this file anymore.
 *
 * It's kept as an intentional tombstone to make the migration visible.
 * Safe to delete once any pending PRs are merged.
 */

export {};
