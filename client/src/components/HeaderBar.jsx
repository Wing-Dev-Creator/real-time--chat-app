function HeaderBar({ displayName, onNameChange, isConnected, socketUrl }) {
  return (
    <header className="glass-panel relative overflow-hidden px-5 py-4">
      <div className="absolute -right-16 -top-14 h-40 w-40 rounded-full bg-mint/25 blur-2xl" />
      <div className="absolute -left-20 bottom-0 h-40 w-40 rounded-full bg-ocean/20 blur-3xl" />

      <div className="relative z-10 flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-[0.25em] text-ocean/70">
            Instantly
          </p>
          <h1 className="text-2xl font-bold text-ink md:text-3xl">
            Live character chat stream
          </h1>
          <p className="mt-1 text-sm text-ink/70">
            Everyone sees every keystroke as it lands.
          </p>
        </div>

        <div className="w-full max-w-sm space-y-2">
          <label className="block text-xs font-semibold uppercase tracking-[0.2em] text-ink/70">
            Display name
          </label>
          <input
            className="w-full rounded-xl border border-ocean/20 bg-white/85 px-3 py-2 text-sm text-ink outline-none ring-0 transition focus:border-ocean/70 focus:bg-white"
            value={displayName}
            onChange={onNameChange}
            maxLength={40}
            placeholder="Guest"
          />
          <div className="flex items-center justify-between text-xs text-ink/65">
            <span>
              {isConnected ? "Connected to server" : "Reconnecting..."}
            </span>
            <code className="font-mono">{socketUrl}</code>
          </div>
        </div>
      </div>
    </header>
  );
}

export default HeaderBar;
