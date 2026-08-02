# Paimon Transfer

Browser-based P2P file transfer — direct device-to-device via WebRTC. No upload, no signup, no server storing your files.

- **Privacy-first:** data flows straight between devices (e2e), never through a relay.
- **LAN-first:** same WiFi = local network transfer → **0 internet quota** (only KBs of signaling).
- **100% static:** runs on GitHub Pages — no backend at all.
- Powered by [trystero](https://github.com/dmotz/trystero) (MIT).

## Status

📋 **Planning** — architecture & roadmap live in the private `paimon-transfer-plan` repo. Implementation (Phase 0: scaffold + deploy pipeline) not started.

## Stack

Vite 8 · React 19 · TypeScript 7 · trystero (Nostr signaling) · qrcode.react · GitHub Pages

## Dev

```bash
npm install
npm run dev
```

Planned live site: `https://paimonchan.github.io/paimon-transfer/`
