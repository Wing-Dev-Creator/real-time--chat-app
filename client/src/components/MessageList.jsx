import { formatTime } from "../lib/time";
import { useEffect, useRef } from "react";

function MessageList({ messages, selfUserId, activePeer, activeTyping }) {
  const listRef = useRef(null);

  useEffect(() => {
    if (!listRef.current) {
      return;
    }
    listRef.current.scrollTop = listRef.current.scrollHeight;
  }, [messages, activeTyping]);

  if (!activePeer) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-ocean/30 bg-white/40 p-8 text-center text-sm text-ink/65">
        Select someone from the right panel to start a 1-on-1 chat.
      </div>
    );
  }

  if (!messages.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-ocean/30 bg-white/40 p-8 text-center text-sm text-ink/65">
        No messages with {activePeer.name} yet. Send the first one.
      </div>
    );
  }

  return (
    <div
      ref={listRef}
      className="h-full overflow-y-auto rounded-2xl border border-ocean/20 bg-white/55 p-3"
    >
      <ul className="space-y-3">
        {messages.map((message) => {
          const isMine = message.fromUserId === selfUserId;
          return (
            <li
              key={message.id}
              className={`flex ${isMine ? "justify-end" : "justify-start"}`}
            >
              <article
                className={`max-w-[88%] rounded-2xl px-3 py-2 shadow-sm ${
                  isMine
                    ? "bg-ink text-white"
                    : "border border-ocean/10 bg-white text-ink"
                }`}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <span
                    className={`text-xs font-semibold uppercase tracking-[0.14em] ${
                      isMine ? "text-white/75" : "text-ocean/80"
                    }`}
                  >
                    {isMine ? "You" : message.fromName}
                  </span>
                  <span
                    className={`font-mono text-[11px] ${
                      isMine ? "text-white/65" : "text-ink/50"
                    }`}
                  >
                    {formatTime(message.createdAt)}
                  </span>
                </div>
                <p className="break-words text-sm leading-relaxed">
                  {message.text}
                </p>
              </article>
            </li>
          );
        })}
        {activeTyping?.draft ? (
          <li className="flex justify-start">
            <article className="max-w-[88%] rounded-2xl border border-ocean/10 bg-sand px-3 py-2 shadow-sm">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-semibold uppercase tracking-[0.14em] text-ocean/75">
                  {activeTyping.fromName}
                </span>
                <span className="font-mono text-[11px] text-ink/50">
                  typing
                </span>
              </div>
              <p className="break-words font-mono text-sm leading-relaxed text-ink/90">
                {activeTyping.draft}
                <span className="ml-0.5 inline-block h-4 w-[2px] animate-pulse bg-ocean align-[-2px]" />
              </p>
            </article>
          </li>
        ) : null}
      </ul>
    </div>
  );
}

export default MessageList;
