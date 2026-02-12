function TypingFeed({ typingEntries }) {
  if (!typingEntries.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ocean/30 bg-sand/80 px-3 py-4 text-sm text-ink/65">
        No one is typing right now.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {typingEntries.map((entry) => (
        <article
          key={entry.socketId}
          className="rounded-xl border border-ocean/20 bg-sand px-3 py-3 shadow-sm"
        >
          <div className="mb-1 flex items-center justify-between text-xs uppercase tracking-[0.16em] text-ocean/70">
            <span>{entry.name || "Guest"}</span>
            <span>typing live</span>
          </div>
          <p className="font-mono text-sm leading-relaxed text-ink/90">
            {entry.draft || "..."}
            <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-ocean align-[-2px]" />
          </p>
        </article>
      ))}
    </div>
  );
}

export default TypingFeed;
