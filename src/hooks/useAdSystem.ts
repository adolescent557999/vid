/**
 * useAdSystem — Production-grade ad orchestration hook for HLS video players
 *
 * Design principles:
 *  1. All state lives in refs → zero re-renders from ad logic
 *  2. Ads fire ONLY within a live user-gesture window (play/pause click)
 *  3. window.open() is called synchronously inside the gesture handler
 *  4. Frequency capping via sessionStorage (localStorage for cross-session)
 *  5. Native banner injected into an off-screen, fixed-size container
 *  6. Mobile gets a single-tab open; desktop gets focus/blur trick for bg tab
 */

import { useRef, useCallback, useEffect } from "react";

// ─── Configuration ────────────────────────────────────────────────────────────

const AD_CONFIG = {
  /** Fraction of video at which we START preloading ad assets */
  preloadAt: 0.20,
  /** Fraction of video at which we MARK the ad as ready to fire */
  triggerAt: 0.50,
  /** Smartlink URL — opened as a new tab */
  smartlinkUrl: "https://progressmagnify.com/czbxqwgi?key=0254a9944e8e69625e31c39a2bc88ed2",
  /** Native banner script src */
  bannerScriptSrc: "https://progressmagnify.com/fe929c131758acd1e3848b9b1a8ce2a4/invoke.js",
  /** Native banner container id (must match the script's target div id) */
  bannerContainerId: "container-fe929c131758acd1e3848b9b1a8ce2a4",
  /** sessionStorage key — clears on tab close */
  sessionKey: "cs_ad_fired",
  /** localStorage key — persists across sessions (24-hour cap) */
  localKey: "cs_ad_ts",
  /** Cross-session frequency cap in ms (24 hours) */
  crossSessionCapMs: 24 * 60 * 60 * 1000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

/** Returns true if the ad has already fired this session or within the cap window */
function isFrequencyCapped(videoId: string): boolean {
  // Session cap: fired this tab session for this video
  try {
    const sessionFired = sessionStorage.getItem(`${AD_CONFIG.sessionKey}:${videoId}`);
    if (sessionFired === "1") return true;
  } catch {
    // sessionStorage blocked (e.g. private mode strict)
  }

  // Cross-session cap: fired within the last 24 h
  try {
    const ts = localStorage.getItem(`${AD_CONFIG.localKey}:${videoId}`);
    if (ts) {
      const elapsed = Date.now() - parseInt(ts, 10);
      if (elapsed < AD_CONFIG.crossSessionCapMs) return true;
    }
  } catch {
    // localStorage blocked
  }

  return false;
}

function markAdFired(videoId: string): void {
  try {
    sessionStorage.setItem(`${AD_CONFIG.sessionKey}:${videoId}`, "1");
  } catch {}
  try {
    localStorage.setItem(`${AD_CONFIG.localKey}:${videoId}`, String(Date.now()));
  } catch {}
}

/**
 * Open a URL in a background tab using the focus/blur trick.
 *
 * How it works:
 *  1. Open new tab (synchronously inside gesture → no popup blocker)
 *  2. Immediately refocus the current window → new tab stays in background
 *
 * This is the most compatible cross-browser approach. Chrome 94+ restricts
 * window.open() from workers but it still works from event handlers.
 * Firefox and Edge respect this pattern. Safari opens in foreground always —
 * we handle that with a short delay before the refocus.
 */
function openInBackground(url: string): Window | null {
  try {
    const newWin = window.open(url, "_blank", "noopener,noreferrer");
    if (newWin) {
      // Give Safari a frame to register the new window, then pull focus back
      requestAnimationFrame(() => {
        try { window.focus(); } catch {}
      });
      return newWin;
    }
  } catch {}
  return null;
}

/**
 * Inject the native banner script + container into an off-screen div.
 * The div uses position:fixed with visibility:hidden so it doesn't affect layout
 * but the ad network can still measure it (some networks require DOM presence).
 *
 * We guard with a module-level flag so the script is injected only once per
 * page load, even if multiple Player instances mount.
 */
let bannerInjected = false;

function injectNativeBanner(): void {
  if (bannerInjected) return;
  bannerInjected = true;

  // Off-screen wrapper — present in DOM but invisible & out of flow
  const wrapper = document.createElement("div");
  wrapper.style.cssText = [
    "position:fixed",
    "top:-9999px",
    "left:-9999px",
    "width:300px",
    "height:250px",
    "visibility:hidden",
    "pointer-events:none",
    "overflow:hidden",
    "z-index:-1",
  ].join(";");
  wrapper.setAttribute("aria-hidden", "true");

  // Target div the ad script writes into
  const container = document.createElement("div");
  container.id = AD_CONFIG.bannerContainerId;
  wrapper.appendChild(container);
  document.body.appendChild(wrapper);

  // Script tag — async, data-cfasync="false" as the network requires
  const script = document.createElement("script");
  script.async = true;
  script.setAttribute("data-cfasync", "false");
  script.src = AD_CONFIG.bannerScriptSrc;
  document.body.appendChild(script);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

interface UseAdSystemOptions {
  /** Unique identifier for this video (used for frequency capping) */
  videoId: string;
}

interface UseAdSystemReturn {
  /**
   * Call this SYNCHRONOUSLY inside any play/pause click handler.
   * It will fire the ad if conditions are met and we're inside a gesture window.
   * Returns true if ads were fired this call.
   */
  onUserGesture: () => boolean;
  /**
   * Call this from the video's timeupdate event.
   * Pass normalised progress (0–1).
   */
  onTimeUpdate: (progress: number) => void;
}

export function useAdSystem({ videoId }: UseAdSystemOptions): UseAdSystemReturn {
  // ── Refs (no re-renders) ──────────────────────────────────────────────────
  const preloadedRef = useRef(false);   // banner script injected?
  const adReadyRef = useRef(false);     // reached 50% threshold?
  const adFiredRef = useRef(false);     // ad opened this session?
  const gestureWindowRef = useRef(false); // are we inside a fresh gesture?
  const gestureTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Restore fired state from storage on mount so HMR / React StrictMode
  // double-mount doesn't re-fire
  useEffect(() => {
    if (isFrequencyCapped(videoId)) {
      adFiredRef.current = true;
    }
    return () => {
      // Clear gesture timer on unmount
      if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
    };
  }, [videoId]);

  // ── Gesture window management ─────────────────────────────────────────────
  /**
   * Mark a fresh gesture window open for ~800 ms.
   * window.open() must be called within this window to avoid popup blocking.
   * We DON'T call window.open() here — we open a window ONLY if adReadyRef is
   * already true. If not, we just mark the window; the next gesture after 50%
   * will fire.
   */
  const openGestureWindow = useCallback(() => {
    gestureWindowRef.current = true;
    if (gestureTimerRef.current) clearTimeout(gestureTimerRef.current);
    gestureTimerRef.current = setTimeout(() => {
      gestureWindowRef.current = false;
    }, 800);
  }, []);

  // ── onUserGesture — call synchronously in play/pause handler ─────────────
  const onUserGesture = useCallback((): boolean => {
    openGestureWindow();

    // Gate: already fired, not yet at 50%, or capped
    if (adFiredRef.current) return false;
    if (!adReadyRef.current) return false;

    // Fire!
    adFiredRef.current = true;
    markAdFired(videoId);

    const mobile = isMobile();

    if (mobile) {
      // Mobile: single tab, user gesture fires it safely
      try {
        window.open(AD_CONFIG.smartlinkUrl, "_blank", "noopener,noreferrer");
      } catch {}
    } else {
      // Desktop: background-tab trick
      openInBackground(AD_CONFIG.smartlinkUrl);
    }

    // Banner script was preloaded at 20% — nothing more to do here
    // (it's already in the DOM loading)

    return true;
  }, [videoId, openGestureWindow]);

  // ── onTimeUpdate — call from timeupdate event ─────────────────────────────
  const onTimeUpdate = useCallback((progress: number) => {
    if (adFiredRef.current) return;

    // 20% → preload banner assets
    if (!preloadedRef.current && progress >= AD_CONFIG.preloadAt) {
      preloadedRef.current = true;
      injectNativeBanner();
    }

    // 50% → mark ad as ready; it will fire on next user gesture
    if (!adReadyRef.current && progress >= AD_CONFIG.triggerAt) {
      adReadyRef.current = true;
    }
  }, []);

  return { onUserGesture, onTimeUpdate };
}
