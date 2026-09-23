// A handful of events, no vendor. Everything lands in window.dataLayer so a
// tag manager, PostHog or Plausible can be dropped in later without touching
// call sites: replace the body of `send` below.

export type WowEvent =
  | "pageview"
  | "copy_unit"
  | "copy_core"
  // A link out to GitHub. props: { target } names which one (request_unit,
  // contribute, releases, unit_issue); a unit page adds { unit }.
  | "community_click"
  // /ai: the page copied as a prompt.
  | "copy_ai_page"
  // Reserved for stage 2: fired when the MCP install command is copied.
  // The MCP does not exist yet, so nothing on the site fires this.
  | "mcp_install_copy";

export type TrackProps = Record<string, string | number | boolean | null>;

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[];
  }
}

function send(payload: Record<string, unknown>) {
  window.dataLayer = window.dataLayer ?? [];
  window.dataLayer.push(payload);

  // --- vendor goes here -----------------------------------------------------
  // posthog.capture(payload.event as string, payload)
  // plausible(payload.event as string, { props: payload })
  // -------------------------------------------------------------------------
}

export function track(event: WowEvent, props: TrackProps = {}) {
  if (typeof window === "undefined") return;

  const payload = {
    event,
    ...props,
    path: window.location.pathname,
    ts: Date.now(),
  };

  send(payload);

  if (process.env.NODE_ENV !== "production") {
    console.debug("[wow:track]", payload);
  }
}
