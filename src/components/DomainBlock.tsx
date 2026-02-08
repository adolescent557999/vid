interface DomainBlockProps {
  domain: string;
}

export function DomainBlock({ domain }: DomainBlockProps) {
  return (
    <div className="w-full h-full bg-[#05050a] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        {/* Shield icon */}
        <div className="mx-auto w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-6">
          <svg className="w-10 h-10 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M12 8v4M12 16h.01" strokeLinecap="round" />
          </svg>
        </div>

        <h1 className="text-xl font-bold text-white mb-2">
          Playback Restricted
        </h1>
        <p className="text-sm text-white/40 mb-6 leading-relaxed">
          This video player is not authorized to play on
          <span className="block mt-1 font-mono text-red-400/80 text-xs bg-red-500/10 px-3 py-1.5 rounded-lg inline-block">
            {domain || "this domain"}
          </span>
        </p>

        <div className="bg-white/[0.03] border border-white/[0.08] rounded-xl p-4">
          <p className="text-xs text-white/30 leading-relaxed">
            The site owner has restricted video playback to authorized domains only. 
            If you are the owner, add this domain to the <code className="text-white/50 bg-white/5 px-1 rounded">ALLOWED_DOMAINS</code> list in your player configuration.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-center gap-2 text-[10px] text-white/20">
          <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4z" />
          </svg>
          Protected by CineStream Domain Guard
        </div>
      </div>
    </div>
  );
}
