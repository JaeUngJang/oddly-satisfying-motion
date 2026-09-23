"use client";

import { useEffect, useRef, useState } from "react";
import { copyText } from "@/lib/copy";
import { track, type TrackProps, type WowEvent } from "@/lib/track";

type Props = {
  text: string;
  label: string;
  event: WowEvent;
  eventProps?: TrackProps;
  /** solid = black fill, white text. outline = hairline border. */
  variant?: "solid" | "outline";
  size?: "sm" | "md";
};

export function CopyButton({
  text,
  label,
  event,
  eventProps,
  variant = "outline",
  size = "md",
}: Props) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const onClick = async () => {
    const ok = await copyText(text);
    track(event, { ...eventProps, ok, bytes: text.length });
    if (!ok) return;
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1800);
  };

  const pad = size === "sm" ? "px-2 py-1 text-[11px]" : "px-3 py-1.5 text-[12px]";
  const skin =
    variant === "solid"
      ? "bg-ink text-bg hover:bg-ink-hover"
      : "border border-line text-ink hover:border-ink hover:bg-surface";

  return (
    <button
      type="button"
      onClick={onClick}
      className={`mono inline-flex items-center justify-center rounded-[6px] active:scale-[0.98] ${pad} ${skin}`}
    >
      {copied ? "Copied" : label}
    </button>
  );
}
