import "dotenv/config";
import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { nanoid } from "nanoid";

const PORT = process.env.PORT || 4000;
const ORIGINS = (process.env.CLIENT_ORIGIN || "http://localhost:5173").split(",");

const app = express();
app.use(cors({ origin: ORIGINS.includes("*") ? true : ORIGINS }));
app.use(express.json());

// ---------------------------------------------------------------------------
// In-memory "database" abstraction. Swap these functions for real queries
// (Postgres/Mongo/etc.) without touching any signaling logic below.
// ---------------------------------------------------------------------------
const db = {
  users: new Map(), // userId -> { id, username, displayName, avatarSeed, socketId }
  presence: new Map(), // userId -> "online" | "offline"
};

function sanitizeUsername(raw) {
  return String(raw || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
}

function isValidRoomId(id) {
  return typeof id === "string" && /^[a-zA-Z0-9_-]{6,64}$/.test(id);
}

// ---------------------------------------------------------------------------
// REST: lightweight demo "directory" endpoints (real auth lives elsewhere)
// ---------------------------------------------------------------------------
app.get("/api/health", (_req, res) => res.json({ ok: true, uptime: process.uptime() }));

app.post("/api/presence/register", (req, res) => {
  const username = sanitizeUsername(req.body?.username);
  if (!username) return res.status(400).json({ error: "invalid_username" });
  const id = req.body?.id || nanoid(10);
  db.users.set(id, {
    id,
    username,
    displayName: req.body?.displayName?.slice(0, 40) || username,
    avatarSeed: req.body?.avatarSeed || username,
  });
  db.presence.set(id, "online");
  res.json({ id, username });
});

// ---------------------------------------------------------------------------
// Socket.IO signaling
// ---------------------------------------------------------------------------
const httpServer = http.createServer(app);
const io = new Server(httpServer, {
  cors: { origin: ORIGINS.includes("*") ? true : ORIGINS, methods: ["GET", "POST"] },
  maxHttpBufferSize: 1e6,
});

// rooms: roomId -> { members: Set<socketId>, meta: { kind: "1:1"|"group", createdAt } }
const rooms = new Map();

function roomOf(socket) {
  return [...socket.rooms].find((r) => r !== socket.id);
}

io.use((socket, next) => {
  const { userId, displayName, username, avatarSeed } = socket.handshake.auth || {};
  if (!userId || typeof userId !== "string" || userId.length > 64) {
    return next(new Error("unauthorized"));
  }
  socket.userId = userId;
  socket.displayName = String(displayName || "Guest").slice(0, 40);
  socket.username = String(username || userId).slice(0, 40);
  socket.avatarSeed = String(avatarSeed || socket.displayName).slice(0, 40);
  next();
});

io.on("connection", (socket) => {
  db.users.set(socket.userId, {
    id: socket.userId,
    username: socket.username,
    displayName: socket.displayName,
    avatarSeed: socket.avatarSeed,
  });
  db.presence.set(socket.userId, "online");

  const onlineUsers = [...db.users.values()].filter(
    (u) => u.id !== socket.userId && db.presence.get(u.id) === "online"
  );
  socket.emit("presence:snapshot", { users: onlineUsers });

  socket.broadcast.emit("presence:update", {
    userId: socket.userId,
    status: "online",
    username: socket.username,
    displayName: socket.displayName,
    avatarSeed: socket.avatarSeed,
  });

  socket.on("call:invite", ({ roomId, toUserId, mode }) => {
    if (!isValidRoomId(roomId) || typeof toUserId !== "string") return;
    socket.join(roomId);
    rooms.set(roomId, rooms.get(roomId) || { members: new Set(), kind: mode === "audio" ? "audio" : "video" });
    rooms.get(roomId).members.add(socket.id);

    io.to(toUserId).emit("call:incoming", {
      roomId,
      fromUserId: socket.userId,
      fromName: socket.displayName,
      mode: mode === "audio" ? "audio" : "video",
    });
  });

  socket.join(socket.userId);

  socket.on("call:accept", ({ roomId }) => {
    if (!isValidRoomId(roomId)) return;
    socket.join(roomId);
    const room = rooms.get(roomId) || { members: new Set(), kind: "video" };
    room.members.add(socket.id);
    rooms.set(roomId, room);
    socket.to(roomId).emit("call:accepted", { roomId, byUserId: socket.userId });
  });

  socket.on("call:reject", ({ roomId, toUserId }) => {
    if (!isValidRoomId(roomId)) return;
    io.to(toUserId).emit("call:rejected", { roomId, byUserId: socket.userId });
  });

  socket.on("call:end", ({ roomId }) => {
    if (!isValidRoomId(roomId)) return;
    socket.to(roomId).emit("call:ended", { roomId, byUserId: socket.userId });
    const room = rooms.get(roomId);
    if (room) {
      room.members.delete(socket.id);
      if (room.members.size === 0) rooms.delete(roomId);
    }
    socket.leave(roomId);
  });

  socket.on("rtc:offer", ({ roomId, sdp }) => {
    if (!isValidRoomId(roomId)) return;
    socket.to(roomId).emit("rtc:offer", { sdp, fromUserId: socket.userId });
  });

  socket.on("rtc:answer", ({ roomId, sdp }) => {
    if (!isValidRoomId(roomId)) return;
    socket.to(roomId).emit("rtc:answer", { sdp, fromUserId: socket.userId });
  });

  socket.on("rtc:ice-candidate", ({ roomId, candidate }) => {
    if (!isValidRoomId(roomId) || !candidate) return;
    socket.to(roomId).emit("rtc:ice-candidate", { candidate, fromUserId: socket.userId });
  });

  socket.on("rtc:renegotiate", ({ roomId }) => {
    if (!isValidRoomId(roomId)) return;
    socket.to(roomId).emit("rtc:renegotiate", { fromUserId: socket.userId });
  });

  socket.on("disconnect", () => {
    db.presence.set(socket.userId, "offline");
    socket.broadcast.emit("presence:update", { userId: socket.userId, status: "offline" });
    const roomId = roomOf(socket);
    if (roomId) {
      socket.to(roomId).emit("call:peer-left", { roomId, byUserId: socket.userId });
      const room = rooms.get(roomId);
      if (room) {
        room.members.delete(socket.id);
        if (room.members.size === 0) rooms.delete(roomId);
      }
    }
  });
});

httpServer.listen(PORT, () => {
  console.log(`Velo signaling server listening on :${PORT}`);
});
