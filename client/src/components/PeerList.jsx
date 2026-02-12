function PeerList({
  peers,
  activePeerId,
  onSelectPeer,
  messagesByPeer,
  typingByPeer
}) {
  if (!peers.length) {
    return (
      <div className="rounded-2xl border border-dashed border-ocean/30 bg-sand/80 px-3 py-4 text-sm text-ink/65">
        No other users yet. Open a second browser tab to chat 1-on-1.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {peers.map((peer) => {
        const isActive = peer.userId === activePeerId;
        const lastMessage = (messagesByPeer[peer.userId] || []).at(-1);
        const typingState = typingByPeer[peer.userId];

        return (
          <button
            type="button"
            key={peer.userId}
            onClick={() => onSelectPeer(peer.userId)}
            className={`w-full rounded-xl border px-3 py-3 text-left transition ${
              isActive
                ? "border-ocean bg-white shadow-sm"
                : "border-ocean/20 bg-white/65 hover:border-ocean/50 hover:bg-white/85"
            }`}
          >
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="truncate text-sm font-semibold text-ink">
                {peer.name}
              </span>
              <span
                className={`rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-[0.16em] ${
                  peer.online
                    ? "bg-mint/35 text-ocean"
                    : "bg-ink/10 text-ink/55"
                }`}
              >
                {peer.online ? "online" : "offline"}
              </span>
            </div>
            <p className="truncate font-mono text-xs text-ink/60">
              {typingState?.draft
                ? `${peer.name} is typing...`
                : lastMessage?.text || "No messages yet"}
            </p>
          </button>
        );
      })}
    </div>
  );
}

export default PeerList;
