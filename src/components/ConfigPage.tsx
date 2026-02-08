import { useState, useRef } from "react";

const DEFAULT_ID = "LGAf9w4FW2bkiMhgcjPAV4qhGEaCisxMbPVM8IJevkE";

interface ConfigPageProps {
  allowedDomains: string[];
  enforcing: boolean;
}

export function ConfigPage({ allowedDomains, enforcing }: ConfigPageProps) {
  const [playbackId, setPlaybackId] = useState(DEFAULT_ID);
  const [accentColor, setAccentColor] = useState("#8b5cf6");
  const [videoTitle, setVideoTitle] = useState("");
  const [autoplay, setAutoplay] = useState(false);
  const [posterTime, setPosterTime] = useState("5");
  const [loopEnabled, setLoopEnabled] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"iframe" | "blogger" | "params" | "security">("iframe");
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const baseUrl = window.location.origin;

  const buildUrl = () => {
    const p = new URLSearchParams();
    p.set("v", playbackId);
    if (accentColor !== "#8b5cf6") p.set("color", accentColor);
    if (videoTitle) p.set("title", videoTitle);
    if (autoplay) p.set("autoplay", "1");
    if (posterTime !== "5") p.set("poster", posterTime);
    if (loopEnabled) p.set("loop", "1");
    return `${baseUrl}?${p.toString()}`;
  };

  const playerUrl = buildUrl();

  const embedCode = (type: "iframe" | "blogger") => {
    const iframe = `<iframe src="${playerUrl}" width="100%" height="450" frameborder="0" allow="autoplay; fullscreen; picture-in-picture; encrypted-media" allowfullscreen style="border:0;border-radius:12px;aspect-ratio:16/9;max-width:854px;"></iframe>`;
    if (type === "iframe") return iframe;
    return `<!-- CineStream Player -->\n<div style="max-width:854px;margin:20px auto;">\n  ${iframe}\n</div>`;
  };

  const copy = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  const presetColors = [
    { c: "#8b5cf6", n: "Violet" },
    { c: "#6366f1", n: "Indigo" },
    { c: "#3b82f6", n: "Blue" },
    { c: "#06b6d4", n: "Cyan" },
    { c: "#10b981", n: "Emerald" },
    { c: "#f59e0b", n: "Amber" },
    { c: "#ef4444", n: "Red" },
    { c: "#ec4899", n: "Pink" },
    { c: "#f97316", n: "Orange" },
    { c: "#ffffff", n: "White" },
  ];

  return (
    <div className="min-h-screen bg-[#06060a] text-white overflow-y-auto" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* BG effects */}
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-[-250px] left-[10%] w-[600px] h-[600px] rounded-full blur-[150px]" style={{ background: `${accentColor}08` }} />
        <div className="absolute bottom-[-200px] right-[10%] w-[500px] h-[500px] bg-purple-600/[0.03] rounded-full blur-[120px]" />
        {/* Grid */}
        <div className="absolute inset-0 opacity-[0.02]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "40px 40px" }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.05] bg-[#06060a]/80 backdrop-blur-2xl sticky top-0">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg" style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}80)`, boxShadow: `0 4px 15px ${accentColor}30` }}>
              <svg className="w-4.5 h-4.5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">CineStream</h1>
              <p className="text-[9px] tracking-[0.25em] uppercase text-white/30 font-semibold">Embed Studio</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium ${enforcing ? "bg-emerald-500/10 border border-emerald-500/20 text-emerald-400" : "bg-amber-500/10 border border-amber-500/20 text-amber-400"}`}>
              <span className={`w-1.5 h-1.5 rounded-full ${enforcing ? "bg-emerald-400" : "bg-amber-400"} animate-pulse`} />
              {enforcing ? "Domain Guard Active" : "Open Access Mode"}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
        {/* Layout Grid */}
        <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
          {/* Config Panel */}
          <div className="xl:col-span-4 2xl:col-span-3">
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden sticky top-[70px]">
              {/* Panel header */}
              <div className="px-5 py-4 border-b border-white/[0.06] flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-white/[0.05] flex items-center justify-center">
                  <svg className="w-3.5 h-3.5 text-white/40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707" strokeLinecap="round" /></svg>
                </div>
                <div>
                  <h3 className="text-sm font-semibold">Configure</h3>
                  <p className="text-[10px] text-white/30">Customize your player</p>
                </div>
              </div>

              <div className="p-5 space-y-5">
                {/* Playback ID */}
                <div>
                  <label className="cs-label">Mux Playback ID</label>
                  <input
                    type="text"
                    value={playbackId}
                    onChange={(e) => setPlaybackId(e.target.value)}
                    className="cs-input font-mono text-xs"
                    placeholder="Enter Playback ID"
                  />
                </div>

                {/* Title */}
                <div>
                  <label className="cs-label">Video Title <span className="text-white/20">(optional)</span></label>
                  <input
                    type="text"
                    value={videoTitle}
                    onChange={(e) => setVideoTitle(e.target.value)}
                    className="cs-input"
                    placeholder="My Video Title"
                  />
                </div>

                {/* Color */}
                <div>
                  <label className="cs-label">Accent Color</label>
                  <div className="flex items-center gap-2 mb-3">
                    <div className="relative">
                      <input
                        type="color"
                        value={accentColor}
                        onChange={(e) => setAccentColor(e.target.value)}
                        className="w-9 h-9 rounded-lg cursor-pointer bg-transparent border border-white/10 [&::-webkit-color-swatch-wrapper]:p-[3px] [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md"
                      />
                    </div>
                    <input
                      type="text"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      className="cs-input !py-2 font-mono text-xs flex-1"
                    />
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {presetColors.map((p) => (
                      <button
                        key={p.c}
                        onClick={() => setAccentColor(p.c)}
                        className={`w-7 h-7 rounded-lg border-2 transition-all duration-200 hover:scale-110 ${accentColor === p.c ? "border-white shadow-lg scale-110" : "border-transparent hover:border-white/20"}`}
                        style={{ background: p.c, boxShadow: accentColor === p.c ? `0 0 12px ${p.c}50` : undefined }}
                        title={p.n}
                      />
                    ))}
                  </div>
                </div>

                {/* Poster Time */}
                <div>
                  <label className="cs-label">Poster Frame (seconds)</label>
                  <input
                    type="number"
                    value={posterTime}
                    onChange={(e) => setPosterTime(e.target.value)}
                    className="cs-input text-xs"
                    min="0"
                    placeholder="5"
                  />
                </div>

                {/* Toggles */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-white/50 font-medium">Autoplay (muted)</label>
                    <button
                      onClick={() => setAutoplay(!autoplay)}
                      className={`relative w-10 h-[22px] rounded-full transition-all duration-300 ${autoplay ? "" : "bg-white/10"}`}
                      style={autoplay ? { background: accentColor } : undefined}
                    >
                      <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-300 ${autoplay ? "translate-x-[18px]" : ""}`} />
                    </button>
                  </div>
                  <div className="flex items-center justify-between">
                    <label className="text-xs text-white/50 font-medium">Loop</label>
                    <button
                      onClick={() => setLoopEnabled(!loopEnabled)}
                      className={`relative w-10 h-[22px] rounded-full transition-all duration-300 ${loopEnabled ? "" : "bg-white/10"}`}
                      style={loopEnabled ? { background: accentColor } : undefined}
                    >
                      <span className={`absolute top-[2px] left-[2px] w-[18px] h-[18px] rounded-full bg-white shadow-sm transition-transform duration-300 ${loopEnabled ? "translate-x-[18px]" : ""}`} />
                    </button>
                  </div>
                </div>

                {/* Direct URL */}
                <div className="pt-2 border-t border-white/[0.06]">
                  <label className="cs-label">Direct URL</label>
                  <div className="flex gap-1.5">
                    <input
                      type="text"
                      value={playerUrl}
                      readOnly
                      className="cs-input !py-1.5 font-mono text-[10px] flex-1 text-white/40"
                    />
                    <button
                      onClick={() => copy(playerUrl, "url")}
                      className="px-3 rounded-lg bg-white/[0.05] border border-white/[0.1] text-[10px] font-medium text-white/50 hover:bg-white/[0.08] transition-all flex-shrink-0"
                    >
                      {copied === "url" ? "✓" : "Copy"}
                    </button>
                  </div>
                </div>

                {/* Refresh preview */}
                <button
                  onClick={() => {
                    if (iframeRef.current) {
                      iframeRef.current.src = playerUrl;
                    }
                  }}
                  className="w-full py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90 active:scale-[0.98]"
                  style={{ background: `linear-gradient(135deg, ${accentColor}, ${accentColor}90)`, color: "white", boxShadow: `0 4px 20px ${accentColor}25` }}
                >
                  ▶ Update Preview
                </button>
              </div>
            </div>
          </div>

          {/* Right Side — Preview + Embed */}
          <div className="xl:col-span-8 2xl:col-span-9 space-y-6">
            {/* Preview */}
            <div>
              <div className="mb-3 flex items-center gap-2">
                <span className="w-2 h-2 rounded-full animate-pulse" style={{ background: accentColor }} />
                <span className="text-[10px] text-white/40 font-semibold uppercase tracking-[0.15em]">Live Preview</span>
              </div>
              <div className="rounded-2xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/40" style={{ boxShadow: `0 0 80px ${accentColor}08` }}>
                <iframe
                  ref={iframeRef}
                  src={playerUrl}
                  className="w-full aspect-video"
                  allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                  allowFullScreen
                  style={{ border: 0 }}
                />
              </div>
            </div>

            {/* Embed Code Tabs */}
            <div className="bg-white/[0.02] border border-white/[0.07] rounded-2xl overflow-hidden">
              <div className="flex border-b border-white/[0.06] overflow-x-auto">
                {[
                  { key: "iframe" as const, label: "iframe", icon: "🌐" },
                  { key: "blogger" as const, label: "Blogger", icon: "📝" },
                  { key: "params" as const, label: "Parameters", icon: "⚙️" },
                  { key: "security" as const, label: "Security", icon: "🔒" },
                ].map((tab) => (
                  <button
                    key={tab.key}
                    onClick={() => setActiveTab(tab.key)}
                    className={`flex items-center gap-1.5 px-4 sm:px-5 py-3 text-xs sm:text-[13px] font-medium transition-all relative whitespace-nowrap ${activeTab === tab.key ? "text-white bg-white/[0.03]" : "text-white/35 hover:text-white/55"}`}
                  >
                    <span>{tab.icon}</span>
                    <span>{tab.label}</span>
                    {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-[2px]" style={{ background: accentColor }} />}
                  </button>
                ))}
              </div>

              <div className="p-4 sm:p-5">
                {(activeTab === "iframe" || activeTab === "blogger") && (
                  <div>
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                      <div>
                        <h3 className="text-sm font-semibold">
                          {activeTab === "iframe" ? "Universal Embed" : "Blogger Embed"}
                        </h3>
                        <p className="text-[11px] text-white/30 mt-0.5">
                          {activeTab === "iframe" ? "Works on any website" : "Paste in Blogger → HTML view"}
                        </p>
                      </div>
                      <button
                        onClick={() => copy(embedCode(activeTab), activeTab)}
                        className="flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-semibold transition-all hover:opacity-90"
                        style={{ background: `${accentColor}20`, color: accentColor, border: `1px solid ${accentColor}30` }}
                      >
                        {copied === activeTab ? "✓ Copied!" : "📋 Copy Code"}
                      </button>
                    </div>
                    <pre className="bg-black/40 border border-white/[0.07] rounded-xl p-4 overflow-x-auto text-[11px] sm:text-xs text-emerald-400/80 font-mono leading-relaxed whitespace-pre-wrap break-all">
                      {embedCode(activeTab)}
                    </pre>

                    {activeTab === "blogger" && (
                      <div className="mt-4 p-4 rounded-xl border" style={{ background: `${accentColor}06`, borderColor: `${accentColor}15` }}>
                        <h4 className="text-xs font-semibold mb-2 flex items-center gap-1.5" style={{ color: accentColor }}>
                          📋 Blogger Steps
                        </h4>
                        <ol className="text-[11px] text-white/45 space-y-1.5 list-decimal list-inside leading-relaxed">
                          <li>Open Blogger post editor</li>
                          <li>Switch to <strong className="text-white/60">HTML view</strong> (click <code className="px-1 rounded text-[10px]" style={{ background: `${accentColor}15`, color: accentColor }}>&lt;/&gt;</code>)</li>
                          <li>Paste the code where you want the player</li>
                          <li>Switch back to Compose view to verify</li>
                          <li>Publish — the player will be live!</li>
                        </ol>
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "params" && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1">URL Parameters</h3>
                    <p className="text-[11px] text-white/30 mb-4">
                      Append these to your player URL: <code className="font-mono px-1 rounded text-[10px]" style={{ background: `${accentColor}15`, color: accentColor }}>{baseUrl}?v=ID&amp;color=#8b5cf6</code>
                    </p>
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs">
                        <thead>
                          <tr className="border-b border-white/[0.08]">
                            <th className="text-left py-2.5 px-3 text-white/40 font-medium">Param</th>
                            <th className="text-left py-2.5 px-3 text-white/40 font-medium">Type</th>
                            <th className="text-left py-2.5 px-3 text-white/40 font-medium">Default</th>
                            <th className="text-left py-2.5 px-3 text-white/40 font-medium">Description</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/[0.05]">
                          {[
                            { p: "v", t: "string", d: "—", desc: "Mux Playback ID (required). Aliases: id, playback_id" },
                            { p: "color", t: "hex", d: "#8b5cf6", desc: "Accent color for controls. Alias: accent" },
                            { p: "title", t: "string", d: "(none)", desc: "Video title in top-left overlay" },
                            { p: "autoplay", t: "1 | true", d: "false", desc: "Autoplay video (muted per browser policy)" },
                            { p: "poster", t: "number", d: "5", desc: "Poster thumbnail time in seconds" },
                            { p: "loop", t: "1 | true", d: "false", desc: "Loop video on end" },
                          ].map((r) => (
                            <tr key={r.p} className="hover:bg-white/[0.02]">
                              <td className="py-2.5 px-3 font-mono" style={{ color: accentColor }}>{r.p}</td>
                              <td className="py-2.5 px-3 text-white/40">{r.t}</td>
                              <td className="py-2.5 px-3 text-white/30 font-mono">{r.d}</td>
                              <td className="py-2.5 px-3 text-white/50">{r.desc}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeTab === "security" && (
                  <div>
                    <h3 className="text-sm font-semibold mb-1 flex items-center gap-2">
                      🔒 Domain Guard
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${enforcing ? "bg-emerald-500/15 text-emerald-400" : "bg-amber-500/15 text-amber-400"}`}>
                        {enforcing ? "ACTIVE" : "DISABLED"}
                      </span>
                    </h3>
                    <p className="text-[11px] text-white/30 mb-4">
                      Restrict which domains can embed and play your videos.
                    </p>

                    <div className="bg-black/30 border border-white/[0.07] rounded-xl p-4 mb-4">
                      <h4 className="text-xs font-semibold text-white/60 mb-3">Current Allowed Domains</h4>
                      {allowedDomains.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {allowedDomains.map((d) => (
                            <span key={d} className="px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/15 text-emerald-400 text-[11px] font-mono font-medium">
                              {d}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-white/30 italic">No domains configured</p>
                      )}
                    </div>

                    <div className="bg-black/30 border border-white/[0.07] rounded-xl p-4">
                      <h4 className="text-xs font-semibold text-white/60 mb-2">How to Configure</h4>
                      <p className="text-[11px] text-white/35 leading-relaxed mb-3">
                        Edit <code className="font-mono px-1 rounded bg-white/5 text-white/50">src/App.tsx</code> and modify these values:
                      </p>
                      <pre className="bg-[#0a0a12] border border-white/[0.06] rounded-lg p-3 text-[11px] font-mono leading-relaxed overflow-x-auto">
                        <span className="text-blue-400">{"const"}</span> <span className="text-white">ALLOWED_DOMAINS</span> <span className="text-white/40">=</span> <span className="text-amber-300">[</span>{"\n"}
                        {"  "}<span className="text-emerald-400">{'"yourblog.blogspot.com"'}</span><span className="text-white/40">,</span>{"\n"}
                        {"  "}<span className="text-emerald-400">{'"www.yourcustomdomain.com"'}</span><span className="text-white/40">,</span>{"\n"}
                        <span className="text-amber-300">]</span><span className="text-white/40">;</span>{"\n\n"}
                        <span className="text-blue-400">{"const"}</span> <span className="text-white">ENFORCE_DOMAIN_CHECK</span> <span className="text-white/40">=</span> <span className="text-amber-300">true</span><span className="text-white/40">;</span>
                      </pre>
                    </div>

                    <div className="mt-4 p-4 rounded-xl bg-amber-500/[0.06] border border-amber-500/15">
                      <h4 className="text-xs font-semibold text-amber-400 mb-2">⚠️ Important Notes</h4>
                      <ul className="text-[11px] text-white/40 space-y-1.5 list-disc list-inside leading-relaxed">
                        <li>Domain check uses <code className="text-white/50 bg-white/5 px-1 rounded text-[10px]">document.referrer</code> for iframe embeds</li>
                        <li>Subdomains are automatically allowed (e.g. adding <code className="text-white/50 bg-white/5 px-1 rounded text-[10px]">example.com</code> also allows <code className="text-white/50 bg-white/5 px-1 rounded text-[10px]">blog.example.com</code>)</li>
                        <li>Blocked domains see a security message instead of the player</li>
                        <li>Set <code className="text-white/50 bg-white/5 px-1 rounded text-[10px]">ENFORCE_DOMAIN_CHECK = true</code> in production</li>
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Features Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { icon: "🎬", title: "HLS Adaptive", desc: "Auto quality switching based on network speed" },
                { icon: "🖼️", title: "Storyboard Scrub", desc: "Sprite-sheet previews — 1 request, zero latency on hover" },
                { icon: "🔒", title: "Domain Guard", desc: "Restrict playback to your authorized domains" },
                { icon: "📱", title: "Mobile Ready", desc: "Touch gestures, double-tap seek, responsive UI" },
                { icon: "⌨️", title: "Keyboard Nav", desc: "Space, K, F, M, arrows — full keyboard control" },
                { icon: "⚡", title: "Optimized", desc: "Storyboard preload, zero hover requests, minimal bandwidth" },
              ].map((f) => (
                <div key={f.title} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4 hover:bg-white/[0.04] hover:border-white/[0.1] transition-all duration-300 group">
                  <div className="text-xl mb-2 group-hover:scale-110 transition-transform duration-300 inline-block">{f.icon}</div>
                  <h3 className="text-[13px] font-semibold text-white/80 mb-0.5">{f.title}</h3>
                  <p className="text-[11px] text-white/30 leading-relaxed">{f.desc}</p>
                </div>
              ))}
            </div>

            {/* Keyboard shortcuts */}
            <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
              <h3 className="text-sm font-semibold text-white/80 mb-4">⌨️ Keyboard Shortcuts</h3>
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                {[
                  { key: "Space / K", act: "Play/Pause" },
                  { key: "F", act: "Fullscreen" },
                  { key: "M", act: "Mute" },
                  { key: "←", act: "−10 sec" },
                  { key: "→", act: "+10 sec" },
                  { key: "↑ / ↓", act: "Volume" },
                ].map((s) => (
                  <div key={s.key} className="text-center">
                    <kbd className="inline-block px-3 py-1.5 rounded-lg text-[11px] font-mono font-semibold text-white/60 border transition-colors" style={{ background: "rgba(255,255,255,0.03)", borderColor: "rgba(255,255,255,0.08)" }}>
                      {s.key}
                    </kbd>
                    <p className="text-[10px] text-white/30 mt-1.5">{s.act}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.05] mt-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p className="text-[11px] text-white/20">CineStream — Ultra-Pro Embeddable Video Player</p>
          <p className="text-[11px] text-white/15">Mux HLS • Domain Protected • Zero Config</p>
        </div>
      </footer>

      <style>{`
        .cs-label {
          display: block;
          font-size: 11px;
          color: rgba(255,255,255,0.45);
          margin-bottom: 6px;
          font-weight: 600;
        }
        .cs-input {
          width: 100%;
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.08);
          border-radius: 10px;
          padding: 9px 12px;
          font-size: 13px;
          color: white;
          outline: none;
          transition: all 0.2s;
        }
        .cs-input::placeholder { color: rgba(255,255,255,0.15); }
        .cs-input:focus {
          border-color: ${accentColor}50;
          box-shadow: 0 0 0 3px ${accentColor}12;
        }
      `}</style>
    </div>
  );
}
