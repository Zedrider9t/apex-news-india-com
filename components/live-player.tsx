"use client";

import { useEffect, useRef, useState } from "react";

type HlsInstance = {
  loadSource: (url: string) => void;
  attachMedia: (video: HTMLVideoElement) => void;
  startLoad: () => void;
  recoverMediaError: () => void;
  destroy: () => void;
  on: (event: string, handler: (...args: unknown[]) => void) => void;
};

type HlsConstructor = {
  new (config?: Record<string, unknown>): HlsInstance;
  isSupported: () => boolean;
  Events: { MANIFEST_PARSED: string; ERROR: string };
  ErrorTypes: { NETWORK_ERROR: string; MEDIA_ERROR: string };
};

declare global {
  interface Window {
    Hls?: HlsConstructor;
  }
}

const HLS_SCRIPT_ID = "apex-hls-js";
const HLS_SCRIPT_SRC = "https://cdn.jsdelivr.net/npm/hls.js@1/dist/hls.min.js";

function loadHlsLibrary(): Promise<HlsConstructor> {
  if (window.Hls) return Promise.resolve(window.Hls);

  return new Promise((resolve, reject) => {
    const existing = document.getElementById(HLS_SCRIPT_ID) as HTMLScriptElement | null;
    if (existing) {
      existing.addEventListener("load", () =>
        window.Hls ? resolve(window.Hls) : reject(new Error("HLS library unavailable")),
      );
      existing.addEventListener("error", () => reject(new Error("HLS library failed to load")));
      return;
    }

    const script = document.createElement("script");
    script.id = HLS_SCRIPT_ID;
    script.src = HLS_SCRIPT_SRC;
    script.async = true;
    script.crossOrigin = "anonymous";
    script.onload = () =>
      window.Hls ? resolve(window.Hls) : reject(new Error("HLS library unavailable"));
    script.onerror = () => reject(new Error("HLS library failed to load"));
    document.head.appendChild(script);
  });
}

export function LivePlayer({ src }: { src: string }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    let disposed = false;
    let hls: HlsInstance | null = null;
    setError(null);

    const tryPlay = () => {
      video.muted = true;
      void video.play().catch(() => {
        // Browser autoplay policies may still require the user to press play.
      });
    };

    const boot = async () => {
      if (video.canPlayType("application/vnd.apple.mpegurl")) {
        video.src = src;
        video.addEventListener("loadedmetadata", tryPlay, { once: true });
        return;
      }

      try {
        const Hls = await loadHlsLibrary();
        if (disposed) return;
        if (!Hls.isSupported()) {
          setError("Live playback is not supported in this browser.");
          return;
        }

        hls = new Hls({
          enableWorker: true,
          lowLatencyMode: true,
          backBufferLength: 30,
        });
        hls.loadSource(src);
        hls.attachMedia(video);
        hls.on(Hls.Events.MANIFEST_PARSED, tryPlay);
        hls.on(Hls.Events.ERROR, (...args: unknown[]) => {
          const data = (args.at(-1) ?? {}) as {
            fatal?: boolean;
            type?: string;
          };
          if (!data.fatal || !hls) return;
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) {
            hls.startLoad();
          } else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError();
          } else {
            hls.destroy();
            hls = null;
            setError("The live stream is temporarily unavailable.");
          }
        });
      } catch {
        if (!disposed) setError("The live player could not start.");
      }
    };

    void boot();

    return () => {
      disposed = true;
      hls?.destroy();
      video.pause();
      video.removeAttribute("src");
      video.load();
    };
  }, [src, attempt]);

  return (
    <div className="live-player">
      <video
        ref={videoRef}
        className="modal-video"
        controls
        playsInline
        muted
        autoPlay
      />
      {error ? (
        <div className="live-player-error">
          <p>{error}</p>
          <button type="button" onClick={() => setAttempt((value) => value + 1)}>
            Retry live stream
          </button>
        </div>
      ) : null}
    </div>
  );
}
