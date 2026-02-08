import { useState, useEffect, useRef, useCallback } from "react";
import Hls from "hls.js";

interface PlayerProps {
  playbackId: string;
  accentColor: string;
  title: string;
  autoplay: boolean;
  posterTime: number;
  loop: boolean;
}

interface QualityLevel {
  height: number;
  index: number;
}

function formatTime(t: number): string {
  if (isNaN(t) || !isFinite(t)) return "0:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function lightenColor(hex: string, percent: number): string {
  hex = hex.replace("#", "");
  const r = Math.min(255, Math.floor(parseInt(hex.substring(0, 2), 16) + (255 - parseInt(hex.substring(0, 2), 16)) * percent / 100));
  const g = Math.min(255, Math.floor(parseInt(hex.substring(2, 4), 16) + (255 - parseInt(hex.substring(2, 4), 16)) * percent / 100));
  const b = Math.min(255, Math.floor(parseInt(hex.substring(4, 6), 16) + (255 - parseInt(hex.substring(4, 6), 16)) * percent / 100));
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1);
}

export function Player({ playbackId, accentColor, title, autoplay, posterTime, loop }: PlayerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const hlsRef = useRef<Hls | null>(null);
  const progressRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const volTrackRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [hasStarted, setHasStarted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [buffered, setBuffered] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState("Auto");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"main" | "speed" | "quality">("main");
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);

  const videoSrc = `https://stream.mux.com/${playbackId}.m3u8`;
  const posterUrl = `https://image.mux.com/${playbackId}/thumbnail.png?width=1920&height=1080&time=${posterTime}&fit_mode=preserve`;
  const accentLight = lightenColor(accentColor, 30);

  // ── Initialize HLS ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        backBufferLength: 90,
      });
      hlsRef.current = hls;
      hls.loadSource(videoSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const q = data.levels.map((lv, i) => ({ height: lv.height, index: i }));
        setQualities(q);
        if (autoplay) {
          video.muted = true;
          setIsMuted(true);
          video.play().catch(() => {});
        }
      });

      hls.on(Hls.Events.LEVEL_SWITCHED, (_, data) => {
        const level = hls.levels[data.level];
        if (level && hls.autoLevelEnabled) {
          setCurrentQuality(`Auto (${level.height}p)`);
        }
      });

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.NETWORK_ERROR) hls.startLoad();
          else if (data.type === Hls.ErrorTypes.MEDIA_ERROR) hls.recoverMediaError();
        }
      });

      return () => {
        hls.destroy();
        hlsRef.current = null;
      };
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = videoSrc;
      if (autoplay) {
        video.muted = true;
        video.play().catch(() => {});
      }
    }
  }, [videoSrc, autoplay]);

  // ── Video event listeners ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const onTimeUpdate = () => setCurrentTime(v.currentTime);
    const onDurationChange = () => setDuration(v.duration);
    const onPlay = () => { setIsPlaying(true); setHasStarted(true); };
    const onPause = () => setIsPlaying(false);
    const onEnded = () => {
      setIsPlaying(false);
      if (loop) { v.currentTime = 0; v.play(); }
    };
    const onWaiting = () => setIsLoading(true);
    const onCanPlay = () => setIsLoading(false);
    const onProgress = () => {
      if (v.buffered.length > 0) {
        setBuffered(v.buffered.end(v.buffered.length - 1));
      }
    };
    const onVolumeChange = () => {
      setVolume(v.volume);
      setIsMuted(v.muted);
    };

    v.addEventListener("timeupdate", onTimeUpdate);
    v.addEventListener("durationchange", onDurationChange);
    v.addEventListener("play", onPlay);
    v.addEventListener("pause", onPause);
    v.addEventListener("ended", onEnded);
    v.addEventListener("waiting", onWaiting);
    v.addEventListener("canplay", onCanPlay);
    v.addEventListener("playing", onCanPlay);
    v.addEventListener("progress", onProgress);
    v.addEventListener("volumechange", onVolumeChange);

    return () => {
      v.removeEventListener("timeupdate", onTimeUpdate);
      v.removeEventListener("durationchange", onDurationChange);
      v.removeEventListener("play", onPlay);
      v.removeEventListener("pause", onPause);
      v.removeEventListener("ended", onEnded);
      v.removeEventListener("waiting", onWaiting);
      v.removeEventListener("canplay", onCanPlay);
      v.removeEventListener("playing", onCanPlay);
      v.removeEventListener("progress", onProgress);
      v.removeEventListener("volumechange", onVolumeChange);
    };
  }, [loop]);

  // ── Auto-hide controls ──
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (videoRef.current && !videoRef.current.paused) {
      hideTimerRef.current = setTimeout(() => setShowControls(false), 3000);
    }
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea" || tag === "select") return;
      const v = videoRef.current;
      if (!v) return;

      switch (e.key.toLowerCase()) {
        case " ":
        case "k":
          e.preventDefault();
          v.paused ? v.play() : v.pause();
          resetHideTimer();
          break;
        case "f":
          e.preventDefault();
          toggleFullscreen();
          break;
        case "m":
          e.preventDefault();
          v.muted = !v.muted;
          break;
        case "arrowleft":
          e.preventDefault();
          v.currentTime = Math.max(0, v.currentTime - 10);
          resetHideTimer();
          break;
        case "arrowright":
          e.preventDefault();
          v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
          resetHideTimer();
          break;
        case "arrowup":
          e.preventDefault();
          v.volume = Math.min(1, v.volume + 0.1);
          resetHideTimer();
          break;
        case "arrowdown":
          e.preventDefault();
          v.volume = Math.max(0, v.volume - 0.1);
          resetHideTimer();
          break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetHideTimer]);

  // ── Fullscreen change listener ──
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Progress drag ──
  useEffect(() => {
    const onMouseUp = () => setIsDragging(false);
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging || !progressRef.current || !videoRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      videoRef.current.currentTime = pos * (videoRef.current.duration || 0);
    };
    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
    };
  }, [isDragging]);

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) containerRef.current.requestFullscreen();
    else document.exitFullscreen();
  };

  const togglePlay = () => {
    const v = videoRef.current;
    if (!v) return;
    v.paused ? v.play() : v.pause();
    resetHideTimer();
  };

  const seekTo = (e: React.MouseEvent) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * (videoRef.current.duration || 0);
  };

  const handleProgressHover = (e: React.MouseEvent) => {
    if (!progressRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos);
    setHoverTime(pos * duration);
  };

  const handleVolumeClick = (e: React.MouseEvent) => {
    if (!volTrackRef.current || !videoRef.current) return;
    const rect = volTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.volume = pos;
    if (pos > 0 && videoRef.current.muted) videoRef.current.muted = false;
  };

  const changeQuality = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (index === -1) {
      hls.currentLevel = -1;
      setCurrentQuality("Auto");
    } else {
      hls.currentLevel = index;
      const q = qualities.find((x) => x.index === index);
      setCurrentQuality(q ? `${q.height}p` : "Auto");
    }
    setSettingsOpen(false);
    setSettingsTab("main");
  };

  const changeSpeed = (rate: number) => {
    if (!videoRef.current) return;
    videoRef.current.playbackRate = rate;
    setPlaybackRate(rate);
    setSettingsOpen(false);
    setSettingsTab("main");
  };

  const progressPct = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPct = duration > 0 ? (buffered / duration) * 100 : 0;
  const volPct = isMuted ? 0 : volume * 100;
  const controlsHidden = !showControls && isPlaying && hasStarted;

  const thumbUrl = hoverTime !== null
    ? `https://image.mux.com/${playbackId}/thumbnail.png?width=320&height=180&time=${Math.floor(hoverTime)}&fit_mode=preserve`
    : "";

  return (
    <div
      ref={containerRef}
      className={`relative w-full h-full bg-black overflow-hidden select-none ${controlsHidden ? "cursor-none" : "cursor-default"}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (isPlaying) setShowControls(false); }}
      onTouchStart={resetHideTimer}
      onClick={() => { setSettingsOpen(false); setSettingsTab("main"); }}
      style={{ "--sv-accent": accentColor, "--sv-accent-light": accentLight } as React.CSSProperties}
    >
      {/* Video */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain bg-black cursor-pointer"
        poster={posterUrl}
        playsInline
        preload="metadata"
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        onDoubleClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
      />

      {/* Loading Spinner */}
      {isLoading && hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="w-12 h-12 border-[3px] border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Big Play Button */}
      {!hasStarted && (
        <div
          className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer bg-black/30"
          onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        >
          <div className="w-[72px] h-[72px] sm:w-[80px] sm:h-[80px] rounded-full bg-white/10 backdrop-blur-xl border-2 border-white/20 flex items-center justify-center shadow-2xl shadow-black/50 hover:bg-white/20 hover:scale-110 transition-all duration-300">
            <svg className="w-8 h-8 text-white ml-1" viewBox="0 0 24 24" fill="currentColor">
              <path d="M8 5v14l11-7z" />
            </svg>
          </div>
        </div>
      )}

      {/* Ended overlay */}
      {hasStarted && !isPlaying && videoRef.current && videoRef.current.ended && !loop && (
        <div
          className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer bg-black/50"
          onClick={(e) => { e.stopPropagation(); if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); } }}
        >
          <div className="w-[72px] h-[72px] rounded-full bg-white/10 backdrop-blur-xl border-2 border-white/20 flex items-center justify-center shadow-2xl hover:bg-white/20 hover:scale-110 transition-all duration-300">
            <svg className="w-7 h-7 text-white" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 5V1L7 6l5 5V7c3.31 0 6 2.69 6 6s-2.69 6-6 6-6-2.69-6-6H4c0 4.42 3.58 8 8 8s8-3.58 8-8-3.58-8-8-8z" />
            </svg>
          </div>
        </div>
      )}

      {/* Top gradient */}
      <div
        className="absolute top-0 left-0 right-0 h-[80px] pointer-events-none transition-opacity duration-300 z-10"
        style={{
          background: "linear-gradient(to bottom, rgba(0,0,0,.7) 0%, transparent 100%)",
          opacity: controlsHidden ? 0 : 1,
        }}
      />

      {/* Top bar */}
      <div
        className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-4 py-3 transition-all duration-300 ${controlsHidden ? "opacity-0 -translate-y-3 pointer-events-none" : "opacity-100 translate-y-0"}`}
      >
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center px-2 py-0.5 rounded text-[9px] font-bold tracking-wider uppercase text-white bg-red-500/90">
            HLS
          </span>
          {title && (
            <span className="text-[13px] text-white/70 font-medium truncate max-w-[200px] sm:max-w-[400px]">
              {title}
            </span>
          )}
        </div>
        <span className="text-[11px] text-white/40 font-medium">
          {currentQuality}
        </span>
      </div>

      {/* Bottom gradient */}
      <div
        className="absolute bottom-0 left-0 right-0 h-[160px] pointer-events-none transition-opacity duration-300 z-10"
        style={{
          background: "linear-gradient(to top, rgba(0,0,0,.9) 0%, rgba(0,0,0,.4) 50%, transparent 100%)",
          opacity: controlsHidden ? 0 : 1,
        }}
      />

      {/* Controls */}
      <div
        className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-300 ${controlsHidden ? "opacity-0 translate-y-3 pointer-events-none" : "opacity-100 translate-y-0"}`}
      >
        {/* Progress Bar */}
        <div className="px-3 mb-0.5 relative">
          <div
            ref={progressRef}
            className="relative h-7 flex items-center cursor-pointer group"
            onMouseDown={(e) => { setIsDragging(true); seekTo(e); }}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => setHoverTime(null)}
          >
            {/* Track */}
            <div className="absolute left-0 right-0 h-[4px] group-hover:h-[6px] rounded-full bg-white/20 transition-all duration-150">
              {/* Buffered */}
              <div
                className="absolute top-0 left-0 h-full rounded-full bg-white/15"
                style={{ width: `${bufferedPct}%` }}
              />
              {/* Filled */}
              <div
                className="absolute top-0 left-0 h-full rounded-full"
                style={{
                  width: `${progressPct}%`,
                  background: `linear-gradient(90deg, ${accentColor}, ${accentLight})`,
                }}
              />
            </div>

            {/* Handle */}
            <div
              className="absolute top-1/2 -translate-y-1/2 w-[14px] h-[14px] rounded-full bg-white shadow-lg shadow-black/40 opacity-0 group-hover:opacity-100 transition-opacity duration-150 pointer-events-none"
              style={{ left: `${progressPct}%`, transform: `translate(-50%, -50%)` }}
            />

            {/* Hover indicator */}
            {hoverTime !== null && (
              <div
                className="absolute top-1/2 -translate-y-1/2 w-[2px] h-3.5 rounded bg-white/50 pointer-events-none"
                style={{ left: `${hoverPos * 100}%` }}
              />
            )}

            {/* Thumbnail preview */}
            {hoverTime !== null && duration > 0 && (
              <div
                className="absolute bottom-9 pointer-events-none z-40"
                style={{
                  left: `${Math.max(5, Math.min(95, hoverPos * 100))}%`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="bg-black/95 rounded-lg border border-white/15 overflow-hidden shadow-2xl shadow-black/70">
                  <img
                    src={thumbUrl}
                    alt=""
                    className="w-[160px] h-[90px] object-cover block"
                  />
                  <div className="text-center text-[11px] text-white/90 font-mono font-medium py-1 bg-black">
                    {formatTime(hoverTime)}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Button Row */}
        <div className="flex items-center justify-between px-2.5 pb-2.5 gap-1">
          {/* Left Controls */}
          <div className="flex items-center gap-0.5">
            {/* Play/Pause */}
            <button
              onClick={(e) => { e.stopPropagation(); togglePlay(); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              title={isPlaying ? "Pause (K)" : "Play (K)"}
            >
              {isPlaying ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <rect x="6" y="4" width="4" height="16" rx="1" />
                  <rect x="14" y="4" width="4" height="16" rx="1" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M8 5v14l11-7z" />
                </svg>
              )}
            </button>

            {/* Skip Back */}
            <button
              onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); resetHideTimer(); }}
              className="w-9 h-9 rounded-lg items-center justify-center text-white hover:bg-white/10 transition-colors relative hidden sm:flex"
              title="Back 10s"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 17l-5-5 5-5" /><path d="M18 17l-5-5 5-5" />
              </svg>
              <span className="absolute text-[7px] font-bold text-white mt-0.5">10</span>
            </button>

            {/* Skip Forward */}
            <button
              onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10); resetHideTimer(); }}
              className="w-9 h-9 rounded-lg items-center justify-center text-white hover:bg-white/10 transition-colors relative hidden sm:flex"
              title="Forward 10s"
            >
              <svg className="w-[18px] h-[18px]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M13 17l5-5-5-5" /><path d="M6 17l5-5-5-5" />
              </svg>
              <span className="absolute text-[7px] font-bold text-white mt-0.5">10</span>
            </button>

            {/* Volume */}
            <div className="flex items-center group/vol">
              <button
                onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors"
                title="Mute (M)"
              >
                {isMuted || volume === 0 ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z" />
                  </svg>
                ) : volume < 0.5 ? (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M18.5 12c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM5 9v6h4l5 5V4L9 9H5z" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z" />
                  </svg>
                )}
              </button>
              <div className="w-0 overflow-hidden transition-all duration-300 group-hover/vol:w-20">
                <div
                  ref={volTrackRef}
                  className="w-[70px] h-7 mx-1 relative flex items-center cursor-pointer"
                  onClick={(e) => { e.stopPropagation(); handleVolumeClick(e); }}
                >
                  <div className="absolute left-0 right-0 h-1 rounded-full bg-white/20">
                    <div className="absolute top-0 left-0 h-full rounded-full bg-white" style={{ width: `${volPct}%` }} />
                  </div>
                  <div
                    className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-md"
                    style={{ left: `${volPct}%`, transform: "translate(-50%, -50%)" }}
                  />
                </div>
              </div>
            </div>

            {/* Time */}
            <span className="text-[12px] sm:text-[13px] text-white/70 font-mono font-medium ml-1.5 whitespace-nowrap">
              <span className="text-white">{formatTime(currentTime)}</span>
              <span className="text-white/30 mx-1">/</span>
              <span>{formatTime(duration)}</span>
            </span>
          </div>

          {/* Right Controls */}
          <div className="flex items-center gap-0.5">
            {/* Settings */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button
                onClick={() => { setSettingsOpen(!settingsOpen); setSettingsTab("main"); }}
                className="w-9 h-9 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-all duration-300"
                style={{ transform: settingsOpen ? "rotate(45deg)" : "none" }}
                title="Settings"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.488.488 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z" />
                </svg>
              </button>

              {/* Settings Panel */}
              {settingsOpen && (
                <div className="absolute bottom-12 right-0 w-[230px] bg-[#0a0a10]/[.97] backdrop-blur-xl rounded-xl border border-white/10 shadow-2xl shadow-black/70 overflow-hidden animate-[svMenuIn_0.2s_ease-out]">
                  {settingsTab === "main" && (
                    <>
                      <button
                        onClick={() => setSettingsTab("speed")}
                        className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-white/80 hover:bg-white/5 transition-colors border-b border-white/5"
                      >
                        <div className="flex items-center gap-2.5">
                          <svg className="w-4 h-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
                          <span>Playback Speed</span>
                        </div>
                        <span className="text-white/40 text-xs">{playbackRate}x ›</span>
                      </button>
                      <button
                        onClick={() => setSettingsTab("quality")}
                        className="w-full flex items-center justify-between px-4 py-3 text-[13px] text-white/80 hover:bg-white/5 transition-colors"
                      >
                        <div className="flex items-center gap-2.5">
                          <svg className="w-4 h-4 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/></svg>
                          <span>Quality</span>
                        </div>
                        <span className="text-white/40 text-xs">{currentQuality.split(" ")[0]} ›</span>
                      </button>
                    </>
                  )}

                  {settingsTab === "speed" && (
                    <div className="p-3">
                      <button
                        onClick={() => setSettingsTab("main")}
                        className="flex items-center gap-1.5 text-[11px] text-white/40 font-medium uppercase tracking-wider mb-3 hover:text-white/60 transition-colors"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                        Playback Speed
                      </button>
                      <div className="grid grid-cols-5 gap-1">
                        {[0.5, 0.75, 1, 1.5, 2].map((rate) => (
                          <button
                            key={rate}
                            onClick={() => changeSpeed(rate)}
                            className={`py-1.5 rounded-md text-[12px] font-semibold transition-all ${
                              playbackRate === rate
                                ? "text-white"
                                : "text-white/50 bg-white/5 hover:bg-white/10 hover:text-white"
                            }`}
                            style={playbackRate === rate ? { background: accentColor } : undefined}
                          >
                            {rate}x
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsTab === "quality" && (
                    <div className="p-3">
                      <button
                        onClick={() => setSettingsTab("main")}
                        className="flex items-center gap-1.5 text-[11px] text-white/40 font-medium uppercase tracking-wider mb-2 hover:text-white/60 transition-colors"
                      >
                        <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><path d="M15 18l-6-6 6-6"/></svg>
                        Quality
                      </button>
                      <div className="flex flex-col gap-0.5">
                        <button
                          onClick={() => changeQuality(-1)}
                          className={`w-full text-left px-3 py-2 rounded-md text-[12px] font-medium flex items-center justify-between transition-all ${
                            currentQuality.startsWith("Auto") ? "text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                          }`}
                          style={currentQuality.startsWith("Auto") ? { background: `${accentColor}22`, color: accentColor } : undefined}
                        >
                          Auto
                          {currentQuality.startsWith("Auto") && (
                            <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                          )}
                        </button>
                        {[...qualities].sort((a, b) => b.height - a.height).map((q) => (
                          <button
                            key={q.index}
                            onClick={() => changeQuality(q.index)}
                            className={`w-full text-left px-3 py-2 rounded-md text-[12px] font-medium flex items-center justify-between transition-all ${
                              currentQuality === `${q.height}p` ? "text-white" : "text-white/50 hover:bg-white/5 hover:text-white"
                            }`}
                            style={currentQuality === `${q.height}p` ? { background: `${accentColor}22`, color: accentColor } : undefined}
                          >
                            {q.height}p
                            {currentQuality === `${q.height}p` && (
                              <span className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />
                            )}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PiP */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                if (document.pictureInPictureElement) document.exitPictureInPicture();
                else videoRef.current?.requestPictureInPicture();
              }}
              className="w-9 h-9 rounded-lg items-center justify-center text-white hover:bg-white/10 transition-colors hidden sm:flex"
              title="Picture-in-Picture"
            >
              <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                <path d="M19 7h-8v6h8V7zm2-4H3c-1.1 0-2 .9-2 2v14c0 1.1.9 1.98 2 1.98h18c1.1 0 2-.88 2-1.98V5c0-1.1-.9-2-2-2zm0 16.01H3V4.98h18v14.03z" />
              </svg>
            </button>

            {/* Fullscreen */}
            <button
              onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
              className="w-9 h-9 rounded-lg flex items-center justify-center text-white hover:bg-white/10 transition-colors"
              title="Fullscreen (F)"
            >
              {isFullscreen ? (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z" />
                </svg>
              ) : (
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z" />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Settings panel animation keyframes */}
      <style>{`
        @keyframes svMenuIn {
          from { opacity: 0; transform: translateY(8px) scale(.96); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
      `}</style>
    </div>
  );
}
