"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { track } from "@/lib/track";

/** Fires `pageview` on mount and on every client-side route change. */
export function Pageview() {
  const pathname = usePathname();

  useEffect(() => {
    track("pageview");
  }, [pathname]);

  return null;
}
