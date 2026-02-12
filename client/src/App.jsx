import { useEffect, useMemo, useRef, useState } from "react";
import { io } from "socket.io-client";
import HeaderBar from "./components/HeaderBar";
import MessageList from "./components/MessageList";
import PeerList from "./components/PeerList";

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

function sanitizeUserId(raw) {
  return String(raw || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 48);
}

function createUserId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return `user_${crypto.randomUUID().replace(/-/g, "").slice(0, 16)}`;
  }
  return `user_${Math.random().toString(16).slice(2, 18)}`;
}

function App() {
  const [displayName, setDisplayName] = useState(
    () => localStorage.getItem("instantly:displayName") || ""
  );
  const [localUserId, setLocalUserId] = useState(
    () => sanitizeUserId(localStorage.getItem("instantly:userId")) || createUserId()
  );
  const [selfUserId, setSelfUserId] = useState("");
  const [draft, setDraft] = useState("");
  const [messagesByPeer, setMessagesByPeer] = useState({});
  const [typingByPeer, setTypingByPeer] = useState({});
  const [presenceUsers, setPresenceUsers] = useState([]);
  const [activePeerId, setActivePeerId] = useState("");
  const [isConnected, setIsConnected] = useState(false);
  const socketRef = useRef(null);
  const currentNameRef = useRef(sanitizeName(displayName) || "Guest");
  const currentUserIdRef = useRef(localUserId);

  const peers = useMemo(
    () =>
      presenceUsers
        .filter((user) => user.userId !== selfUserId)
        .sort((left, right) => {
          if (left.online !== right.online) {
            return left.online ? -1 : 1;
          }
          return right.lastSeen - left.lastSeen;
        }),
    [presenceUsers, selfUserId]
  );

  const activePeer = useMemo(
    () => peers.find((peer) => peer.userId === activePeerId) || null,
    [peers, activePeerId]
  );

  const activeMessages = useMemo(
    () => messagesByPeer[activePeerId] || [],
    [messagesByPeer, activePeerId]
  );

  const activeTyping = useMemo(
    () => typingByPeer[activePeerId] || null,
    [typingByPeer, activePeerId]
  );

  const totalMessages = useMemo(
    () =>
      Object.values(messagesByPeer).reduce(
        (total, list) => total + list.length,
        0
      ),
    [messagesByPeer]
  );

  useEffect(() => {
    const socket = io(socketUrl, {
      withCredentials: true,
      transports: ["websocket", "polling"]
    });

    socketRef.current = socket;

    socket.on("connect", () => {
      setIsConnected(true);
      socket.emit("dm:identify", {
        userId: currentUserIdRef.current,
        name: currentNameRef.current
      });
    });

    socket.on("disconnect", () => {
      setIsConnected(false);
    });

    socket.on("dm:self", (payload) => {
      const nextUserId = sanitizeUserId(payload?.userId) || currentUserIdRef.current;
      currentUserIdRef.current = nextUserId;
      setSelfUserId(nextUserId);
      setLocalUserId(nextUserId);
      localStorage.setItem("instantly:userId", nextUserId);

      const incomingName = sanitizeName(payload?.name || currentNameRef.current);
      currentNameRef.current = incomingName;
      setDisplayName(incomingName);
      localStorage.setItem("instantly:displayName", incomingName);
    });

    socket.on("dm:presence", (payload) => {
      const users = Array.isArray(payload?.users) ? payload.users : [];
      setPresenceUsers(
        users.map((user) => ({
          userId: sanitizeUserId(user.userId),
          name: sanitizeName(user.name),
          online: Boolean(user.online),
          lastSeen: Number(user.lastSeen || Date.now())
        }))
      );
    });

    socket.on("dm:message", (payload) => {
      const fromUserId = sanitizeUserId(payload?.fromUserId);
      const toUserId = sanitizeUserId(payload?.toUserId);
      if (!fromUserId || !toUserId) {
        return;
      }

      const viewerId = currentUserIdRef.current;
      const peerUserId = fromUserId === viewerId ? toUserId : fromUserId;
      if (!peerUserId) {
        return;
      }

      const message = {
        id: String(payload?.id || `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`),
        fromUserId,
        fromName: sanitizeName(payload?.fromName),
        toUserId,
        text: sanitizeText(payload?.text),
        createdAt: Number(payload?.createdAt || Date.now())
      };

      if (!message.text.trim()) {
        return;
      }

      setMessagesByPeer((prev) => {
        const nextList = [...(prev[peerUserId] || []), message].slice(-MESSAGE_LIMIT);
        return {
          ...prev,
          [peerUserId]: nextList
        };
      });
    });

    socket.on("dm:typing", (payload) => {
      const fromUserId = sanitizeUserId(payload?.fromUserId);
      if (!fromUserId || fromUserId === currentUserIdRef.current) {
        return;
      }

      const incoming = {
        fromUserId,
        fromName: sanitizeName(payload?.fromName),
        draft: sanitizeText(payload?.draft),
        updatedAt: Number(payload?.updatedAt || Date.now())
      };

      setTypingByPeer((prev) => {
        if (!incoming.draft.trim()) {
          if (!prev[fromUserId]) {
            return prev;
          }
          const next = { ...prev };
          delete next[fromUserId];
          return next;
        }

        return {
          ...prev,
          [fromUserId]: incoming
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
    socketRef.current?.emit("dm:set_name", { name: normalized });
  }, [displayName]);

  useEffect(() => {
    const normalizedId = sanitizeUserId(localUserId) || createUserId();
    currentUserIdRef.current = normalizedId;
    setLocalUserId(normalizedId);
    localStorage.setItem("instantly:userId", normalizedId);
  }, [localUserId]);

  useEffect(() => {
    if (activePeerId && peers.some((peer) => peer.userId === activePeerId)) {
      return;
    }
    setActivePeerId(peers[0]?.userId || "");
  }, [activePeerId, peers]);

  useEffect(() => {
    const cleanup = window.setInterval(() => {
      const now = Date.now();
      setTypingByPeer((prev) => {
        let changed = false;
        const next = { ...prev };
        for (const [peerId, entry] of Object.entries(prev)) {
          if (now - entry.updatedAt > TYPING_STALE_AFTER_MS) {
            delete next[peerId];
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
    if (!socket || !activePeerId) {
      return;
    }
    socket.emit("dm:typing", {
      toUserId: activePeerId,
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

  const handlePeerSelect = (peerId) => {
    setActivePeerId(peerId);
    setDraft("");
    broadcastTyping("");
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    const text = sanitizeText(draft);
    if (!text.trim() || !activePeerId) {
      return;
    }

    socketRef.current?.emit("dm:message", {
      toUserId: activePeerId,
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
            <h2 className="text-lg font-bold text-ink">
              {activePeer ? `Chat with ${activePeer.name}` : "Direct Messages"}
            </h2>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink/55">
              {totalMessages} stored
            </span>
          </div>

          <div className="min-h-[260px] flex-1">
            <MessageList
              messages={activeMessages}
              selfUserId={selfUserId}
              activePeer={activePeer}
              activeTyping={activeTyping}
            />
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
              placeholder={
                activePeer
                  ? `Message ${activePeer.name}...`
                  : "Select a person to start messaging..."
              }
              disabled={!activePeer}
              className="w-full resize-none rounded-xl border border-ocean/25 bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-ocean/70"
            />
            <div className="mt-2 flex items-center justify-between">
              <span className="font-mono text-xs text-ink/60">
                {draft.length}/{MAX_TEXT_LENGTH}
              </span>
              <button
                type="submit"
                disabled={!activePeer}
                className="rounded-lg bg-ink px-4 py-2 text-sm font-semibold text-white transition hover:bg-ocean"
              >
                Send
              </button>
            </div>
          </form>
        </div>

        <aside className="glass-panel min-h-[420px] p-4">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-bold text-ink">People</h2>
            <span className="font-mono text-xs uppercase tracking-[0.18em] text-ink/55">
              {peers.length} peer{peers.length === 1 ? "" : "s"}
            </span>
          </div>
          <PeerList
            peers={peers}
            activePeerId={activePeerId}
            onSelectPeer={handlePeerSelect}
            messagesByPeer={messagesByPeer}
            typingByPeer={typingByPeer}
          />
        </aside>
      </section>
    </div>
  );
}

export default App;
