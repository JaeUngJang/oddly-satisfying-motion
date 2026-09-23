"use client";

import type { ReactNode } from "react";
import { track, type TrackProps } from "@/lib/track";

/**
 * A link out to the GitHub repository. Records `community_click` (into the
 * in-page dataLayer, nowhere else) and opens GitHub in a new tab, so the page
 * the person came from is still there when they come back.
 */
export function CommunityLink({
  href,
  eventProps,
  className,
  children,
}: {
  href: string;
  /** `target` names the link: request_unit, contribute, releases, unit_issue. */
  eventProps: { target: string } & TrackProps;
  className?: string;
  children: ReactNode;
}) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noreferrer"
      onClick={() => track("community_click", eventProps)}
      className={className}
    >
      {children}
    </a>
  );
}
