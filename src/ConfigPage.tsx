import { useState } from "react";

const DEFAULT_PLAYBACK_ID = "LGAf9w4FW2bkiMhgcjPAV4qhGEaCisxMbPVM8IJevkE";

export function ConfigPage() {
  const [playbackId, setPlaybackId] = useState(DEFAULT_PLAYBACK_ID);
  const [accentColor, setAccentColor] = useState("#6366f1");
  const [videoTitle, setVideoTitle] = useState("");
  const [autoplay, setAutoplay] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"iframe" | "blogger" | "options">("iframe");

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "https://your-app.onrender.com";

  // Build the player URL
  const buildPlayerUrl = () => {
    const params = new URLSearchParams();
    params.set("v", playbackId);
    if (accentColor !== "#6366f1") params.set("color", accentColor);
    if (videoTitle) params.set("title", videoTitle);
    if (autoplay) params.set("autoplay", "1");
    return `${baseUrl}?${params.toString()}`;
  };

  const playerUrl = buildPlayerUrl();
  const previewUrl = buildPlayerUrl();

  const getEmbedCode = (type: "iframe" | "blogger") => {
    if (type === "iframe") {
      return `<iframe
  src="${playerUrl}"
  width="100%"
  height="450"
  frameborder="0"
  allow="autoplay; fullscreen; picture-in-picture"
  allowfullscreen
  style="border:0; border-radius:12px; max-width:800px; aspect-ratio:16/9;">
</iframe>`;
    }
    // Blogger-specific (iframe wrapped for Blogger HTML editor)
    return `<!-- StreamVault Video Player - Paste in Blogger HTML view -->
<div style="max-width:800px; margin:20px auto;">
  <iframe
    src="${playerUrl}"
    width="100%"
    height="450"
    frameborder="0"
    allow="autoplay; fullscreen; picture-in-picture"
    allowfullscreen
    style="border:0; border-radius:12px; aspect-ratio:16/9; width:100%;">
  </iframe>
</div>`;
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    });
  };

  return (
    <div className="min-h-screen bg-[#08080c] text-white overflow-y-auto" style={{ fontFamily: "'Inter', system-ui, sans-serif" }}>
      {/* Ambient background */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-200px] left-[20%] w-[600px] h-[600px] bg-indigo-600/[0.06] rounded-full blur-[120px]" />
        <div className="absolute bottom-[-200px] right-[20%] w-[500px] h-[500px] bg-purple-600/[0.04] rounded-full blur-[100px]" />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-black/30 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center shadow-lg shadow-indigo-500/25">
              <svg className="w-5 h-5 text-white" viewBox="0 0 24 24" fill="currentColor">
                <path d="M8 5v14l11-7z" />
              </svg>
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight">StreamVault</h1>
              <p className="text-[10px] tracking-[0.2em] uppercase text-indigo-400/80 font-medium">
                Embeddable Player
              </p>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-xs text-emerald-400 font-medium">Ready to Embed</span>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-4 sm:px-6 py-8">
        {/* Hero */}
        <div className="text-center mb-10">
          <h2 className="text-3xl sm:text-4xl font-bold mb-3 bg-gradient-to-r from-white via-white to-white/60 bg-clip-text text-transparent">
            Professional Video Player
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm sm:text-base leading-relaxed">
            Embed a professional HLS video player on any website — Blogger, WordPress, or plain HTML.
            Configure below, copy the embed code, and paste it on your site.
          </p>
        </div>

        {/* Main Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          {/* Config Panel */}
          <div className="lg:col-span-1">
            <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5 space-y-5 sticky top-6">
              <div>
                <h3 className="text-sm font-semibold text-white mb-1 flex items-center gap-2">
                  <svg className="w-4 h-4 text-indigo-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                  Configuration
                </h3>
                <p className="text-[11px] text-white/35">Customize your embed below</p>
              </div>

              {/* Playback ID */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Mux Playback ID</label>
                <input
                  type="text"
                  value={playbackId}
                  onChange={(e) => setPlaybackId(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white font-mono placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                  placeholder="Enter Mux Playback ID"
                />
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Video Title (optional)</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white placeholder-white/20 focus:outline-none focus:border-indigo-500/50 focus:ring-1 focus:ring-indigo-500/25 transition-all"
                  placeholder="e.g. My Awesome Video"
                />
              </div>

              {/* Accent Color */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Accent Color</label>
                <div className="flex items-center gap-3">
                  <input
                    type="color"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="w-10 h-10 rounded-lg border border-white/10 cursor-pointer bg-transparent [&::-webkit-color-swatch-wrapper]:p-[2px] [&::-webkit-color-swatch]:border-none [&::-webkit-color-swatch]:rounded-md"
                  />
                  <input
                    type="text"
                    value={accentColor}
                    onChange={(e) => setAccentColor(e.target.value)}
                    className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-indigo-500/50 transition-all"
                  />
                </div>
              </div>

              {/* Presets */}
              <div>
                <label className="block text-xs text-white/50 mb-2 font-medium">Color Presets</label>
                <div className="flex gap-2 flex-wrap">
                  {["#6366f1", "#8b5cf6", "#ec4899", "#ef4444", "#f59e0b", "#10b981", "#06b6d4", "#3b82f6"].map((c) => (
                    <button
                      key={c}
                      onClick={() => setAccentColor(c)}
                      className={`w-8 h-8 rounded-lg border-2 transition-all duration-200 ${accentColor === c ? "border-white scale-110" : "border-transparent hover:border-white/30"}`}
                      style={{ background: c }}
                    />
                  ))}
                </div>
              </div>

              {/* Autoplay */}
              <div className="flex items-center justify-between">
                <label className="text-xs text-white/50 font-medium">Autoplay (muted)</label>
                <button
                  onClick={() => setAutoplay(!autoplay)}
                  className={`relative w-11 h-6 rounded-full transition-all duration-300 ${autoplay ? "bg-indigo-500" : "bg-white/10"}`}
                >
                  <span
                    className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow-md transition-transform duration-300 ${autoplay ? "translate-x-5" : ""}`}
                  />
                </button>
              </div>

              {/* Direct Link */}
              <div>
                <label className="block text-xs text-white/50 mb-1.5 font-medium">Direct Player URL</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={playerUrl}
                    readOnly
                    className="flex-1 bg-white/[0.05] border border-white/[0.1] rounded-lg px-3 py-2 text-xs text-white/70 font-mono focus:outline-none truncate"
                  />
                  <button
                    onClick={() => copyToClipboard(playerUrl, "url")}
                    className="px-3 py-2 rounded-lg bg-white/5 border border-white/10 text-xs text-white/60 hover:bg-white/10 transition-colors whitespace-nowrap"
                  >
                    {copied === "url" ? "✓" : "Copy"}
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Preview */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-white/50 font-medium uppercase tracking-wider">Live Preview</span>
            </div>
            <div className="rounded-xl overflow-hidden border border-white/[0.08] shadow-2xl shadow-black/50">
              <iframe
                src={previewUrl}
                className="w-full aspect-video"
                allow="autoplay; fullscreen; picture-in-picture"
                allowFullScreen
                style={{ border: 0 }}
              />
            </div>
            <p className="text-[11px] text-white/25 mt-2 text-center">
              This is a live preview. The same URL works in any iframe embed.
            </p>
          </div>
        </div>

        {/* Embed Code Tabs */}
        <div className="bg-white/[0.03] border border-white/[0.08] rounded-2xl overflow-hidden">
          <div className="flex border-b border-white/[0.08]">
            {[
              { key: "iframe" as const, label: "🌐 iframe Embed", desc: "Universal embed code" },
              { key: "blogger" as const, label: "📝 Blogger", desc: "For Blogger HTML editor" },
              { key: "options" as const, label: "⚙️ URL Parameters", desc: "All options" },
            ].map((tab) => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                className={`flex-1 px-4 py-3.5 text-sm font-medium transition-all relative ${activeTab === tab.key ? "text-white bg-white/[0.05]" : "text-white/40 hover:text-white/60 hover:bg-white/[0.02]"}`}
              >
                <span>{tab.label}</span>
                <span className="block text-[10px] text-white/30 mt-0.5">{tab.desc}</span>
                {activeTab === tab.key && <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-indigo-500" />}
              </button>
            ))}
          </div>

          <div className="p-5">
            {activeTab === "iframe" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">iframe Embed Code</h3>
                    <p className="text-[11px] text-white/40 mt-0.5">Works on any website — WordPress, Wix, Squarespace, custom HTML</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getEmbedCode("iframe"), "iframe")}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-medium hover:bg-indigo-500/25 transition-all"
                  >
                    {copied === "iframe" ? "✓ Copied!" : "📋 Copy Code"}
                  </button>
                </div>
                <pre className="bg-black/50 border border-white/[0.08] rounded-xl p-4 overflow-x-auto text-xs text-emerald-400/90 font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {getEmbedCode("iframe")}
                </pre>
              </div>
            )}

            {activeTab === "blogger" && (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Blogger Embed Code</h3>
                    <p className="text-[11px] text-white/40 mt-0.5">Paste in Blogger's HTML editor</p>
                  </div>
                  <button
                    onClick={() => copyToClipboard(getEmbedCode("blogger"), "blogger")}
                    className="flex items-center gap-2 px-3.5 py-2 rounded-lg bg-indigo-500/15 border border-indigo-500/25 text-indigo-400 text-xs font-medium hover:bg-indigo-500/25 transition-all"
                  >
                    {copied === "blogger" ? "✓ Copied!" : "📋 Copy Code"}
                  </button>
                </div>
                <pre className="bg-black/50 border border-white/[0.08] rounded-xl p-4 overflow-x-auto text-xs text-emerald-400/90 font-mono leading-relaxed whitespace-pre-wrap break-all">
                  {getEmbedCode("blogger")}
                </pre>

                <div className="mt-4 p-4 bg-amber-500/[0.07] border border-amber-500/20 rounded-xl">
                  <h4 className="text-xs font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    Step-by-Step for Blogger
                  </h4>
                  <ol className="text-xs text-white/50 space-y-1.5 list-decimal list-inside">
                    <li>Open your Blogger post editor</li>
                    <li>Click the <strong className="text-white/70">HTML view</strong> button (looks like <code className="text-amber-400/80 bg-amber-500/10 px-1 rounded">&lt;/&gt;</code>)</li>
                    <li>Paste the code above where you want the player to appear</li>
                    <li>Switch back to <strong className="text-white/70">Compose view</strong> — you'll see a placeholder</li>
                    <li>Publish your post — the player will work live!</li>
                  </ol>
                </div>

                <div className="mt-4 p-4 bg-indigo-500/[0.07] border border-indigo-500/20 rounded-xl">
                  <h4 className="text-xs font-semibold text-indigo-400 mb-2">💡 To change the video</h4>
                  <p className="text-xs text-white/50 leading-relaxed">
                    Just change the <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">v=</code> parameter in the iframe URL
                    to a different Mux Playback ID. Everything else stays the same!
                  </p>
                </div>
              </div>
            )}

            {activeTab === "options" && (
              <div>
                <h3 className="text-sm font-semibold text-white mb-1">URL Parameters</h3>
                <p className="text-[11px] text-white/40 mb-4">
                  Add these to the player URL: <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">{baseUrl}?v=PLAYBACK_ID&amp;color=#6366f1</code>
                </p>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-b border-white/10">
                        <th className="text-left py-2.5 px-3 text-white/50 font-medium">Parameter</th>
                        <th className="text-left py-2.5 px-3 text-white/50 font-medium">Type</th>
                        <th className="text-left py-2.5 px-3 text-white/50 font-medium">Default</th>
                        <th className="text-left py-2.5 px-3 text-white/50 font-medium">Description</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/[0.06]">
                      {[
                        { param: "v", type: "string", def: "—", desc: "Mux Playback ID (required). Also accepts 'id' or 'playback_id'" },
                        { param: "color", type: "hex", def: "#6366f1", desc: "Accent color for progress bar & buttons. Also accepts 'accent'" },
                        { param: "title", type: "string", def: "(none)", desc: "Video title displayed in top-left corner" },
                        { param: "autoplay", type: "1 / true", def: "false", desc: "Autoplay video (muted, per browser policy)" },
                        { param: "poster", type: "number", def: "10", desc: "Poster thumbnail time in seconds" },
                        { param: "loop", type: "1 / true", def: "false", desc: "Loop video playback" },
                      ].map((row) => (
                        <tr key={row.param} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-mono text-indigo-400">{row.param}</td>
                          <td className="py-2.5 px-3 text-white/50">{row.type}</td>
                          <td className="py-2.5 px-3 text-white/40 font-mono">{row.def}</td>
                          <td className="py-2.5 px-3 text-white/60">{row.desc}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                <div className="mt-5 p-4 bg-indigo-500/[0.07] border border-indigo-500/20 rounded-xl">
                  <h4 className="text-xs font-semibold text-indigo-400 mb-2">Example: Multiple Videos on One Page</h4>
                  <pre className="text-[11px] text-white/60 font-mono leading-relaxed whitespace-pre-wrap">{`<!-- Video 1 -->
<iframe src="${baseUrl}?v=VIDEO_ID_1&title=First Video" width="100%" height="450" frameborder="0" allowfullscreen style="aspect-ratio:16/9;border:0;border-radius:12px;max-width:800px;"></iframe>

<!-- Video 2 -->
<iframe src="${baseUrl}?v=VIDEO_ID_2&title=Second Video&color=#ec4899" width="100%" height="450" frameborder="0" allowfullscreen style="aspect-ratio:16/9;border:0;border-radius:12px;max-width:800px;"></iframe>`}</pre>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-10 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { icon: "🎬", title: "HLS Streaming", desc: "Adaptive bitrate streaming with HLS.js for smooth playback" },
            { icon: "🖼️", title: "Thumbnail Scrub", desc: "Frame-accurate thumbnail previews when scrubbing the progress bar" },
            { icon: "📦", title: "Zero Dependencies", desc: "Just paste an iframe — no extra scripts, libraries, or build tools needed" },
            { icon: "🎨", title: "Fully Customizable", desc: "Change colors, title, poster time and more via simple URL parameters" },
          ].map((f) => (
            <div key={f.title} className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4 hover:bg-white/[0.05] hover:border-white/[0.12] transition-all">
              <div className="text-2xl mb-2">{f.icon}</div>
              <h3 className="text-sm font-semibold text-white mb-1">{f.title}</h3>
              <p className="text-xs text-white/40 leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>

        {/* Keyboard Shortcuts */}
        <div className="mt-8 bg-white/[0.03] border border-white/[0.08] rounded-2xl p-5">
          <h3 className="text-sm font-semibold text-white mb-4">⌨️ Keyboard Shortcuts (in player)</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { key: "Space / K", action: "Play/Pause" },
              { key: "F", action: "Fullscreen" },
              { key: "M", action: "Mute" },
              { key: "←", action: "Back 10s" },
              { key: "→", action: "Forward 10s" },
              { key: "↑ / ↓", action: "Volume" },
            ].map((s) => (
              <div key={s.key} className="text-center">
                <kbd className="inline-block px-2.5 py-1.5 bg-white/[0.06] border border-white/[0.12] rounded-lg text-xs text-white font-mono mb-1">
                  {s.key}
                </kbd>
                <p className="text-[10px] text-white/40">{s.action}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-white/[0.06] mt-12">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="text-xs text-white/25">StreamVault — Professional Embeddable Video Player</p>
          <div className="flex items-center gap-4 text-xs text-white/25">
            <span>Powered by Mux + HLS.js</span>
            <span className="text-white/10">•</span>
            <span>Host anywhere — Render, Vercel, Netlify</span>
          </div>
        </div>
      </footer>
    </div>
  );
}
