# Presenting this (UX + pitch)

What the research says about winning hackathon demos, applied to this project.

## What judges actually reward

- **A real, working project** — the demo "proves it works," not that it could. Ours executes a
  real on-chain 7702 drain; lean into that ("this is really happening, here are the tx hashes").
- **A clear "why"** — state the problem, who's hurt, why it matters, in the first 20 seconds.
  Ours: "Last week $6B left Binance through this exact mechanism."
- **A polished, explorable UI** — judges can look at it and get it instantly. The Binance clone does that.
- **One memorable moment** — the attack draining a familiar dashboard to zero.
- **Clean README + architecture** — judges skim it; ours leads with the "why" and a 60-second run.

## The #1 risk: live-demo failure

The most common way to lose is a demo that breaks on stage (dead wifi, slow testnet, empty
faucet). Mitigations, in order:

1. **Demo on local anvil**, not Sepolia. It's real and it cannot depend on the network. One
   command, sub-second runs, repeatable.
2. **Record a backup video** of the full flow (local + one Sepolia run) the night before. If
   anything fails live, play it.
3. **Pre-run `npm run chain` + `npm run setup`** before you walk up. Only "Launch attack" happens live.
4. Keep a **Sepolia run** or its explorer links as proof it's real on a public chain.

## The two-worlds UX (why it lands)

The screen shows both at once:
- **Light** = the victim's calm Binance dashboard (what the user sees).
- **Dark** = the attack trace: 50 nonces, the delegation marker, real tx hashes (what's actually happening).

The contrast *is* the story. Narrate it: "This is what Binance's dashboard showed. This is what
was really happening underneath." See [ui-ux.md](./ui-ux.md).

## 4-minute demo script

1. **Hook (20s)** — "On Oct 29, $6.3B left Binance in 20 minutes. Here's exactly how, and how to stop it."
2. **The break-in (60s)** — open the Binance dashboard ($2.5M). Click **Launch attack**. Narrate the
   trace: 50 authorizations, one nonce matches, the wallet is delegated to a sweeper, drained to zero.
   Point at the real tx hashes. "A valid signature was all it took."
3. **The three parts (90s)** —
   - 🔒 **The Lock** (Chainwall): same stolen key against a guarded account → rejected, because it
     holds funds in a contract (no EOA for 7702) and only pre-approved actions execute. (Show the
     `OKGuard` revert, or step through the vault walkthrough if the fork isn't wired yet.)
   - 📕 **The Blacklist** (Arkiv): a public, queryable list of sweeper contracts; run a live query.
   - 🚨 **The Alarm** (Chainlink CRE): detects the delegation and fires on-chain.
4. **Close (30s)** — "A valid signature is not an approved action." One line on what's next (ship The Lock on Arbitrum).

## Judge Q&A (rehearse these)

- *"Is this really on-chain?"* → Yes — real contracts, real type-4 tx, real `0xef0100` delegation. Here are the hashes. Also runs on Sepolia.
- *"Doesn't a leaked EOA key lose everything anyway?"* → Yes. That's the point — don't hold treasury in an EOA. The Lock holds it in a contract and only runs approved actions.
- *"Isn't this just Chainwall's product?"* → Chainwall powers The Lock. We built the attack replay, The Blacklist, and The Alarm around it.

## Submission (Devpost / ETHGlobal)

- Top of README = the "why" + a 60-second run.
- Link a demo video and the live local instructions.
- Select the 3 partner tracks + Finalist. See [../tracks/submission.md](../tracks/submission.md).
- Disclose AI usage per ETHGlobal rules.
