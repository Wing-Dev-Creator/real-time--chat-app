# Instantly

`Instantly` is a real-time web chat app built with Socket.IO, React, and TailwindCSS.

It is designed for **1-on-1 direct messaging** with **live typing sync** so each person can see the other user's draft update character-by-character.

## Features

- 1-on-1 direct messages (not a group room feed)
- Live typing preview per selected person
- Presence list (online/offline peers)
- Per-conversation message history in UI state
- Fast frontend with Vite + React
- Node.js backend using Express + Socket.IO

## Tech Stack

- Backend: `Node.js`, `Express`, `Socket.IO`
- Frontend: `React`, `Vite`, `TailwindCSS`
- Runtime: `npm`

## Project Structure

```text
.
├── server.js                  # Express + Socket.IO server
├── package.json               # Root scripts (server + combined dev/build)
├── client/
│   ├── package.json
│   ├── src/
│   │   ├── App.jsx
│   │   ├── components/
│   │   └── index.css
│   └── vite.config.js
└── README.md
```

## Getting Started

### 1. Install dependencies

```bash
npm install
npm --prefix client install
```

### 2. Start development mode

```bash
npm run dev
```

This starts:

- Socket.IO server at `http://localhost:3000`
- React app at `http://localhost:5173`

## Build for Production

```bash
npm run build
npm start
```

`npm run build` creates `client/dist`, and `npm start` serves it from the backend.

## Environment Variables

Set these as needed:

- `PORT` (default: `3000`)
- `CLIENT_ORIGIN` (default: `http://localhost:5173,http://localhost:3000`)
- `VITE_SERVER_URL` (optional frontend override for socket server URL)

## How to Use (1-on-1 flow)

1. Open app in two different browsers/devices (or one normal + one incognito window).
2. Set a display name in each session.
3. Select the other person from the **People** panel.
4. Start typing and sending messages.
5. The selected person sees your draft updates in real time.

## Scripts

Root (`package.json`):

- `npm run server` - run backend only
- `npm run client` - run frontend only
- `npm run dev` - run backend + frontend together
- `npm run build` - build frontend
- `npm start` - run backend (serves `client/dist` if present)

Client (`client/package.json`):

- `npm --prefix client run dev`
- `npm --prefix client run build`
- `npm --prefix client run preview`
