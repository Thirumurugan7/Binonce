# Binonce design system

Binonce replays the Oct 29 2026 Binance EIP-7702 hot-wallet drain on a real chain, records every sweeper it
sees to a public registry on Arkiv, and walks through the Chainwall defense. This file covers the brand
(landing page and our own surfaces). Live reference: **`/styleguide`**.

## One system, two themes

Every page (`/`, `/attack`, `/defense`, `/styleguide`) uses the same `bn-*` tokens. Light and dark follow the
visitor's system setting and can be switched from the nav (the choice is remembered). The earlier Binance-clone
dashboards were removed: a visitor arriving from the landing page should recognise the same product, and the
replay should explain itself instead of imitating an exchange.

## Who it's for, and what that means for the design

- **Hackathon judges** skim for 30 seconds. They need the claim, the proof that it's real, and what's
  different. So the hero leads with the thesis and a live-looking replay, not a feature list.
- **Security engineers and wallet/exchange teams** want mechanics and honesty: exact bytes, nonces, what's
  built vs planned. So the page shows `0xef0100`, the 50-nonce detail, and status tags on every layer.
- **Newcomers to EIP-7702** need it explained without jargon walls. So the drain is told in four plain steps,
  each with one visual.

Competitors (Blockaid, Fireblocks, Hypernative, Forta, wallet-security extensions) mostly use dark, glowing,
"cyber" landing pages. Binonce goes the other way: an **incident report**. Calm paper, editorial serif,
precise mono, and one alarming colour. It looks like evidence, which is what a replay is.

## Concept: paper and night

- **Paper** is what people see: the calm dashboard, the routine-looking withdrawal toast.
- **Night** is what the chain records: signatures, the delegation marker, the sweep.
- **Ember** is the breach, the one thing that changed.

The landing page alternates the two. The app pages follow one layout: a plain header with the run button; a step tracker whose narrator says in one sentence what is happening now and why, with the on-chain evidence drawn dark underneath; the live log, always visible; and a side panel showing where the money is (victim or vault above, attacker below) plus the notifications the owner would see. Every step can be opened before a run, so the page teaches even when the chain isn't set up.

**Mark.** Nine authorizations signed at consecutive nonces: eight spent spares (dots) and one that lands (the
ember square, top-left). In the replay the matching nonce is always the first. It animates once in the
first-visit intro (`IntroLoader`, CSS-only, skipped after the first page view in a session and under reduced
motion), loops as the busy indicator in a running trace, and ships as `public/binonce-loader.svg`, a standalone
animated SVG you can use like a GIF (README, slides).

## Colour

Defined as RGB channel CSS variables in `src/app/globals.css` (so Tailwind's `/alpha` works) and exposed
as `bn-*` in `tailwind.config.ts`. `.dark` on `<html>` flips the paper world; the night world stays dark in
both themes (one step deeper in dark mode) because "what the chain records" should always read as underneath.
A pre-paint script in `layout.tsx` applies the stored or system theme so there is no flash.

Light values below; dark values: paper `#111110`, paper-2 `#191917`, card `#1D1D1B`, ink `#EEEAE1` (15.7:1),
ink-2 `#C9C4B9`, muted `#9A958A` (6.3:1), line `#32312D`, ember-ink `#FF7D5C` (7.5:1), seal `#58C496`,
amber `#E4AC46`, info `#809EFF`, night `#08090A`.

| Token | Hex | Role | Contrast |
|---|---|---|---|
| `bn-paper` | `#F3EFE6` | page background | — |
| `bn-paper-2` | `#ECE7DB` | bands (facts, two views) | — |
| `bn-line` | `#D8D1C2` | hairlines on paper | — |
| `bn-ink` | `#15140F` | headings, primary button | 16.1:1 on paper |
| `bn-ink-2` | `#3A3730` | body text | 10.3:1 |
| `bn-muted` | `#686358` | metadata, eyebrows | 5.2:1 |
| `bn-night` / `-2` | `#0E0F11` / `#16181B` | chain-world panels | — |
| `bn-night-line` | `#282B30` | hairlines on night | — |
| `bn-fog` | `#E8E4DA` | text on night | 15.1:1 |
| `bn-fog-2` | `#9C988D` | muted on night | 6.7:1 |
| `bn-ember` | `#E5431F` | **brand signal**: fills, large display text only | 3.5:1 (large text) |
| `bn-ember-ink` | `#B2310E` | ember for small text, primary hover | 5.5:1 |
| `bn-ember-glow` | `#FF6B45` | ember on night | 6.8:1 |
| `bn-seal` / `-glow` | `#1F7A59` / `#5EC99C` | held, safe, live | 4.6:1 / 9.4:1 |
| `bn-amber` / `-glow` | `#8A570B` / `#E9B44C` | warning, in progress | 5.3:1 / 10.1:1 |
| `bn-info` | `#2C54C4` | information | 5.8:1 |

`bn-card` (`#FFFFFF` / `#1D1D1B`) is the raised card surface. Shadows use `--bn-shadow` so they don't turn
into glows in dark mode.

**Rules.** Ember marks the attack, never decoration, and at most one ember accent per view on paper.
Seal and amber appear only as status. Body text never uses ember.

## Typography

| Role | Face | Token / size |
|---|---|---|
| Display | **Instrument Serif** 400 + italic (`font-serif`) | `text-display-xl` 48→108px · `display-l` 40→72 · `display-m` 32→52 · `display-s` 24→32 |
| Body | **Geist** (`font-sans`) | `text-body-l` 19/1.6 for intros, 16/1.6 for paragraphs, 14 for UI |
| Data & labels | **Geist Mono** (`font-mono`) | hashes, nonces, logs at 11–14px; `text-eyebrow` 12px, uppercase, 0.14em tracking |

Display sizes are fluid (`clamp`) with tight leading (0.94–1.12) and slight negative tracking. Italic is
used for the turn in a headline ("drains *itself*"), not for emphasis in body copy. Tabular numerals are on
globally.

## Tokens

| Group | Tokens |
|---|---|
| Radius | `rounded-tag` 4 · `rounded-data` 8 · `rounded-panel` 14 · `rounded-full` buttons |
| Elevation | `shadow-bn-1` resting · `shadow-bn-2` floating panel · `shadow-bn-3` hero object. Night panels use borders, not glow |
| Motion | `duration-fast` 150 · `duration-base` 240 · `duration-slow` 480 · `ease-bn-out` `cubic-bezier(.16,1,.3,1)`; reveals 700ms |
| Layout | `max-w-page` 1240 · `max-w-prose` 62ch · gutters `px-4 sm:px-6 lg:px-10` · sections `py-20 lg:py-32` |
| Breakpoints | Tailwind defaults: `sm` 640 · `md` 768 · `lg` 1024 · `xl` 1280 |
| Texture | `.bn-grid-night` (48px ruled grid on night panels). No gradients or glows |

## Components

Brand primitives are in `src/components/brand/`, and the landing sections are in `src/components/landing/`.

| Component | Notes |
|---|---|
| `Button` | `primary` (ink) · `danger` (ember, black text; only for launching the attack) · `secondary` · `ghost` · `inverse` / `inverse-ghost` for night. `md` 40px, `lg` 48px. `href` renders a link |
| `Tag` | Mono status tag. Tones: `live` `progress` `planned` `breach` `seal` `neutral`; `onNight` variant |
| `Eyebrow` | Section kicker with an optional index (`01`) |
| `Reveal` | Fade-up once on scroll; static under reduced motion |
| `Mark`, `Wordmark` | Nonce mark (`animate="once" | "loop"`) + serif wordmark |
| `IntroLoader`, `ThemeToggle` | First-visit intro · light/dark switch |
| `Designator` | Renders `0xef0100‖delegate` with the marker highlighted |
| `CopyButton` | Clipboard copy with a polite live-region confirmation |

App components live in `src/components/app/`: `AppNav`, `Walkthrough` (step tracker + plain-language narrator + on-chain evidence), `Terminal` (the live log, always visible), `MoneyPanel` (victim/vault vs attacker balances + notifications), `AttackTrace` / `DefenseTrace` (step copy and evidence), `ActivityPanel` (Arkiv record), `MintModal`, `SetupNotice`.

Conventions: no raw hex in components; focus is a 2px ember outline (`.bn-focus`, or any focusable
inside `.bn-scope`); touch targets are at least 40px; every illustration is labelled as one and never
shows invented addresses or hashes.

## Landing page

1. **Hero**: the thesis plus a replay illustration you can pause or jump to any stage.
2. **Incident timeline**: pinned while you scroll; each quarter of the scroll reveals the next of four dated moments (click or arrow keys jump), with sources.
3. **How the drain works**: four steps with a sticky visual, then two hands-on explainers: *Why sign 50?*
   (drag the wallet's nonce and see which authorization lands, or none) and *Read the 23 bytes* (hover the
   designator, or paste your own `eth_getCode` result).
4. **Inside the replay**: owner view next to the chain log, using the replay's real copy.
5. **Defense**: a switch comparing a plain hot wallet with one behind the Lock, then the three layers with honest status.
6. **Blacklist**: the importer's real labelling rules as a classifier you can play with, plus a runnable query.
7. **Run it yourself**: commands and calls to action.

Copy rules: no italic-word-in-every-headline, no numbered section kickers, no rhetorical one-liners. Say what
happens, cite where the numbers come from, and mark what isn't built.

## Accessibility

AA contrast for all text (see table). There's a skip link, keyboard-operable tabs with arrow keys, visible
focus, ARIA labels on the illustrations, `prefers-reduced-motion` (static end states, no loops, no smooth
scroll), and no horizontal scroll at 390px.
