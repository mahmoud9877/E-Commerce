import { useEffect, useState } from "react";

// Hash routing: the backend redirects to FE_URL/#/order (after Stripe checkout) and
// FE_URL/#/invalidEmail, and hash routes need no server-side rewrite rules.

export interface Route {
  path: string;
  // Path segments, e.g. "#/product/blue-shirt" -> ["product", "blue-shirt"]
  segments: string[];
  query: URLSearchParams;
}

function readRoute(): Route {
  const raw = window.location.hash.replace(/^#/, "") || "/";
  const [path, search = ""] = raw.split("?");
  return {
    path,
    segments: path.split("/").filter(Boolean).map(decodeURIComponent),
    query: new URLSearchParams(search),
  };
}

export function useRoute(): Route {
  const [route, setRoute] = useState(readRoute);
  useEffect(() => {
    const onChange = () => setRoute(readRoute());
    window.addEventListener("hashchange", onChange);
    return () => window.removeEventListener("hashchange", onChange);
  }, []);
  return route;
}

export function navigate(path: string, query?: Record<string, string | number | undefined>): void {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(query ?? {})) {
    if (value !== undefined && value !== "") params.set(key, String(value));
  }
  const search = params.toString();
  window.location.hash = `#${path}${search ? `?${search}` : ""}`;
}
