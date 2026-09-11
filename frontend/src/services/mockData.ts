// ---------------------------------------------------------------------------
// DEMO / MOCK DATA ONLY
// This file simulates an auth + directory backend using localStorage so the
// app is fully runnable without a real database. Swap `mockAuth` and
// `mockDirectory` for real API calls when you connect a backend — nothing
// outside this file (WebRTC, signaling, call UI) depends on it being mocked.
// ---------------------------------------------------------------------------
import { CallHistoryEntry, Contact, User } from "../types";

const STORAGE_KEYS = {
  session: "velo.session",
  users: "velo.users",
  contacts: "velo.contacts",
  history: "velo.history",
};

const SEED_USERS: User[] = [
  { id: "u_rahul", username: "rahul.sharma", displayName: "Rahul Sharma", avatarSeed: "Rahul", status: "online" },
  { id: "u_priya", username: "priya.k", displayName: "Priya Kapoor", avatarSeed: "Priya", status: "online" },
  { id: "u_aman", username: "aman_v", displayName: "Aman Verma", avatarSeed: "Aman", status: "offline" },
  { id: "u_sara", username: "sara.j", displayName: "Sara Joseph", avatarSeed: "Sara", status: "online" },
  { id: "u_devraj", username: "devraj", displayName: "Devraj Singh", avatarSeed: "Devraj", status: "offline" },
];

function readJSON<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function writeJSON(key: string, value: unknown) {
  localStorage.setItem(key, JSON.stringify(value));
}

function ensureSeed() {
  if (!localStorage.getItem(STORAGE_KEYS.users)) writeJSON(STORAGE_KEYS.users, SEED_USERS);
  if (!localStorage.getItem(STORAGE_KEYS.contacts)) {
    const contacts: Contact[] = SEED_USERS.slice(0, 3).map((u) => ({ ...u, addedAt: Date.now() }));
    writeJSON(STORAGE_KEYS.contacts, contacts);
  }
  if (!localStorage.getItem(STORAGE_KEYS.history)) {
    const now = Date.now();
    const history: CallHistoryEntry[] = [
      { id: "h1", peer: SEED_USERS[0], direction: "incoming", mode: "video", timestamp: now - 1000 * 60 * 12, durationSec: 312 },
      { id: "h2", peer: SEED_USERS[1], direction: "outgoing", mode: "audio", timestamp: now - 1000 * 60 * 60 * 3, durationSec: 96 },
      { id: "h3", peer: SEED_USERS[2], direction: "missed", mode: "video", timestamp: now - 1000 * 60 * 60 * 20, durationSec: 0 },
      { id: "h4", peer: SEED_USERS[3], direction: "outgoing", mode: "video", timestamp: now - 1000 * 60 * 60 * 26, durationSec: 741 },
    ];
    writeJSON(STORAGE_KEYS.history, history);
  }
}
ensureSeed();

function slugifyUsername(input: string): string {
  return input
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ".")
    .replace(/[^a-z0-9_.]/g, "")
    .slice(0, 24);
}

export const mockAuth = {
  getSession(): User | null {
    return readJSON<User | null>(STORAGE_KEYS.session, null);
  },

  async signup(displayName: string, username: string): Promise<User> {
    await delay(400);
    const users = readJSON<User[]>(STORAGE_KEYS.users, []);
    const cleanUsername = slugifyUsername(username);
    if (users.some((u) => u.username === cleanUsername)) {
      throw new Error("That username is taken. Try another.");
    }
    const user: User = {
      id: `u_${cleanUsername}_${Math.floor(Math.random() * 1e5)}`,
      username: cleanUsername,
      displayName: displayName.trim() || cleanUsername,
      avatarSeed: displayName || cleanUsername,
      status: "online",
    };
    users.push(user);
    writeJSON(STORAGE_KEYS.users, users);
    writeJSON(STORAGE_KEYS.session, user);
    return user;
  },

  async login(username: string): Promise<User> {
    await delay(350);
    const users = readJSON<User[]>(STORAGE_KEYS.users, []);
    const cleanUsername = slugifyUsername(username);
    let user = users.find((u) => u.username === cleanUsername);
    if (!user) {
      // Demo convenience: unknown usernames log in as a fresh demo user
      // rather than requiring a separate seed step.
      user = { id: `u_${cleanUsername}`, username: cleanUsername, displayName: cleanUsername, avatarSeed: cleanUsername, status: "online" };
      users.push(user);
      writeJSON(STORAGE_KEYS.users, users);
    }
    writeJSON(STORAGE_KEYS.session, user);
    return user;
  },

  logout() {
    localStorage.removeItem(STORAGE_KEYS.session);
  },
};

export const mockDirectory = {
  allUsers(): User[] {
    return readJSON<User[]>(STORAGE_KEYS.users, SEED_USERS);
  },

  search(query: string): User[] {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return this.allUsers().filter(
      (u) => u.displayName.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    );
  },

  contacts(): Contact[] {
    return readJSON<Contact[]>(STORAGE_KEYS.contacts, []);
  },

  addContact(user: User) {
    const contacts = this.contacts();
    if (contacts.some((c) => c.id === user.id)) return contacts;
    const updated = [...contacts, { ...user, addedAt: Date.now() }];
    writeJSON(STORAGE_KEYS.contacts, updated);
    return updated;
  },

  history(): CallHistoryEntry[] {
    return readJSON<CallHistoryEntry[]>(STORAGE_KEYS.history, []).sort((a, b) => b.timestamp - a.timestamp);
  },

  logCall(entry: CallHistoryEntry) {
    const history = this.history();
    history.unshift(entry);
    writeJSON(STORAGE_KEYS.history, history.slice(0, 100));
  },
};

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
