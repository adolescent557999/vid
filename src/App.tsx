import { useState, useEffect } from "react";
import { Player } from "./Player";
import { ConfigPage } from "./ConfigPage";

function getParams(): Record<string, string> {
  const params = new URLSearchParams(window.location.search);
  const result: Record<string, string> = {};
  params.forEach((v, k) => {
    result[k] = v;
  });
  return result;
}

export function App() {
  const [params] = useState(getParams);

  // Check if we're in embed/player mode (has 'v' or 'id' parameter)
  const playbackId = params.v || params.id || params.playback_id || "";
  const isEmbedMode = !!playbackId;

  // Player config from URL params
  const accentColor = params.color || params.accent || "#6366f1";
  const title = params.title || "";
  const autoplay = params.autoplay === "1" || params.autoplay === "true";
  const posterTime = parseInt(params.poster || "10", 10);
  const loop = params.loop === "1" || params.loop === "true";

  // Notify parent iframe of readiness
  useEffect(() => {
    if (isEmbedMode && window.parent !== window) {
      window.parent.postMessage({ type: "streamvault-ready" }, "*");
    }
  }, [isEmbedMode]);

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

  return <ConfigPage />;
}
