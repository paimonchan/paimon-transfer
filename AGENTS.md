# Paimon Transfer — Project Conventions

## Indentation
- **2 spaces** — never tabs, never 4 spaces.
- All files formatted via **Prettier** (2-space).
- JSX/TSX follows the same 2-space rule.

## Architecture — Layer Rules
These are strict — don't import across layers.

| Dir | Contents | Rules |
|-----|----------|-------|
| `engine/` | Pure logic — `types.ts`, `roomCode.ts`, `transfer.ts` (state machine) | Zero React, zero browser API, no DOM, no `window`. Pure functions only. |
| `net/` | trystero wrappers — `room.ts`, `actions.ts` | WebRTC/signaling side effects. No JSX. Import engine types. |
| `components/` | React UI components | Flat dir (no subdirs). Each file = one component, one default export. |
| `hooks/` | Shared React hooks | `usePersistentState` — generic localStorage hook. |
| `lib/` | Browser I/O + adapters | `strings.ts` (i18n catalog), `format.ts` (bytes/speed/ETA), `inAppBrowser.ts`. Side-effectful, no JSX. |

> **Golden rule:** Never import from `components/` into `engine/`, `net/`, or `lib/`.

## TypeScript
- Prefer `interface` over `type` for object shapes.
- Discriminated unions for variant states (e.g. `TransferStatus`).
- No `any` — use `unknown` with narrowing.
- Import types with `import type { ... }`.

## UI Rules (from DESIGN.md — plan repo)
- **Status never color-only**: icon + text + color (WCAG 1.4.1).
- **All colors from CSS variables** in `src/index.css` — never hardcoded hex.
- **No emoji as icons** — lucide-react only. Emoji allowed only inside file names (data).
- **No glow blobs / gradient mesh / shimmer** — gateway rule.
- **All user-facing text via `t()` from `lib/strings.ts`** — never inline hardcoded strings.
- All colors as CSS custom properties, never hardcoded.

## State Management
- **Persistent state** (nickname, lang, onboarding dismissed) → `usePersistentState`.
- **Transient state** (room, transfers) → local `useState` / refs. No global store.

## Component Conventions
- One default export per file.
- Props interface defined above the component (not inline).
- Functional components with hooks only — no class components.
- Touch targets ≥ 44×44px; interactive boundaries use `--border-strong`.
- Buttons: icon + label on primary actions; icon-only buttons get `aria-label`.

## Code Style
- Comments: natural casual English, no formal JSDoc lists.
- Separators: ASCII `---` not Unicode `───`.
- Import ordering: React/third-party first, then local (alphabetical by path).

## Git
- Conventional commits: `feat:`, `fix:`, `style:`, `refactor:`, `chore:`, `docs:`.
- Keep commits focused — one logical change per commit.
- Plans/docs NEVER committed here — go to `paimon-transfer-plan` repo instead.
