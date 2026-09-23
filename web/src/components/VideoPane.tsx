"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import { PhoneFrame, type FrameShape } from "./PhoneFrame";

type Props = {
  /** e.g. /media/press-full.mp4 — recordings live in web/public/media. */
  src: string;
  /** Accessible description of what the clip shows. */
  label: string;
  videoRef?: RefObject<HTMLVideoElement | null>;
  reduced: boolean;
  onPlayStateChange?: (playing: boolean) => void;
  shape?: FrameShape;
  /** auto = play when ready; hover = play while pointed at or focused. */
  playMode?: "auto" | "hover";
};

type LoadState = "pending" | "ready" | "missing";

/**
 * Where an idle clip parks. The recordings open on an empty screen for roughly
 * the first half, so frame 0 is a blank phone; this lands on the resting state
 * with the button on screen.
 */
const POSTER_FRACTION = 0.7;

export function VideoPane({
  src,
  label,
  videoRef,
  reduced,
  onPlayStateChange,
  shape = "phone",
  playMode = "auto",
}: Props) {
  // The hero drives two panes in sync and passes a ref in; standalone panes
  // (tiles, unit page) keep their own.
  const innerRef = useRef<HTMLVideoElement | null>(null);
  const ref = videoRef ?? innerRef;

  // Load state is tied to the current source, so a 0.25x toggle resets it
  // during render instead of in an effect.
  const [load, setLoad] = useState<{ src: string; state: LoadState }>({
    src,
    state: "pending",
  });
  if (load.src !== src) setLoad({ src, state: "pending" });
  const state = load.src === src ? load.state : "pending";
  const setState = (next: LoadState) => setLoad({ src, state: next });

  const [paused, setPaused] = useState(true);

  // Plain handlers: they only run from events, so they need no memoization.
  const parkPoster = () => {
    const video = ref.current;
    if (!video || !Number.isFinite(video.duration) || video.duration === 0) {
      return;
    }
    try {
      video.currentTime = video.duration * POSTER_FRACTION;
    } catch {
      // seeking unsupported before metadata; the next event tries again
    }
  };

  const restart = () => {
    const video = ref.current;
    if (!video) return;
    try {
      video.currentTime = 0;
    } catch {
      // ignore
    }
    void video.play().catch(() => {});
  };

  // A new source restarts the clip from zero.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.load();
    try {
      video.currentTime = 0;
    } catch {
      // some browsers throw before metadata; load() already reset it
    }
  }, [src, ref]);

  // Playback is driven here as well as by the autoplay attribute so Reduce
  // Motion wins and hover tiles stay still until pointed at. Browsers pause
  // autoplaying media in hidden tabs; resume when the page becomes visible.
  useEffect(() => {
    const video = ref.current;
    if (!video || state !== "ready") return;
    if (reduced || playMode === "hover") {
      video.pause();
      return;
    }
    const resume = () => {
      if (document.visibilityState !== "visible") return;
      void video.play().catch(() => {
        /* blocked autoplay: the first frame stays, the user can press play */
      });
    };
    resume();
    // Some browsers (Safari Low Power Mode, embedded webviews) hold muted
    // autoplay until the first interaction; retry once on it.
    document.addEventListener("visibilitychange", resume);
    document.addEventListener("pointerdown", resume, { once: true });
    document.addEventListener("keydown", resume, { once: true });
    return () => {
      document.removeEventListener("visibilitychange", resume);
      document.removeEventListener("pointerdown", resume);
      document.removeEventListener("keydown", resume);
    };
  }, [state, reduced, src, ref, playMode]);

  const setPlaying = (playing: boolean) => {
    setPaused(!playing);
    onPlayStateChange?.(playing);
  };

  const hoverPlay = () => {
    if (reduced || playMode !== "hover") return;
    restart();
  };

  const hoverStop = () => {
    if (playMode !== "hover") return;
    ref.current?.pause();
    parkPoster();
  };

  return (
    <div
      onMouseEnter={hoverPlay}
      onMouseLeave={hoverStop}
      onFocus={hoverPlay}
      onBlur={hoverStop}
    >
      <PhoneFrame shape={shape}>
        <video
          ref={ref}
          className={`h-full w-full object-cover ${
            state === "ready" ? "opacity-100" : "opacity-0"
          }`}
          src={src}
          muted
          autoPlay={!reduced && playMode === "auto"}
          loop={!reduced}
          playsInline
          preload="auto"
          aria-label={label}
          onLoadedMetadata={() => {
            if (reduced || playMode === "hover") parkPoster();
          }}
          onLoadedData={() => setState("ready")}
          onError={() => setState("missing")}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            parkPoster();
          }}
        />

        {state === "missing" && (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-3 text-center">
            <span
              aria-hidden
              className="block h-6 w-6 rounded-full border border-line"
            />
            <span className="mono text-[10px] leading-tight text-muted">
              no recording yet
              <br />
              {src}
            </span>
          </div>
        )}

        {reduced && state === "ready" && paused && (
          <button
            type="button"
            onClick={(e) => {
              e.preventDefault();
              restart();
            }}
            className="absolute inset-0 flex items-center justify-center"
          >
            <span className="mono rounded-[6px] border border-line bg-bg px-2 py-1 text-[11px] text-ink">
              Play
            </span>
            <span className="sr-only">{`Play ${label}`}</span>
          </button>
        )}
      </PhoneFrame>
    </div>
  );
}
