import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import HeaderBar from "./components/HeaderBar";
import MessageList from "./components/MessageList";
import TypingFeed from "./components/TypingFeed";

const MAX_TEXT_LENGTH = 500;
const TYPING_STALE_AFTER_MS = 2500;
const MESSAGE_LIMIT = 200;

const socketUrl = import.meta.env.VITE_SERVER_URL
  || (import.meta.env.DEV ? "http://localhost:3000" : window.location.origin);

function sanitizeName(raw) {
  return String(raw || "").slice(0, 40).trim() || "Guest";
}

function sanitizeText(raw) {
  return String(raw || "").slice(0, MAX_TEXT_LENGTH);
}

function App() {
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("instantly:displayName") || ""
  );
  const [draft, setDraft] = useState("");
  const [messages, setMessages] = useState([]);
  const [typingBySocket, setTypingBySocket] = useState({});
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const currentNameRef = useRef(sanitizeName(displayName));

  const typingEntries = useMemo(
    () =>
      Object.values(typingBySocket).sort(
        (left, right) => right.updatedAt - left.updatedAt
      ),
    [typingBySocket]
  );

  useEffect(() => {
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("chat:set_name", { name: currentNameRef.current });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("chat:message", (message) => {
      setMessages((prev) => [...prev.slice(-MESSAGE_LIMIT + 1), message]);
    });

    socket.on("chat:typing", (payload) => {
      const socketId = String(payload?.socketId || "");
      if (!socketId) {
        return;
      }

      const incoming = {
        socketId,
        name: sanitizeName(payload?.name),
        draft: sanitizeText(payload?.draft),
        updatedAt: Number(payload?.updatedAt || Date.now())
      };

      setTypingBySocket((prev) => {
        if (!incoming.draft.trim()) {
          if (!prev[socketId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[socketId];
          return next;
        }

        return {
          ...prev,
          [socketId]: incoming
        };
      });
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  useEffect(() => {
    const normalized = sanitizeName(displayName);
    currentNameRef.current = normalized;
    localStorage.setItem("instantly:displayName", displayName);
    socketRef.current?.emit("chat:set_name", { name: normalized });
  }, [displayName]);

  useEffect(() => {
    const cleanup = window.setInterval(() => {
      const now = Date.now();
      setTypingBySocket((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [socketId, entry] of Object.entries(prev)) {
          if (now - entry.updatedAt > TYPING_STALE_AFTER_MS) {
            delete next[socketId];
            changed = true;
          }
        }
        return changed ? next : prev;
      });
    }, 500);

    return () => {
      window.clearInterval(cleanup);
    };
  }, []);

  const broadcastTyping = (nextDraft) => {
    const socket = socketRef.current;
    if (!socket) {
      return;
    }
    socket.emit("chat:typing", {
      name: currentNameRef.current,
      draft: sanitizeText(nextDraft)
    });
  };

  const handleNameChange = (event) => {
    setDisplayName(event.target.value);
  };

  const handleDraftChange = (event) => {
    const nextDraft = sanitizeText(event.target.value);
    setDraft(nextDraft);
    broadcastTyping(nextDraft);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = sanitizeText(draft);
    if (!text.trim()) {
      return;
    }

    socketRef.current?.emit("chat:message", {
      name: currentNameRef.current,
      text
    });
    setDraft("");
    broadcastTyping("");
  };

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-6xl flex-col gap-4 px-3 py-5 md:gap-5 md:px-6 md:py-7">
      <HeaderBar
        displayName={displayName}
        onNameChange={handleNameChange}
        isConnected={isConnected}
        socketUrl={socketUrl}
      />

      <section className="grid flex-1 grid-cols-1 gap-4 lg:grid-cols-[1.45fr_1fr]">
        <div className="glass-panel flex min-h-[420px] flex-col gap-3 p-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Message Timeline</h2>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink/55">
              {messages.length} stored
            </span>
          </div>

          <div className="min-h-[260px] flex-1">
            <MessageList messages={messages} />
          </div>

          <form
            className="rounded-2xl border border-ocean/30 bg-white/80 p-3"
            onSubmit={handleSubmit}
          >
            <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.18em] text-ink/70">
              Your message
            </label>
            <textarea
              value={draft}
              onChange={handleDraftChange}
              maxLength={MAX_TEXT_LENGTH}
              rows={3}
              placeholder="Type a message. Other users can watch every character live."
              className="w-full resize-none rounded-xl border border-ocean/25 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ocean/70"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-xs text-ink/60">
                {draft.length}/{MAX_TEXT_LENGTH}
              </span>
              <button
                type="submit"
                className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ocean"
              >
                Send
              </button>
            </div>
          </form>
        </div>

        <aside className="glass-panel min-h-[420px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">Live Typing Feed</h2>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink/55">
              {typingEntries.length} active
            </span>
          </div>
          <TypingFeed typingEntries={typingEntries} />
        </aside>
      </section>
    </div>
  );
}

export default App;
