# Velo — instant, private, lightweight video calling

A premium, low-data video calling app: React + TypeScript + Vite + Tailwind frontend,
a Node/Express/Socket.IO signaling backend, and a real WebRTC adaptation engine
(not just a UI toggle) for the Data Saver / Smart Network features.

```
velo/
  backend/     Node + Express + Socket.IO signaling server
  frontend/    React + TS + Vite + Tailwind app (+ Capacitor config for Android)
```

---

## 1. Install dependencies

```bash
# Backend
cd velo/backend
npm install

# Frontend (in a new terminal)
cd velo/frontend
npm install
```

## 2. Environment variables

```bash
# backend/.env  (copy from backend/.env.example)
PORT=4000
CLIENT_ORIGIN=http://localhost:5173
AUTH_JWT_SECRET=replace-with-a-long-random-secret   # unused in demo mode
TURN_URL=
TURN_USERNAME=
TURN_CREDENTIAL=

# frontend/.env  (copy from frontend/.env.example)
VITE_SIGNALING_URL=http://localhost:4000
```

## 3. Run it

```bash
# Terminal 1
cd velo/backend
npm run dev          # starts the signaling server on :4000

# Terminal 2
cd velo/frontend
npm run dev          # starts Vite on :5173 (use --host to expose on your LAN)
```

Open `http://localhost:5173`.

## 4. Test a call between two "users"

1. Open the app in two browser windows (or two devices on the same network,
   using your machine's LAN IP instead of `localhost` and `npm run dev -- --host`).
2. Sign up as **User A** in window 1 and **User B** in window 2 (demo auth —
   any username works, no password).
3. In User A's window, search for User B's username on Home, and tap the
   video or audio call icon.
4. Accept the call in User B's window. You should see both video feeds.
5. Toggle **Data Saver** mid-call and watch the "Data used" counter grow
   more slowly; throttle your network in DevTools (Network tab → Slow 3G)
   to see the app automatically step down resolution/bitrate and recover
   when you switch back to Fast 3G/No throttling.

---

## 5. Building the Android APK

There are two ways to get a real `.apk`. Pick whichever is easier for you.

### Option A — GitHub Actions (no local Android install needed, recommended)

A ready-made workflow lives at `.github/workflows/build-apk.yml`. It builds
a debug APK on GitHub's cloud runners, which already have the Android SDK
installed — you don't need Android Studio, the SDK, or Gradle on your own
machine at all.

1. Push this project to a new GitHub repository:
   ```bash
   cd velo
   git init && git add . && git commit -m "Velo video calling app"
   git branch -M main
   git remote add origin https://github.com/<you>/velo.git
   git push -u origin main
   ```
2. (Optional but recommended) In the repo's **Settings → Secrets and
   variables → Actions → Variables**, add `VITE_SIGNALING_URL` set to your
   deployed signaling server's public HTTPS URL. If you skip this, the
   build defaults to `http://10.0.2.2:4000` (the Android emulator's alias
   for your host machine's `localhost:4000` — fine for testing in an
   emulator, not for a real phone on another network).
3. Go to the **Actions** tab → **Build Android APK** → **Run workflow**
   (or just push a commit — it runs automatically on `main`).
4. When the run finishes (~3–5 minutes), open it and download the
   **velo-debug-apk** artifact. Unzip it to get `app-debug.apk`.
5. Transfer that APK to an Android phone (or an emulator) and install it —
   you'll need "Install unknown apps" enabled for whichever app you use to
   open the file, since it isn't from the Play Store.

This produces a **debug** build (unsigned, fine for testing on your own
devices). For a Play Store release build, see Option B and use Android
Studio's signing wizard.

### Option B — Locally with Android Studio

```bash
cd velo/frontend
npm run build                 # produces dist/
npx cap add android           # generates the android/ project (first time only)
npx cap sync android          # copies dist/ + config into the native project

# Add camera/mic permissions (first time only): open
# android/app/src/main/AndroidManifest.xml and add, inside <manifest>:
#   <uses-permission android:name="android.permission.CAMERA" />
#   <uses-permission android:name="android.permission.RECORD_AUDIO" />
#   <uses-permission android:name="android.permission.MODIFY_AUDIO_SETTINGS" />
#   <uses-permission android:name="android.permission.INTERNET" />
#   <uses-feature android:name="android.hardware.camera" android:required="false" />

npx cap open android          # opens Android Studio
```

In Android Studio: **Build → Build Bundle(s) / APK(s) → Build APK(s)**.
The signed/unsigned `.apk` will appear under
`android/app/build/outputs/apk/`. For a release build you'll need to
generate a signing keystore (Android Studio's Build → Generate Signed Bundle/APK
wizard walks through this).

Point `VITE_SIGNALING_URL` at your deployed signaling server's public
`https://` URL before running `npm run build` for the APK — a packaged app
can't reach `localhost` on your dev machine.

---

## 6. What's production-ready vs. what still needs infrastructure

**Production-ready as written:**
- WebRTC peer connection lifecycle, adaptive bitrate/resolution/framerate via
  `RTCRtpSender.setParameters()`, `getStats()`-driven network classification
  with hysteresis, ICE-restart reconnection, real byte-counter data usage.
- Signaling protocol and room validation logic (`backend/server.js`).
- Full UI/UX: all screens, responsive layout, safe-area handling, permission
  error states, draggable self-view, auto-hiding controls.
- Clean separation of concerns (`services/`, `hooks/`+`context/`, `components/`,
  `pages/`) so swapping any layer (auth, database, transport) doesn't touch
  the rest.

**Needs real infrastructure before shipping to real users:**
- **TURN server** — STUN alone (currently Google's public STUN servers)
  fails behind many corporate/mobile NATs. Add your TURN credentials in
  `frontend/src/services/webrtc.ts` (`ICE_SERVERS`) and `backend/.env`.
- **Real authentication** — `services/mockData.ts` is a clearly-isolated
  localStorage-based demo auth/directory. Replace `mockAuth`/`mockDirectory`
  with real API calls to your auth provider; nothing else in the app depends
  on it being mocked.
- **Database** — the backend's `db` object in `server.js` is an in-memory
  Map as a placeholder abstraction. Swap it for Postgres/Mongo/etc. without
  touching signaling logic.
- **HTTPS/WSS** — browsers require a secure context for camera/mic access
  (except on `localhost`). Deploy the backend behind HTTPS/WSS (e.g. behind
  nginx/Caddy or a platform like Render/Fly.io) and set `VITE_SIGNALING_URL`
  to the `https://` URL — Socket.IO will upgrade to `wss://` automatically.
  Update `CLIENT_ORIGIN` in the backend `.env` to your real frontend origin.
  Also serve the frontend itself over HTTPS.
- **Group calls** — the architecture (`CallManager` per remote peer) is
  mesh-topology-ready for small groups (~4–6 participants). Beyond that,
  route media through an SFU (e.g. mediasoup, LiveKit, Janus) instead of a
  full mesh to keep upload bandwidth manageable.
- **Push notifications for incoming calls** when the app is backgrounded on
  mobile — add FCM (Android) via a Capacitor plugin; Socket.IO alone won't
  wake a backgrounded/killed app.

---

## 7. Architecture notes

- `services/webrtc.ts` — owns one `RTCPeerConnection`; UI never touches it
  directly.
- `services/networkMonitor.ts` — turns raw RTT/packet-loss/bandwidth stats
  into a stable network tier (hysteresis: 1 bad sample downgrades, 3 good
  samples in a row upgrade — drop fast, recover slowly).
- `services/dataUsage.ts` — real byte-counter tracking from `getStats()`,
  not a hardcoded estimate.
- `services/callManager.ts` — orchestrates signaling + WebRTC + adaptation
  for one call; this is what `CallContext` talks to.
- `services/mockData.ts` — demo-only auth/directory, isolated so it's a
  one-file swap for a real backend.
