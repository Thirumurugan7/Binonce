# UI & UX rationale

The app is a Next.js + Tailwind rebuild of a faithful Binance "Assets Overview" page, used to
stage the attack. The design system it draws on is in [style-guide.md](./style-guide.md).

## The core idea: two worlds

The demo deliberately shows two surfaces at once:

- **Light — the victim's Binance dashboard.** What a user sees: estimated balance, PnL, an
  assets table. It stays calm and familiar while being drained.
- **Dark (`night`) — the attack trace.** A slide-out inspector showing what's *really*
  happening: the 50 nonces, the delegation marker, tx hashes, the console. Clearly not Binance
  chrome.

The boundary is strict: nothing from the dark chrome bleeds into the Binance surfaces. That
contrast *is* the pitch — "this is what the user sees; this is what's actually happening."

## Components

| Component | Role |
|---|---|
| `Nav`, `WalletRail` | Binance chrome (logo, nav, wallet sidebar) |
| `BalanceCard` | estimated balance, PnL, hide-balance eye, the red "unusual activity" alert |
| `AssetsTable` | the USDT hot wallet (+ ETH/BNB dust); the drained row flashes |
| `Toasts` | Binance-style notifications (security notice → withdrawal submitted → completed); shift left when the drawer opens |
| `AttackTrace` | the dark inspector: 4 steps, 50-nonce grid, attacker-received, console |
| `DemoBar` | fixed bottom bar: Rehearse / Run live / Attack trace. Dark + yellow top border so it reads as *not* Binance. |
| `Dashboard` | orchestrator: holds state, tweens the balance, consumes the SSE stream |

## Interaction choices

- **Balance tweens** down with an ease-out cubic during the sweep — not a jump.
- **Toasts** mirror a real exchange's withdrawal notifications; the chilling part is how normal they look.
- **Live vs rehearsal**: `Rehearse` streams mock data (no gas); `Run attack (live)` is gated by `/api/config` until `.env` is set.
- **Reduced motion** respected via `globals.css`.

## Demo order (matches the drawer)

break-in → 🔒 Lock holds → 🚨 Alarm fires → 📕 Blacklist names the thief.
Full script in [../tracks/submission.md](../tracks/submission.md).

## Event → UI mapping

The SSE stream (`setup`, `sign`, `sign-progress`, `sign-done`, `delegate*`, `verify`, `sweep*`,
`after`, `done`) drives the drawer steps, the nonce grid (matched cell highlighted), the alert
banner, toasts, and the balance tween. Same events in demo and live. See
[../attack/simulator.md](../attack/simulator.md).
