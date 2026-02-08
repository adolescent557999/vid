import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import Hls from "hls.js";
import { Icons } from "./Icons";

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
  bitrate: number;
}

interface StoryboardTile {
  startTime: number;
  endTime: number;
  x: number;
  y: number;
  w: number;
  h: number;
  url: string;
}

interface StoryboardMeta {
  tiles: StoryboardTile[];
  // Map from sprite URL -> {naturalWidth, naturalHeight}
  images: Map<string, { nw: number; nh: number }>;
}

function formatTime(t: number): string {
  if (isNaN(t) || !isFinite(t)) return "0:00";
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const s = Math.floor(t % 60);
  const pad = (n: number) => (n < 10 ? "0" + n : "" + n);
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${m}:${pad(s)}`;
}

function parseStoryboardVTT(vttText: string, baseUrl: string): StoryboardTile[] {
  const tiles: StoryboardTile[] = [];
  const blocks = vttText.split(/\n\s*\n/).filter((b) => b.trim());

  for (const block of blocks) {
    const lines = block.trim().split("\n");
    let timeLine = "";
    let urlLine = "";

    for (const line of lines) {
      if (line.includes("-->")) timeLine = line.trim();
      else if (line.includes("#xywh=")) urlLine = line.trim();
    }

    if (!timeLine || !urlLine) continue;

    const timeMatch = timeLine.match(
      /(\d{2}):(\d{2}):(\d{2})\.(\d{3})\s*-->\s*(\d{2}):(\d{2}):(\d{2})\.(\d{3})/
    );
    const fragMatch = urlLine.match(/(.+)#xywh=(\d+),(\d+),(\d+),(\d+)/);

    if (!timeMatch || !fragMatch) continue;

    const startTime =
      parseInt(timeMatch[1]) * 3600 +
      parseInt(timeMatch[2]) * 60 +
      parseInt(timeMatch[3]) +
      parseInt(timeMatch[4]) / 1000;
    const endTime =
      parseInt(timeMatch[5]) * 3600 +
      parseInt(timeMatch[6]) * 60 +
      parseInt(timeMatch[7]) +
      parseInt(timeMatch[8]) / 1000;

    let fullUrl = fragMatch[1];
    if (!fullUrl.startsWith("http")) {
      fullUrl = baseUrl + fullUrl;
    }

    tiles.push({
      startTime,
      endTime,
      x: parseInt(fragMatch[2]),
      y: parseInt(fragMatch[3]),
      w: parseInt(fragMatch[4]),
      h: parseInt(fragMatch[5]),
      url: fullUrl,
    });
  }

  return tiles;
}

export function Player({
  playbackId,
  accentColor,
  title,
  autoplay,
  posterTime,
  loop,
}: PlayerProps) {
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
  const [isLoading, setIsLoading] = useState(true);
  const [isBuffering, setIsBuffering] = useState(false);
  const [qualities, setQualities] = useState<QualityLevel[]>([]);
  const [currentQuality, setCurrentQuality] = useState("Auto");
  const [playbackRate, setPlaybackRate] = useState(1);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState<"main" | "speed" | "quality">("main");
  const [hoverTime, setHoverTime] = useState<number | null>(null);
  const [hoverPos, setHoverPos] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const [seekFeedback, setSeekFeedback] = useState<"fwd" | "bwd" | null>(null);
  const [doubleTapSide, setDoubleTapSide] = useState<"left" | "right" | null>(null);
  const [showVolumeSlider, setShowVolumeSlider] = useState(false);
  const [isVideoReady, setIsVideoReady] = useState(false);

  // Storyboard
  const [storyboard, setStoryboard] = useState<StoryboardMeta | null>(null);

  const videoSrc = `https://stream.mux.com/${playbackId}.m3u8`;
  const posterUrl = `https://image.mux.com/${playbackId}/thumbnail.png?time=${posterTime}`;

  // ── Load storyboard VTT + preload sprite images (typically 1-2 requests total) ──
  useEffect(() => {
    let cancelled = false;
    const vttUrl = `https://image.mux.com/${playbackId}/storyboard.vtt`;
    const baseUrl = `https://image.mux.com/${playbackId}/`;

    fetch(vttUrl)
      .then((res) => {
        if (!res.ok) throw new Error("No storyboard");
        return res.text();
      })
      .then((vttText) => {
        if (cancelled) return;
        const tiles = parseStoryboardVTT(vttText, baseUrl);
        if (tiles.length === 0) return;

        // Get unique sprite sheet URLs (usually just 1 file)
        const uniqueUrls = [...new Set(tiles.map((t) => t.url))];
        const imageMap = new Map<string, { nw: number; nh: number }>();
        let loaded = 0;

        uniqueUrls.forEach((url) => {
          const img = new Image();
          img.crossOrigin = "anonymous";
          img.onload = () => {
            imageMap.set(url, { nw: img.naturalWidth, nh: img.naturalHeight });
            loaded++;
            if (loaded === uniqueUrls.length && !cancelled) {
              setStoryboard({ tiles, images: imageMap });
            }
          };
          img.onerror = () => {
            loaded++;
            if (loaded === uniqueUrls.length && !cancelled) {
              setStoryboard({ tiles, images: imageMap });
            }
          };
          img.src = url;
        });
      })
      .catch(() => {});

    return () => {
      cancelled = true;
    };
  }, [playbackId]);

  // ── Binary search for tile at given time — O(log n), zero allocations ──
  const findTile = useCallback(
    (time: number): StoryboardTile | null => {
      if (!storyboard || storyboard.tiles.length === 0) return null;
      const tiles = storyboard.tiles;
      let lo = 0;
      let hi = tiles.length - 1;

      while (lo <= hi) {
        const mid = (lo + hi) >>> 1;
        if (time < tiles[mid].startTime) hi = mid - 1;
        else if (time >= tiles[mid].endTime) lo = mid + 1;
        else return tiles[mid];
      }

      return tiles[Math.min(lo, tiles.length - 1)];
    },
    [storyboard]
  );

  // ── Current hover tile ──
  const hoverTile = useMemo(() => {
    if (hoverTime === null || !storyboard) return null;
    return findTile(hoverTime);
  }, [hoverTime, storyboard, findTile]);

  // ── Compute thumbnail preview style from storyboard (zero requests on hover) ──
  const thumbStyle = useMemo((): React.CSSProperties | null => {
    if (!hoverTile || !storyboard) return null;

    const meta = storyboard.images.get(hoverTile.url);
    if (!meta) return null;

    const tileW = hoverTile.w;
    const tileH = hoverTile.h;
    const tileAspect = tileW / tileH;

    // Preview display size
    const previewW = tileAspect >= 1 ? 192 : Math.round(128 * tileAspect);
    const previewH = tileAspect >= 1 ? Math.round(192 / tileAspect) : 128;

    // Scale factor from tile pixels to preview pixels
    const scaleX = previewW / tileW;
    const scaleY = previewH / tileH;

    return {
      width: `${previewW}px`,
      height: `${previewH}px`,
      backgroundImage: `url(${hoverTile.url})`,
      backgroundPosition: `-${hoverTile.x * scaleX}px -${hoverTile.y * scaleY}px`,
      backgroundSize: `${meta.nw * scaleX}px ${meta.nh * scaleY}px`,
      backgroundRepeat: "no-repeat",
    };
  }, [hoverTile, storyboard]);

  // Preview width for clamping position
  const previewWidth = useMemo(() => {
    if (!hoverTile) return 192;
    const aspect = hoverTile.w / hoverTile.h;
    return aspect >= 1 ? 192 : Math.round(128 * aspect);
  }, [hoverTile]);

  // ── Initialize HLS ──
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
        backBufferLength: 30,
        maxBufferLength: 30,
        maxMaxBufferLength: 60,
        maxBufferSize: 60 * 1000 * 1000,
        startLevel: -1,
      });
      hlsRef.current = hls;
      hls.loadSource(videoSrc);
      hls.attachMedia(video);

      hls.on(Hls.Events.MANIFEST_PARSED, (_, data) => {
        const q = data.levels.map((lv, i) => ({
          height: lv.height,
          index: i,
          bitrate: lv.bitrate,
        }));
        setQualities(q);
        setIsLoading(false);
        setIsVideoReady(true);
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
      video.addEventListener("loadedmetadata", () => {
        setIsLoading(false);
        setIsVideoReady(true);
      });
      if (autoplay) {
        video.muted = true;
        video.play().catch(() => {});
      }
    }
  }, [videoSrc, autoplay]);

  // ── Video events ──
  useEffect(() => {
    const v = videoRef.current;
    if (!v) return;

    const handlers: [string, EventListener][] = [
      ["timeupdate", () => setCurrentTime(v.currentTime)],
      ["durationchange", () => setDuration(v.duration)],
      ["play", () => { setIsPlaying(true); setHasStarted(true); }],
      ["pause", () => setIsPlaying(false)],
      ["ended", () => { setIsPlaying(false); if (loop) { v.currentTime = 0; v.play(); } }],
      ["waiting", () => setIsBuffering(true)],
      ["canplay", () => setIsBuffering(false)],
      ["playing", () => setIsBuffering(false)],
      ["progress", () => { if (v.buffered.length > 0) setBuffered(v.buffered.end(v.buffered.length - 1)); }],
      ["volumechange", () => { setVolume(v.volume); setIsMuted(v.muted); }],
    ];

    handlers.forEach(([evt, fn]) => v.addEventListener(evt, fn));
    return () => handlers.forEach(([evt, fn]) => v.removeEventListener(evt, fn));
  }, [loop]);

  // ── Auto-hide controls ──
  const resetHideTimer = useCallback(() => {
    setShowControls(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    if (videoRef.current && !videoRef.current.paused) {
      hideTimerRef.current = setTimeout(() => {
        setShowControls(false);
        setShowVolumeSlider(false);
        setSettingsOpen(false);
      }, 3500);
    }
  }, []);

  // ── Keyboard shortcuts ──
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (document.activeElement?.tagName || "").toLowerCase();
      if (tag === "input" || tag === "textarea") return;
      const v = videoRef.current;
      if (!v) return;

      switch (e.key.toLowerCase()) {
        case " ": case "k":
          e.preventDefault(); v.paused ? v.play() : v.pause(); resetHideTimer(); break;
        case "f":
          e.preventDefault(); toggleFullscreen(); break;
        case "m":
          e.preventDefault(); v.muted = !v.muted; break;
        case "arrowleft":
          e.preventDefault(); v.currentTime = Math.max(0, v.currentTime - 10);
          showSeekFeedback("bwd"); resetHideTimer(); break;
        case "arrowright":
          e.preventDefault(); v.currentTime = Math.min(v.duration || 0, v.currentTime + 10);
          showSeekFeedback("fwd"); resetHideTimer(); break;
        case "arrowup":
          e.preventDefault(); v.volume = Math.min(1, v.volume + 0.05); resetHideTimer(); break;
        case "arrowdown":
          e.preventDefault(); v.volume = Math.max(0, v.volume - 0.05); resetHideTimer(); break;
        case "0": case "home":
          e.preventDefault(); v.currentTime = 0; resetHideTimer(); break;
        case "end":
          e.preventDefault(); v.currentTime = v.duration; break;
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [resetHideTimer]);

  // ── Fullscreen ──
  useEffect(() => {
    const onChange = () => setIsFullscreen(!!document.fullscreenElement);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // ── Progress bar drag ──
  useEffect(() => {
    if (!isDragging) return;
    const onMouseUp = () => setIsDragging(false);
    const onMouseMove = (e: MouseEvent) => {
      if (!progressRef.current || !videoRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      videoRef.current.currentTime = pos * (videoRef.current.duration || 0);
      setHoverPos(pos);
      setHoverTime(pos * (videoRef.current.duration || 0));
    };
    const onTouchMove = (e: TouchEvent) => {
      if (!progressRef.current || !videoRef.current) return;
      const rect = progressRef.current.getBoundingClientRect();
      const pos = Math.max(0, Math.min(1, (e.touches[0].clientX - rect.left) / rect.width));
      videoRef.current.currentTime = pos * (videoRef.current.duration || 0);
      setHoverPos(pos);
      setHoverTime(pos * (videoRef.current.duration || 0));
    };
    const onTouchEnd = () => setIsDragging(false);

    window.addEventListener("mouseup", onMouseUp);
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("touchmove", onTouchMove);
    window.addEventListener("touchend", onTouchEnd);
    return () => {
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("touchmove", onTouchMove);
      window.removeEventListener("touchend", onTouchEnd);
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

  const seekTo = (e: React.MouseEvent | React.TouchEvent) => {
    if (!progressRef.current || !videoRef.current) return;
    const rect = progressRef.current.getBoundingClientRect();
    const clientX = "touches" in e ? e.touches[0].clientX : e.clientX;
    const pos = Math.max(0, Math.min(1, (clientX - rect.left) / rect.width));
    videoRef.current.currentTime = pos * (videoRef.current.duration || 0);
  };

  const handleProgressHover = (e: React.MouseEvent) => {
    if (!progressRef.current || duration <= 0) return;
    const rect = progressRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    setHoverPos(pos);
    setHoverTime(pos * duration);
  };

  const handleVolumeClick = (e: React.MouseEvent) => {
    if (!volTrackRef.current || !videoRef.current) return;
    e.stopPropagation();
    const rect = volTrackRef.current.getBoundingClientRect();
    const pos = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    videoRef.current.volume = pos;
    if (pos > 0 && videoRef.current.muted) videoRef.current.muted = false;
  };

  const showSeekFeedback = (dir: "fwd" | "bwd") => {
    setSeekFeedback(dir);
    setTimeout(() => setSeekFeedback(null), 600);
  };

  // Double tap on mobile
  const lastTapRef = useRef<{ time: number; side: "left" | "right" }>({ time: 0, side: "left" });
  const handleVideoTap = (e: React.TouchEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect || !videoRef.current) return;
    const x = e.changedTouches[0].clientX - rect.left;
    const side = x < rect.width / 2 ? "left" : "right";
    const now = Date.now();

    if (now - lastTapRef.current.time < 300 && lastTapRef.current.side === side) {
      if (side === "left") {
        videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
        setDoubleTapSide("left");
      } else {
        videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
        setDoubleTapSide("right");
      }
      setTimeout(() => setDoubleTapSide(null), 600);
      lastTapRef.current = { time: 0, side: "left" };
    } else {
      lastTapRef.current = { time: now, side };
      setTimeout(() => {
        if (Date.now() - lastTapRef.current.time >= 280) {
          if (showControls && isPlaying) setShowControls(false);
          else resetHideTimer();
        }
      }, 300);
    }
  };

  const changeQuality = (index: number) => {
    const hls = hlsRef.current;
    if (!hls) return;
    if (index === -1) { hls.currentLevel = -1; setCurrentQuality("Auto"); }
    else {
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

  return (
    <div
      ref={containerRef}
      className={`cs-player relative w-full h-full bg-black overflow-hidden select-none ${controlsHidden ? "cursor-none" : "cursor-default"}`}
      onMouseMove={resetHideTimer}
      onMouseLeave={() => { if (isPlaying) { setShowControls(false); setShowVolumeSlider(false); } }}
      onClick={() => { setSettingsOpen(false); setSettingsTab("main"); }}
      style={{ "--cs-accent": accentColor } as React.CSSProperties}
    >
      {/* ── Video ── */}
      <video
        ref={videoRef}
        className="absolute inset-0 w-full h-full object-contain bg-black"
        poster={posterUrl}
        playsInline
        preload="metadata"
        onClick={(e) => { e.stopPropagation(); togglePlay(); }}
        onDoubleClick={(e) => { e.stopPropagation(); toggleFullscreen(); }}
        onTouchEnd={handleVideoTap}
      />

      {/* ── Loading ── */}
      {isLoading && !isVideoReady && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black">
          <div className="relative w-14 h-14 mb-4">
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: accentColor, animationDuration: "0.8s" }} />
            <div className="absolute inset-[5px] rounded-full border-[1.5px] border-transparent animate-spin" style={{ borderBottomColor: accentColor + "60", animationDuration: "1.2s", animationDirection: "reverse" }} />
          </div>
          <p className="text-[10px] text-white/20 font-semibold tracking-[0.2em] uppercase">Loading</p>
        </div>
      )}

      {/* ── Buffering ── */}
      {isBuffering && hasStarted && (
        <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
          <div className="relative w-11 h-11">
            <div className="absolute inset-0 rounded-full border-2 border-white/5" />
            <div className="absolute inset-0 rounded-full border-2 border-transparent animate-spin" style={{ borderTopColor: accentColor, borderRightColor: accentColor + "30", animationDuration: "0.7s" }} />
          </div>
        </div>
      )}

      {/* ── Seek Feedback ── */}
      {seekFeedback && (
        <div className={`absolute top-1/2 -translate-y-1/2 z-20 pointer-events-none animate-[csFadeScale_0.6s_ease-out_forwards] ${seekFeedback === "fwd" ? "right-[15%]" : "left-[15%]"}`}>
          <div className="w-14 h-14 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center border border-white/10">
            {seekFeedback === "fwd" ? (
              <div className="flex items-center"><Icons.chevronRight className="w-5 h-5 text-white" /><Icons.chevronRight className="w-5 h-5 text-white -ml-3" /></div>
            ) : (
              <div className="flex items-center"><Icons.chevronLeft className="w-5 h-5 text-white" /><Icons.chevronLeft className="w-5 h-5 text-white -ml-3" /></div>
            )}
            <span className="absolute -bottom-5 text-[10px] text-white/60 font-bold">10s</span>
          </div>
        </div>
      )}

      {/* ── Double Tap Ripple ── */}
      {doubleTapSide && (
        <div className={`absolute top-0 bottom-0 w-1/2 z-15 pointer-events-none ${doubleTapSide === "right" ? "right-0" : "left-0"}`}>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-24 h-24 rounded-full bg-white/10 animate-[csRipple_0.6s_ease-out_forwards]" />
          </div>
        </div>
      )}

      {/* ── Big Play Button ── */}
      {!hasStarted && isVideoReady && (
        <div className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer" onClick={(e) => { e.stopPropagation(); togglePlay(); }}>
          <div className="absolute w-52 h-52 rounded-full opacity-15 blur-[70px]" style={{ background: accentColor }} />
          <div className="relative group">
            <div className="absolute -inset-5 rounded-full opacity-12 animate-[csPulse_2.5s_ease-in-out_infinite]" style={{ background: `radial-gradient(circle, ${accentColor}, transparent 70%)` }} />
            <div className="relative w-[72px] h-[72px] sm:w-[84px] sm:h-[84px] rounded-full bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] flex items-center justify-center shadow-2xl shadow-black/60 group-hover:bg-white/[0.12] group-hover:scale-110 group-hover:border-white/20 transition-all duration-500 ease-out">
              <svg className="w-7 h-7 sm:w-8 sm:h-8 text-white ml-1 drop-shadow-lg" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
            </div>
          </div>
        </div>
      )}

      {/* ── Replay ── */}
      {hasStarted && !isPlaying && videoRef.current?.ended && !loop && (
        <div className="absolute inset-0 flex items-center justify-center z-20 cursor-pointer bg-black/40" onClick={(e) => { e.stopPropagation(); if (videoRef.current) { videoRef.current.currentTime = 0; videoRef.current.play(); } }}>
          <div className="w-[72px] h-[72px] rounded-full bg-white/[0.06] backdrop-blur-2xl border border-white/[0.1] flex items-center justify-center shadow-2xl hover:bg-white/[0.12] hover:scale-110 transition-all duration-300">
            <Icons.replay className="w-7 h-7 text-white" />
          </div>
        </div>
      )}

      {/* ═══════ CONTROLS ═══════ */}

      {/* Top Gradient */}
      <div className="absolute top-0 left-0 right-0 h-24 pointer-events-none z-10 transition-opacity duration-500" style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.65) 0%, rgba(0,0,0,.2) 60%, transparent 100%)", opacity: controlsHidden ? 0 : 1 }} />

      {/* Top Bar */}
      <div className={`absolute top-0 left-0 right-0 z-30 flex items-center justify-between px-3 sm:px-5 py-3 transition-all duration-500 ease-out ${controlsHidden ? "opacity-0 -translate-y-3 pointer-events-none" : "opacity-100 translate-y-0"}`}>
        <div className="flex items-center gap-2 min-w-0">
          {title && <h2 className="text-[12px] sm:text-[13px] text-white/85 font-semibold truncate max-w-[160px] sm:max-w-[450px] drop-shadow-lg">{title}</h2>}
        </div>
      </div>

      {/* Bottom Gradient */}
      <div className="absolute bottom-0 left-0 right-0 h-40 pointer-events-none z-10 transition-opacity duration-500" style={{ background: "linear-gradient(to top, rgba(0,0,0,.88) 0%, rgba(0,0,0,.45) 40%, transparent 100%)", opacity: controlsHidden ? 0 : 1 }} />

      {/* Controls */}
      <div className={`absolute bottom-0 left-0 right-0 z-30 transition-all duration-500 ease-out ${controlsHidden ? "opacity-0 translate-y-5 pointer-events-none" : "opacity-100 translate-y-0"}`}>

        {/* ── Progress Bar ── */}
        <div className="px-3 sm:px-5 relative">
          <div
            ref={progressRef}
            className="relative h-8 sm:h-7 flex items-center cursor-pointer group/prog"
            onMouseDown={(e) => { e.stopPropagation(); setIsDragging(true); seekTo(e); }}
            onTouchStart={(e) => { setIsDragging(true); seekTo(e); }}
            onMouseMove={handleProgressHover}
            onMouseLeave={() => { setHoverTime(null); }}
          >
            {/* Track */}
            <div className="absolute left-0 right-0 h-[3px] group-hover/prog:h-[5px] rounded-full bg-white/[0.12] transition-all duration-200">
              {/* Buffered */}
              <div className="absolute top-0 left-0 h-full rounded-full bg-white/[0.08] transition-[width] duration-500" style={{ width: `${bufferedPct}%` }} />
              {/* Progress */}
              <div className="absolute top-0 left-0 h-full rounded-full transition-[width] duration-75" style={{ width: `${progressPct}%`, background: `linear-gradient(90deg, ${accentColor}bb, ${accentColor})`, boxShadow: `0 0 12px ${accentColor}40, 0 0 4px ${accentColor}70` }} />
            </div>

            {/* Scrub Handle */}
            <div
              className="absolute top-1/2 w-[13px] h-[13px] rounded-full bg-white shadow-lg opacity-0 group-hover/prog:opacity-100 transition-all duration-200 pointer-events-none scale-50 group-hover/prog:scale-100"
              style={{ left: `${progressPct}%`, transform: "translate(-50%, -50%)", boxShadow: `0 0 8px ${accentColor}50, 0 2px 6px rgba(0,0,0,0.5)` }}
            />

            {/* Hover line */}
            {hoverTime !== null && (
              <div className="absolute top-1/2 -translate-y-1/2 w-[1px] h-[14px] rounded bg-white/25 pointer-events-none" style={{ left: `${hoverPos * 100}%` }} />
            )}

            {/* ── STORYBOARD THUMBNAIL — ZERO network requests on hover ── */}
            {hoverTime !== null && thumbStyle && duration > 0 && (
              <div
                className="absolute bottom-10 pointer-events-none z-50"
                style={{
                  left: `clamp(${previewWidth / 2 + 12}px, ${hoverPos * 100}%, calc(100% - ${previewWidth / 2 + 12}px))`,
                  transform: "translateX(-50%)",
                }}
              >
                <div className="relative animate-[csFadeIn_0.08s_ease-out]">
                  {/* Glow */}
                  <div className="absolute -inset-1 rounded-xl blur-md opacity-15" style={{ background: accentColor }} />
                  <div className="relative bg-[#060609] rounded-lg border border-white/[0.08] overflow-hidden shadow-2xl shadow-black/90">
                    {/* Sprite crop — pure CSS, no img tag, no request */}
                    <div style={thumbStyle} />
                    {/* Time overlay */}
                    <div className="absolute bottom-0 left-0 right-0 text-center py-1 text-[10px] sm:text-[11px] font-mono font-bold text-white/95 tracking-wide" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.85), rgba(0,0,0,0.3) 90%, transparent)" }}>
                      {formatTime(hoverTime)}
                    </div>
                  </div>
                  {/* Arrow */}
                  <div className="flex justify-center -mt-[1px]">
                    <div className="w-2 h-2 rotate-45 border-r border-b border-white/[0.08]" style={{ background: "#060609" }} />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* ── Buttons ── */}
        <div className="flex items-center justify-between px-1.5 sm:px-3 pb-2 sm:pb-3">
          {/* Left */}
          <div className="flex items-center">
            <button onClick={(e) => { e.stopPropagation(); togglePlay(); }} className="cs-btn w-10 h-10 sm:w-11 sm:h-11" title={isPlaying ? "Pause (K)" : "Play (K)"}>
              {isPlaying ? <Icons.pause className="w-[22px] h-[22px]" /> : <Icons.play className="w-[22px] h-[22px] ml-0.5" />}
            </button>

            <button onClick={(e) => { e.stopPropagation(); if (videoRef.current) { videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10); showSeekFeedback("bwd"); } resetHideTimer(); }} className="cs-btn w-9 h-9 sm:w-10 sm:h-10 hidden sm:flex" title="Back 10s">
              <Icons.skipBack className="w-[18px] h-[18px]" />
            </button>

            <button onClick={(e) => { e.stopPropagation(); if (videoRef.current) { videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10); showSeekFeedback("fwd"); } resetHideTimer(); }} className="cs-btn w-9 h-9 sm:w-10 sm:h-10 hidden sm:flex" title="Forward 10s">
              <Icons.skipFwd className="w-[18px] h-[18px]" />
            </button>

            {/* Volume */}
            <div className="hidden sm:flex items-center" onMouseEnter={() => setShowVolumeSlider(true)} onMouseLeave={() => setShowVolumeSlider(false)}>
              <button onClick={(e) => { e.stopPropagation(); if (videoRef.current) videoRef.current.muted = !videoRef.current.muted; }} className="cs-btn w-10 h-10" title="Mute (M)">
                {isMuted || volume === 0 ? <Icons.volumeOff className="w-5 h-5" /> : volume < 0.5 ? <Icons.volumeLow className="w-5 h-5" /> : <Icons.volumeHigh className="w-5 h-5" />}
              </button>
              <div className={`overflow-hidden transition-all duration-300 ease-out ${showVolumeSlider ? "w-[72px] opacity-100" : "w-0 opacity-0"}`}>
                <div ref={volTrackRef} className="w-[66px] h-8 mx-[3px] relative flex items-center cursor-pointer" onClick={handleVolumeClick}>
                  <div className="absolute left-0 right-0 h-[3px] rounded-full bg-white/15">
                    <div className="absolute top-0 left-0 h-full rounded-full bg-white transition-[width] duration-75" style={{ width: `${volPct}%` }} />
                  </div>
                  <div className="absolute top-1/2 w-[10px] h-[10px] rounded-full bg-white shadow-md transition-[left] duration-75" style={{ left: `${volPct}%`, transform: "translate(-50%, -50%)" }} />
                </div>
              </div>
            </div>

            {/* Time */}
            <div className="ml-1 sm:ml-2 flex items-center text-[10px] sm:text-[12px] font-mono font-medium tabular-nums whitespace-nowrap">
              <span className="text-white/90">{formatTime(currentTime)}</span>
              <span className="text-white/20 mx-1">/</span>
              <span className="text-white/35">{formatTime(duration)}</span>
            </div>
          </div>

          {/* Right */}
          <div className="flex items-center">
            {playbackRate !== 1 && (
              <span className="text-[9px] font-bold text-white/35 bg-white/[0.05] px-1.5 py-0.5 rounded mr-1 sm:hidden">{playbackRate}x</span>
            )}

            {/* Settings */}
            <div className="relative" onClick={(e) => e.stopPropagation()}>
              <button onClick={() => { setSettingsOpen(!settingsOpen); setSettingsTab("main"); }} className={`cs-btn w-10 h-10 transition-transform duration-300 ${settingsOpen ? "rotate-[60deg]" : ""}`} title="Settings">
                <Icons.settings className="w-[19px] h-[19px]" />
              </button>

              {settingsOpen && (
                <div className="absolute bottom-12 right-0 w-[215px] sm:w-[235px] bg-[#09090f]/[0.98] backdrop-blur-2xl rounded-xl border border-white/[0.07] shadow-2xl shadow-black/90 overflow-hidden animate-[csSlideUp_0.2s_ease-out]">
                  {settingsTab === "main" && (
                    <>
                      <button onClick={() => setSettingsTab("speed")} className="cs-menu-item border-b border-white/[0.04]">
                        <div className="flex items-center gap-3"><Icons.speed className="w-4 h-4 text-white/20" /><span>Speed</span></div>
                        <div className="flex items-center gap-1 text-white/25 text-xs"><span>{playbackRate === 1 ? "Normal" : `${playbackRate}x`}</span><Icons.chevronRight className="w-3.5 h-3.5" /></div>
                      </button>
                      <button onClick={() => setSettingsTab("quality")} className="cs-menu-item">
                        <div className="flex items-center gap-3"><Icons.quality className="w-4 h-4 text-white/20" /><span>Quality</span></div>
                        <div className="flex items-center gap-1 text-white/25 text-xs"><span>{currentQuality.split(" ")[0]}</span><Icons.chevronRight className="w-3.5 h-3.5" /></div>
                      </button>
                    </>
                  )}

                  {settingsTab === "speed" && (
                    <div className="p-2.5">
                      <button onClick={() => setSettingsTab("main")} className="flex items-center gap-1.5 text-[9px] text-white/25 font-semibold uppercase tracking-[0.2em] mb-2 hover:text-white/45 transition-colors px-1">
                        <Icons.chevronLeft className="w-3 h-3" /> Speed
                      </button>
                      <div className="space-y-[1px]">
                        {[0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75, 2].map((rate) => (
                          <button key={rate} onClick={() => changeSpeed(rate)} className={`w-full text-left px-3 py-[7px] rounded-lg text-[12px] font-medium flex items-center justify-between transition-all duration-150 ${playbackRate === rate ? "text-white bg-white/[0.06]" : "text-white/35 hover:bg-white/[0.03] hover:text-white/60"}`}>
                            <span>{rate === 1 ? "Normal" : `${rate}x`}</span>
                            {playbackRate === rate && <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  {settingsTab === "quality" && (
                    <div className="p-2.5">
                      <button onClick={() => setSettingsTab("main")} className="flex items-center gap-1.5 text-[9px] text-white/25 font-semibold uppercase tracking-[0.2em] mb-2 hover:text-white/45 transition-colors px-1">
                        <Icons.chevronLeft className="w-3 h-3" /> Quality
                      </button>
                      <div className="space-y-[1px]">
                        <button onClick={() => changeQuality(-1)} className={`w-full text-left px-3 py-[7px] rounded-lg text-[12px] font-medium flex items-center justify-between transition-all duration-150 ${currentQuality.startsWith("Auto") ? "text-white bg-white/[0.06]" : "text-white/35 hover:bg-white/[0.03] hover:text-white/60"}`}>
                          <span>Auto</span>
                          {currentQuality.startsWith("Auto") && <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />}
                        </button>
                        {[...qualities].sort((a, b) => b.height - a.height).map((q) => (
                          <button key={q.index} onClick={() => changeQuality(q.index)} className={`w-full text-left px-3 py-[7px] rounded-lg text-[12px] font-medium flex items-center justify-between transition-all duration-150 ${currentQuality === `${q.height}p` ? "text-white bg-white/[0.06]" : "text-white/35 hover:bg-white/[0.03] hover:text-white/60"}`}>
                            <div className="flex items-center gap-2">
                              <span>{q.height}p</span>
                              {q.height >= 1080 && <span className="text-[7px] font-bold px-1 py-[1px] rounded bg-white/[0.06] text-white/30">HD</span>}
                            </div>
                            {currentQuality === `${q.height}p` && <div className="w-1.5 h-1.5 rounded-full" style={{ background: accentColor }} />}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PiP */}
            {document.pictureInPictureEnabled && (
              <button onClick={(e) => { e.stopPropagation(); if (document.pictureInPictureElement) document.exitPictureInPicture(); else videoRef.current?.requestPictureInPicture(); }} className="cs-btn w-10 h-10 hidden sm:flex" title="Picture-in-Picture">
                <Icons.pip className="w-[18px] h-[18px]" />
              </button>
            )}

            {/* Fullscreen */}
            <button onClick={(e) => { e.stopPropagation(); toggleFullscreen(); }} className="cs-btn w-10 h-10" title="Fullscreen (F)">
              {isFullscreen ? <Icons.exitFs className="w-[19px] h-[19px]" /> : <Icons.enterFs className="w-[19px] h-[19px]" />}
            </button>
          </div>
        </div>
      </div>

      {/* ── Animations ── */}
      <style>{`
        .cs-btn {
          display: flex; align-items: center; justify-content: center;
          color: white; border: none; background: transparent;
          border-radius: 8px; cursor: pointer;
          transition: background-color 0.15s, transform 0.15s;
          -webkit-tap-highlight-color: transparent;
        }
        .cs-btn:hover { background: rgba(255,255,255,0.06); }
        .cs-btn:active { transform: scale(0.9); }
        .cs-menu-item {
          width: 100%; display: flex; align-items: center; justify-content: space-between;
          padding: 11px 14px; font-size: 13px; color: rgba(255,255,255,0.6);
          background: none; border: none; cursor: pointer; transition: background-color 0.12s;
        }
        .cs-menu-item:hover { background: rgba(255,255,255,0.03); }
        @keyframes csSlideUp { from { opacity:0; transform:translateY(8px) scale(0.96); } to { opacity:1; transform:translateY(0) scale(1); } }
        @keyframes csFadeIn { from { opacity:0; } to { opacity:1; } }
        @keyframes csFadeScale { 0% { opacity:0; transform:translateY(-50%) scale(0.7); } 30% { opacity:1; transform:translateY(-50%) scale(1.1); } 100% { opacity:0; transform:translateY(-50%) scale(1); } }
        @keyframes csPulse { 0%,100% { transform:scale(1); opacity:0.1; } 50% { transform:scale(1.2); opacity:0.2; } }
        @keyframes csRipple { 0% { transform:scale(0.5); opacity:0.3; } 100% { transform:scale(3); opacity:0; } }
      `}</style>
    </div>
  );
}
