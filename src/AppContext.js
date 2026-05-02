import { createContext, useContext } from "react";

/**
 * @typedef {Object} AppContextValue
 * @property {(toolKey: string) => boolean} can
 *   RBAC check; resolved in App.jsx from ROLE_TOOLS ∪ role_tool_defaults ∪ user_tool_access.
 * @property {(msg: string, type?: "success"|"error"|"info") => void} showToast
 *   Sonner toast wrapper.
 * @property {{ id: string, email: string, user_metadata?: Record<string, unknown> } | null} user
 *   Supabase auth user.
 * @property {boolean} isOnline
 *   Mirrors navigator.onLine.
 * @property {Array<Record<string, unknown>>} clients
 *   Rows from the clients Supabase table.
 * @property {Array<Record<string, unknown>>} allCalendars
 *   Source of truth for sidebar + builder; populated by loadAllCalendars().
 * @property {(clientId: string, name: string) => Promise<Record<string, unknown>>} createCalendarForClient
 *   Inserts a new calendar row and refreshes allCalendars.
 */

/** @type {import("react").Context<AppContextValue | null>} */
export const AppContext = createContext(null);

/** @returns {AppContextValue} */
export function useApp() {
  return useContext(AppContext);
}
