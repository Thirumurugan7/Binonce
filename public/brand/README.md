# Binonce — brand kit

The mark is a 3×3 grid of nine authorizations signed at consecutive nonces, rotated 45° into a
diamond. Eight ring the outside as spent spares; the one that lands sits at the heart as a cut gold
gem. The diamond + gold read as a crypto exchange — it is deliberately our own shape, **not** any
exchange's actual logo.

## Files

| File | Use |
| --- | --- |
| `binonce-mark.svg` | Icon only, transparent, scalable. The most portable asset (pure shapes, no font). |
| `binonce-logo-light.svg` | Wordmark lockup for **light** backgrounds (dark ink text). |
| `binonce-logo-dark.svg` | Wordmark lockup for **dark** backgrounds (light text, brighter gem). |
| `binonce-logo-light.png` | Same lockup, transparent PNG @3×, for light backgrounds. |
| `binonce-logo-dark.png` | Same lockup, transparent PNG @3×, for dark backgrounds. |
| `binonce-mark-light.png` / `binonce-mark-dark.png` | Mark only, transparent PNG @3×. |
| `binonce-mark.gif` | Animated mark — the loading sequence: dots sign in around the ring, then the gem lands. |
| `binonce-banner.png` | 16:9 hero banner (3840×2160) — logo, tagline, and the attack → defense hook. For README headers, social cards, slides. |

The favicon (`src/app/icon.svg`) and in-app loader (`public/binonce-loader.svg`) use the same mark.

## Palette

| Token | Light | Dark | Role |
| --- | --- | --- | --- |
| `--bn-gold` | `#F0B90B` | `#F5C52C` | the gem that lands |
| `--bn-gold-soft` | `#D6A940` | `#C4A050` | the spare-nonce ring (drawn at 50% opacity) |

Text: ink `#17150F` on light, fog `#E8E4DA` on dark.

## Wordmark

Typeface: **Instrument Serif** (Google Fonts), regular 400, letter-spacing −0.3px. The SVG lockups
pull it in via `@import`; the PNGs have it baked in. For a one-off where the font isn't available,
prefer the mark alone.

## Clearspace & minimum size

Keep padding of at least the gem's width around the lockup. The mark stays legible down to 16px; the
full lockup down to ~20px tall. Don't recolor the gem, rotate the lockup, or set it on a busy
background that kills the gold.
