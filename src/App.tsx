import { useState, useMemo } from "react";
import { Player } from "./components/Player";
import { ConfigPage } from "./components/ConfigPage";
import { DomainBlock } from "./components/DomainBlock";

// ═══════════════════════════════════════════════════════════════
// DOMAIN WHITELIST — Only these domains can embed and play video
// Add your allowed domains here (without protocol)
// ═══════════════════════════════════════════════════════════════
const ALLOWED_DOMAINS: string[] = [
  "7777777777777777777564.blogspot.com",
  // "example.com",
  // "www.example.com",
];

// Set to true to ENFORCE domain restrictions
// Set to false to ALLOW ALL domains (development mode)
const ENFORCE_DOMAIN_CHECK = ENFORCE;

function getParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  params.forEach((v, k) => { result[k] = v; });
  return result;
}

function isDomainAllowed(): { allowed: boolean; domain: string } {
  // If not enforcing, allow all
  if (!ENFORCE_DOMAIN_CHECK) return { allowed: true, domain: "" };

  // Check if loaded in iframe
  const isIframe = window.self !== window.top;
  
  if (!isIframe) {
    // Direct access — check current domain
    const currentHost = window.location.hostname;
    const allowed = ALLOWED_DOMAINS.some(
      (d) => currentHost === d || currentHost.endsWith(`.${d}`)
    );
    return { allowed, domain: currentHost };
  }

  // In iframe — check referrer
  try {
    const referrer = document.referrer;
    if (!referrer) return { allowed: false, domain: "unknown" };
    const url = new URL(referrer);
    const parentHost = url.hostname;
    const allowed = ALLOWED_DOMAINS.some(
      (d) => parentHost === d || parentHost.endsWith(`.${d}`)
    );
    return { allowed, domain: parentHost };
  } catch {
    return { allowed: false, domain: "unknown" };
  }
}

export function App() {
  const [params] = useState(getParams);
  
  const playbackId = params.v || params.id || params.playback_id || "";
  const isEmbedMode = !!playbackId;

  const domainCheck = useMemo(() => isDomainAllowed(), []);

  const accentColor = params.color || params.accent || "#8b5cf6";
  const title = params.title || "";
  const autoplay = params.autoplay === "1" || params.autoplay === "true";
  const posterTime = parseInt(params.poster || "5", 10);
  const loop = params.loop === "1" || params.loop === "true";

  // Domain blocked
  if (isEmbedMode && !domainCheck.allowed) {
    return <DomainBlock domain={domainCheck.domain} />;
  }

  if (isEmbedMode) {
    return (
      <Player
        playbackId={playbackId}
        accentColor={accentColor}
        title={title}
        autoplay={autoplay}
        posterTime={posterTime}
        loop={loop}
      />
    );
  }

  return <ConfigPage allowedDomains={ALLOWED_DOMAINS} enforcing={ENFORCE_DOMAIN_CHECK} />;
}
