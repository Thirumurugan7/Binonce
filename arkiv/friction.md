# Friction — honest feedback building on Arkiv

Written as we built the importer + the live read path (`@arkiv-network/sdk` v1.0.1, Rabdi testnet).

## What tripped us up

- **Two generations of docs/SDK.** Search and some docs still describe the older
  `buildQuery` + string/numeric **annotation** API (v0.6-era), while the installed package is the
  schema-based API (`defineSchema`, `select().from().where()`). `arkiv.dev.golem.network/*` links
  308-redirect to `docs.arkiv.network/*` with a different structure. We had to read several pages to
  be sure which API was current. A one-line "you're reading the schema API; the annotation API is
  legacy" banner would have saved time.
- **Node version signal is contradictory.** The quickstart says "Node.js 22.10 or later," but the
  package's own `engines` is `>=18.0.0`, and it runs fine under Node 20 (Next.js server) and Bun.
  The 22.10 line is really about running raw `.ts` with `--experimental-strip-types`; worth
  separating "run a .ts file" from "runtime requirement."
- **Access key vs the public RPC.** It isn't obvious up front that the public RPC is heavily rate
  limited and you effectively need a Hub access key for anything real. The SDK logs a warning only
  after you call with an empty key. Flagging this in the install step would help.
- **`str` 128-byte limit, discovered at write time.** A 199-byte `labelSource` threw
  `InvalidValueError: 199 UTF-8 bytes exceeds the 128-byte limit`. The error is excellent (says
  exactly what to do — move long text to a `bytes` column), but the limit isn't prominent in the
  schema docs, so we hit it only on the first real write.
- **Only some value wrappers are well-documented.** `addr()`, `str()`, `dec()` and `bytes` have
  clear create examples; `u64`/`i32`/`bool` value construction is less obvious. We played it safe
  and stored display-only numbers (blocks, timestamps, counts) as `str`, which cost us range
  queries we didn't need anyway.
- **Explorer links aren't documented.** `docs/networks/rabdi` gives only the explorer root. The
  entity/tx URL format isn't published, and the explorer is a client-rendered SPA, so fetching it
  shows an empty body. We recovered the real routes (`/entity/<key>`, `/tx/<hash>`) by reading the
  explorer's JS bundle. Publishing the link format would be a small, high-value doc fix.

## What worked well

- **viem-native feel.** `createPublicClient` / `createWalletClient` with a `chain` from
  `@arkiv-network/sdk/chains` matched our existing viem code; the account/transport setup was
  immediately familiar.
- **Fluent queries.** `select({...}).from(Schema).where(and(eq(...))).ownedBy(addr).fetch()` reads
  cleanly, and `ownedBy` made per-writer provenance trivial.
- **Create → query round-trip.** Once the access key + a funded key were set, our first real
  write returned an `entityKey` and read straight back; `patchEntity` gave us idempotent upserts
  with no extra plumbing.
- **Schemas are a good fit** for a typed registry — indexed columns are exactly the fields
  consumers filter on, and the `arkiv.schema` namespace tag kept our three entity types cleanly
  separable.

## Suggestions

1. A single "current vs legacy API" banner on docs + top search results.
2. Put the `str`/`bytes` size limits and the value-wrapper table on the schema page.
3. Document the explorer entity/tx URL format (and ideally expose a server-rendered entity page).
4. Separate "runtime Node requirement" from "running `.ts` directly."
