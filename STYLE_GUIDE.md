# Style guide

Binance-faithful design system. Tokens live in `tailwind.config.ts`; components reference
token names only (no raw hex). Live reference at `/styleguide`.

## Color

| Token | Hex | Use |
|---|---|---|
| `yellow` | `#F0B90B` | brand, primary buttons, active markers |
| `yellow-hi` | `#FCD535` | primary button hover |
| `yellow-press` | `#D0980B` | pressed |
| `ink` | `#1E2026` | primary text, button text on yellow |
| `ink-2` | `#32313A` | nav links |
| `ink-3` | `#707A8A` | secondary text |
| `ink-4` | `#848E9C` | metadata, table headers |
| `surface` | `#FFFFFF` | page / cards |
| `surface-soft` | `#FAFAFA` | app background |
| `surface-fill` | `#F5F5F5` | inputs, secondary buttons |
| `line` | `#E6E8EA` | borders, dividers |
| `up` | `#0ECB81` | positive price only |
| `down` | `#F6465D` | negative price, destructive, attack |
| `night` / `night-2` / `night-3` | `#0B0E11` / `#0F141B` / `#070A0F` | attack-trace + demo chrome |
| `night-line` | `#1B222C` | dark borders |
| `dim` / `dim-2` | `#8B98A8` / `#5A6676` | dark-surface text |

**Rule:** `up` / `down` are for price data and attack state only — never decoration.

## Type

Inter (400/500/600/700), mono for hashes, nonces and logs. Tabular numerals globally.

| Role | Size / weight |
|---|---|
| Estimated balance | 30 / 600, tracking -0.5px |
| Section heading | 20 / 700 |
| Nav & labels | 14 / 600 |
| Body & metadata | 13 / 400 |
| Mono | 11.5 / 400 |

## Radius

`chip` 6px · `btn`/`data` 8px · `card` 12px.

## Buttons

- **Primary** — `bg-yellow text-ink`, hover `bg-yellow-hi`.
- **Secondary** — `bg-surface-fill text-ink`.
- **Destructive** — `bg-down text-white` (demo bar only).
- Don't mix button shapes in one row.

## Shadows

`shadow-card` for cards, `shadow-toast` for notifications. Dark surfaces use borders, not shadows.

## Two visual worlds

The demo deliberately separates them:
- **Light** = the victim's Binance dashboard (what the user sees).
- **Dark (`night`)** = the attack trace and demo bar (what's really happening).

Keep that boundary: nothing from the dark chrome bleeds into the Binance surfaces.
