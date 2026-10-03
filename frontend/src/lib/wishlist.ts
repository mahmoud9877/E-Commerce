import { useCallback, useEffect, useState } from "react";
import type { Session } from "../api";
import { products } from "../endpoints";
import { useWindowEvent } from "./hooks";

// Ids of the logged-in user's wishlisted products, refreshed whenever the wishlist changes
export function useWishlistIds(session: Session | null): Set<string> {
  const [ids, setIds] = useState<Set<string>>(new Set());
  const userId = session?.user.id;

  const load = useCallback(() => {
    if (!userId) {
      setIds(new Set());
      return;
    }
    products
      .wishlist()
      .then((list) => setIds(new Set(list.map((p) => p._id))))
      .catch(() => setIds(new Set()));
  }, [userId]);

  useEffect(load, [load]);
  useWindowEvent(["wishlist-change"], load);
  return ids;
}
