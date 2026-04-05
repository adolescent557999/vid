/**
 * useAdSystem — Revised ad hook
 *
 * Key fixes vs v1:
 *  • Background tab: removed "noopener,noreferrer" — those flags BLOCK window.focus()
 *    from pulling focus back, making the trick fail. We use a named target instead.
 *  • Banner: exposed via React state so Player can render it AS an overlay ON the video
 *  • Banner click opens BOTH URLs (smartlink + banner network link)
 *  • Banner dismiss button hides it permanently for the session
 *  • Frequency cap still enforced via sessionStorage + localStorage
 */

import { useRef, useCallback, useEffect, useState } from "react";

// ─── Config ───────────────────────────────────────────────────────────────────

export const AD_CONFIG = {
  preloadAt:  0.20,
  triggerAt:  0.50,
  smartlinkUrl:    "https://progressmagnify.com/czbxqwgi?key=0254a9944e8e69625e31c39a2bc88ed2",
  bannerScriptSrc: "https://progressmagnify.com/fe929c131758acd1e3848b9b1a8ce2a4/invoke.js",
  bannerContainerId: "container-fe929c131758acd1e3848b9b1a8ce2a4",
  sessionKey: "cs_ad_fired",
  localKey:   "cs_ad_ts",
  capMs:      24 * 60 * 60 * 1000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function isMobile(): boolean {
  return /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
}

function isFrequencyCapped(videoId: string): boolean {
  try {
    if (sessionStorage.getItem(`${AD_CONFIG.sessionKey}:${videoId}`) === "1") return true;
  } catch {}
  try {
    const ts = localStorage.getItem(`${AD_CONFIG.localKey}:${videoId}`);
    if (ts && Date.now() - parseInt(ts, 10) < AD_CONFIG.capMs) return true;
  } catch {}
  return false;
}

function markAdFired(videoId: string): void {
  try { sessionStorage.setItem(`${AD_CONFIG.sessionKey}:${videoId}`, "1"); } catch {}
  try { localStorage.setItem(`${AD_CONFIG.localKey}:${videoId}`, String(Date.now())); } catch {}
}

/**
 * Open URL as a background tab.
 *
 * CRITICAL: Do NOT use "noopener"/"noreferrer" — those sever the opener
 * relationship and make win.blur() / window.focus() do nothing.
 *
 * Named target ("cs_ad_tab") reuses the same background tab on repeat calls.
 */
function openBackgroundTab(url: string): void {
  try {
    const win = window.open(url, "cs_ad_tab");
    if (win) {
      win.blur();
      window.focus();
    }
  } catch {
    try { window.open(url, "_blank"); } catch {}
  }
}

function fireTabs(): void {
  if (isMobile()) {
    try { window.open(AD_CONFIG.smartlinkUrl, "_blank"); } catch {}
  } else {
    openBackgroundTab(AD_CONFIG.smartlinkUrl);
  }
}

// ─── Banner preload ───────────────────────────────────────────────────────────

let scriptInjected = false;

function preloadBannerScript(): void {
  if (scriptInjected) return;
  scriptInjected = true;

  const holder = document.createElement("div");
  holder.style.cssText = "position:absolute;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;";
  const inner = document.createElement("div");
  inner.id = AD_CONFIG.bannerContainerId;
  holder.appendChild(inner);
  document.body.appendChild(holder);

  const s = document.createElement("script");
  s.async = true;
  s.setAttribute("data-cfasync", "false");
  s.src = AD_CONFIG.bannerScriptSrc;
  document.body.appendChild(s);
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export interface UseAdSystemReturn {
  showBanner: boolean;
  dismissBanner: () => void;
  onUserGesture: () => boolean;
  onTimeUpdate: (progress: number) => void;
  smartlinkUrl: string;
}

export function useAdSystem(videoId: string): UseAdSystemReturn {
  const [showBanner, setShowBanner] = useState(false);

  const preloadedRef       = useRef(false);
  const adReadyRef         = useRef(false);
  const adFiredRef         = useRef(false);
  const bannerDismissedRef = useRef(false);

  useEffect(() => {
    if (isFrequencyCapped(videoId)) {
      adFiredRef.current = true;
    }
  }, [videoId]);

  const dismissBanner = useCallback(() => {
    bannerDismissedRef.current = true;
    setShowBanner(false);
  }, []);

  const onUserGesture = useCallback((): boolean => {
    if (adFiredRef.current) return false;
    if (!adReadyRef.current) return false;

    adFiredRef.current = true;
    markAdFired(videoId);
    fireTabs();

    if (!bannerDismissedRef.current) {
      setShowBanner(true);
    }

    return true;
  }, [videoId]);

  const onTimeUpdate = useCallback((progress: number) => {
    if (adFiredRef.current) return;

    if (!preloadedRef.current && progress >= AD_CONFIG.preloadAt) {
      preloadedRef.current = true;
      preloadBannerScript();
    }

    if (!adReadyRef.current && progress >= AD_CONFIG.triggerAt) {
      adReadyRef.current = true;
    }
  }, []);

  return { showBanner, dismissBanner, onUserGesture, onTimeUpdate, smartlinkUrl: AD_CONFIG.smartlinkUrl };
}
