# UI & UX rationale

## Layout of the app pages

- **Header:** what the page does in one sentence, and the run button.
- **Walkthrough:** a step tracker; the narrator says in plain words what is happening now and why, with the
  on-chain evidence underneath (nonce grid, code before/after, transaction links). Any step can be opened before a run.
- **Live log:** the server-sent events of the run, always visible, with clickable transaction hashes.
- **Money panel:** victim (or vault) above, attacker below, plus the notifications the owner would see.
- **Saved to Arkiv:** recorded runs and blacklisted contracts, read from the public registry.

## Pages

| Route | What it does |
|---|---|
| `/` | Landing: thesis, real incident timeline, how the drain works (with two interactive explainers), defense comparison, Blacklist classifier, run instructions |
| `/attack` | Runs the real EIP-7702 drain (`/api/run` SSE) and fills panels A and B live; Arkiv record below |
| `/defense` | Chainwall walkthrough. The on-chain run is being rewired (`INTEGRATED` flag in `DefensePage.tsx`); all five steps are readable now |
| `/styleguide` | Live design-system reference |

## Interaction choices

- The balance eases down during the sweep, not a jump.
- The run indicator is the Binonce mark looping: nonces signing, one landing.
- Light and dark follow the system and can be toggled; the chain panels stay dark in both.
- On phones a sticky bottom bar keeps **Launch** within reach.
- Reduced motion: static end states, no loops, no intro.

## Event → UI mapping

The SSE stream (`setup`, `sign`, `sign-progress`, `sign-done`, `delegate*`, `verify`, `sweep*`, `after`,
`arkiv`, `done`) drives the step rail, the nonce grid, the alert, the notifications and the balance tween.
See [../attack/simulator.md](../attack/simulator.md).
