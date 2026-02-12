import { formatTime } from "../lib/time";

function MessageList({ messages }) {
  if (!messages.length) {
    return (
      <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-ocean/30 bg-white/40 p-8 text-center text-sm text-ink/65">
        Start typing. Messages will stream here for everyone in real time.
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto rounded-2xl border border-ocean/20 bg-white/55 p-3">
      <ul className="space-y-3">
        {messages.map((message) => (
          <li
            key={message.id}
            className="rounded-xl border border-ocean/10 bg-white/90 px-3 py-2 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="font-semibold text-ink">{message.name}</span>
              <span className="font-mono text-xs text-ink/50">
                {formatTime(message.createdAt)}
              </span>
            </div>
            <p className="mt-1 break-words text-sm leading-relaxed text-ink/90">
              {message.text}
            </p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default MessageList;
