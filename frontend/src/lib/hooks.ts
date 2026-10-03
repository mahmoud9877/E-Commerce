import { useEffect, useState } from "react";
import { loadSession, type Session } from "../api";

export function useSession(): Session | null {
  const [session, setSession] = useState(loadSession);
  useEffect(() => {
    const onChange = () => setSession(loadSession());
    window.addEventListener("session-change", onChange);
    window.addEventListener("storage", onChange);
    return () => {
      window.removeEventListener("session-change", onChange);
      window.removeEventListener("storage", onChange);
    };
  }, []);
  return session;
}

// Re-runs `callback` whenever one of the window events fires (used to refresh header counters)
export function useWindowEvent(events: string[], callback: () => void): void {
  useEffect(() => {
    events.forEach((e) => window.addEventListener(e, callback));
    return () => events.forEach((e) => window.removeEventListener(e, callback));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [callback]);
}

// Lets any page tell the header (and other pages) that something changed
export const signalCartChange = () => window.dispatchEvent(new Event("cart-change"));
export const signalWishlistChange = () => window.dispatchEvent(new Event("wishlist-change"));
export const signalNotificationsChange = () => window.dispatchEvent(new Event("notifications-change"));
