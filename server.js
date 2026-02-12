const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;
const CLIENT_ORIGIN = process.env.CLIENT_ORIGIN || "http://localhost:5173,http://localhost:3000";
const allowedOrigins = CLIENT_ORIGIN.split(",").map((origin) => origin.trim());
const distPath = path.join(__dirname, "client", "dist");

app.use(
  cors({
    origin: allowedOrigins,
    credentials: true
  })
);

const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

const usersById = new Map();
const socketToUserId = new Map();

function sanitizeName(raw) {
  return String(raw || "").slice(0, 40).trim() || "Guest";
}

function sanitizeText(raw) {
  return String(raw || "").slice(0, 500);
}

function sanitizeUserId(raw, fallback) {
  const value = String(raw || fallback || "")
    .toLowerCase()
    .replace(/[^a-z0-9_-]/g, "")
    .slice(0, 48);
  return value || fallback;
}

function getUserRoom(userId) {
  return `user:${userId}`;
}

function getPresenceList() {
  return Array.from(usersById.values())
    .map((user) => ({
      userId: user.userId,
      name: user.name,
      online: user.socketIds.size > 0,
      lastSeen: user.lastSeen
    }))
    .sort((left, right) => {
      if (left.online !== right.online) {
        return left.online ? -1 : 1;
      }
      return right.lastSeen - left.lastSeen;
    });
}

function broadcastPresence() {
  io.emit("dm:presence", { users: getPresenceList() });
}

function identifySocket(socket, payload) {
  const previousUserId = socketToUserId.get(socket.id);
  if (previousUserId && usersById.has(previousUserId)) {
    const previousUser = usersById.get(previousUserId);
    previousUser.socketIds.delete(socket.id);
    previousUser.lastSeen = Date.now();
  }

  const requestedUserId = sanitizeUserId(payload?.userId, socket.id);
  const nextName = sanitizeName(payload?.name);
  const userId = requestedUserId;
  const now = Date.now();

  const current = usersById.get(userId) || {
    userId,
    name: nextName,
    socketIds: new Set(),
    lastSeen: now
  };

  current.name = nextName || current.name;
  current.socketIds.add(socket.id);
  current.lastSeen = now;
  usersById.set(userId, current);

  socketToUserId.set(socket.id, userId);
  socket.join(getUserRoom(userId));
  socket.data.userId = userId;
  socket.data.name = current.name;

  socket.emit("dm:self", {
    userId,
    name: current.name
  });

  broadcastPresence();
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "instantly-server" });
});

if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.path.startsWith("/socket.io")) {
      next();
      return;
    }
    res.sendFile(path.join(distPath, "index.html"));
  });
} else {
  app.get("/", (_req, res) => {
    res.send(
      "Instantly backend is running. Start the React app with `npm --prefix client run dev`."
    );
  });
}

io.on("connection", (socket) => {
  socket.on("dm:identify", (payload) => {
    identifySocket(socket, payload);
  });

  socket.on("dm:set_name", (payload) => {
    const userId = socketToUserId.get(socket.id);
    if (!userId || !usersById.has(userId)) {
      return;
    }

    const user = usersById.get(userId);
    user.name = sanitizeName(payload?.name || user.name);
    user.lastSeen = Date.now();
    socket.data.name = user.name;

    socket.emit("dm:self", {
      userId,
      name: user.name
    });
    broadcastPresence();
  });

  socket.on("dm:message", (payload) => {
    const fromUserId = socketToUserId.get(socket.id);
    if (!fromUserId || !usersById.has(fromUserId)) {
      return;
    }

    const toUserId = sanitizeUserId(payload?.toUserId, "");
    if (!toUserId || !usersById.has(toUserId)) {
      return;
    }

    const text = sanitizeText(payload?.text);
    if (!text.trim()) {
      return;
    }

    const fromUser = usersById.get(fromUserId);
    fromUser.lastSeen = Date.now();

    const message = {
      id: `${Date.now()}-${Math.random().toString(16).slice(2, 8)}`,
      fromUserId,
      fromName: fromUser.name,
      toUserId,
      text,
      createdAt: Date.now()
    };

    io.to(getUserRoom(fromUserId)).emit("dm:message", message);
    if (toUserId !== fromUserId) {
      io.to(getUserRoom(toUserId)).emit("dm:message", message);
      io.to(getUserRoom(toUserId)).emit("dm:typing", {
        fromUserId,
        fromName: fromUser.name,
        draft: "",
        updatedAt: Date.now()
      });
    }
  });

  socket.on("dm:typing", (payload) => {
    const fromUserId = socketToUserId.get(socket.id);
    if (!fromUserId || !usersById.has(fromUserId)) {
      return;
    }

    const toUserId = sanitizeUserId(payload?.toUserId, "");
    if (!toUserId || !usersById.has(toUserId) || toUserId === fromUserId) {
      return;
    }

    const fromUser = usersById.get(fromUserId);
    fromUser.lastSeen = Date.now();

    io.to(getUserRoom(toUserId)).emit("dm:typing", {
      fromUserId,
      fromName: fromUser.name,
      draft: sanitizeText(payload?.draft),
      updatedAt: Date.now()
    });
  });

  socket.on("disconnect", () => {
    const userId = socketToUserId.get(socket.id);
    socketToUserId.delete(socket.id);

    if (!userId || !usersById.has(userId)) {
      return;
    }

    const user = usersById.get(userId);
    user.socketIds.delete(socket.id);
    user.lastSeen = Date.now();

    if (user.socketIds.size === 0) {
      io.emit("dm:typing", {
        fromUserId: userId,
        fromName: user.name,
        draft: "",
        updatedAt: Date.now()
      });
    }

    broadcastPresence();
  });
});

server.listen(PORT, () => {
  console.log(`Instantly server running on http://localhost:${PORT}`);
});
