/**
 * Arkiv (Golem Base) integration — The Blacklist.
 *
 * Writes a permissionless, wallet-signed registry of EIP-7702 activity to the
 * Arkiv Rabdi testnet: every attack (a `Delegation` + the sweeper `Delegate`
 * contract it used) and every mint. The dashboard reads it back.
 *
 * Everything here is BEST-EFFORT and fully guarded: if ARKIV_ACCESS_KEY /
 * ARKIV_PK are not set, or the network is unreachable, writes become no-ops and
 * reads return empty — the app keeps working. Only addr/str/dec value types are
 * used (the well-documented ones) so records are robust across SDK point releases.
 */
import { http, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";

const NAMESPACE = process.env.ARKIV_NAMESPACE || "chainwall";
const CHAIN = (process.env.ARKIV_CHAIN || "rabdi").toLowerCase();

export const EXPLORER = "https://rabdi.explorer.arkiv.network";

export function arkivEnabled() {
  return Boolean(process.env.ARKIV_ACCESS_KEY && process.env.ARKIV_PK);
}

export interface DelegationRecord {
  chain: string; victim: string; delegate: string; attacker: string; token: string;
  drained: string; delegateTx: string; sweepTx: string; block: string; status: string; ts: string;
}
export interface MintRecord {
  chain: string; token: string; to: string; amount: string; tx: string; block: string; ts: string;
}
export interface DelegateRecord {
  chain: string; address: string; bytecodeHash: string; label: string;
  labelSource?: string; delegatorCount: string; firstSeenBlock: string; ts: string;
}

// ── lazy, cached SDK context (never imported until configured) ────────────────
type Ctx = Awaited<ReturnType<typeof build>>;
let _ctx: Promise<Ctx> | null = null;

async function build() {
  const sdk = await import("@arkiv-network/sdk");
  const schema = await import("@arkiv-network/sdk/schema");
  const chains = await import("@arkiv-network/sdk/chains");
  const query = await import("@arkiv-network/sdk/query");
  const { str, addr, dec, defineSchema } = schema;

  const Delegation = defineSchema(`${NAMESPACE}.delegation`, {
    chain: str().indexed(),
    victim: addr().indexed(),
    delegate: addr().indexed(),
    attacker: addr().indexed(),
    token: addr(),
    drained: dec(),
    delegateTx: str(),
    sweepTx: str(),
    block: str(),
    status: str().indexed(),
    ts: str().indexed(),
  });

  const Delegate = defineSchema(`${NAMESPACE}.delegate`, {
    chain: str().indexed(),
    address: addr().indexed(),
    bytecodeHash: str(),
    label: str().indexed(),
    labelSource: str().optional(),
    delegatorCount: str(),
    firstSeenBlock: str(),
    ts: str(),
  });

  const Mint = defineSchema(`${NAMESPACE}.mint`, {
    chain: str().indexed(),
    token: addr().indexed(),
    to: addr().indexed(),
    amount: dec(),
    tx: str(),
    block: str(),
    ts: str(),
  });

  const chain = chains.rabdi({ accessKey: process.env.ARKIV_ACCESS_KEY ?? "" });
  const account = privateKeyToAccount(process.env.ARKIV_PK as Hex);
  const wallet = sdk.createWalletClient({ chain, transport: http(), account });
  const pub = sdk.createPublicClient({ chain, transport: http() });
  const { ExpirationTime } = sdk;
  return { sdk, schema, query, Delegation, Delegate, Mint, wallet, pub, account, ExpirationTime, str, addr, dec };
}

function ctx() {
  if (!_ctx) _ctx = build();
  return _ctx;
}

const LONG = (c: Ctx) => ({ expiration: c.ExpirationTime.fromDays(180) });

// ── writes ────────────────────────────────────────────────────────────────────
export async function recordDelegation(r: DelegationRecord): Promise<string | null> {
  if (!arkivEnabled()) return null;
  try {
    const c = await ctx();
    const { entityKey } = await c.wallet.createEntity(c.Delegation, {
      chain: r.chain, victim: c.addr(r.victim), delegate: c.addr(r.delegate), attacker: c.addr(r.attacker),
      token: c.addr(r.token), drained: c.dec(r.drained), delegateTx: r.delegateTx, sweepTx: r.sweepTx,
      block: r.block, status: r.status, ts: r.ts,
    }, LONG(c));
    return entityKey as string;
  } catch (e) { console.error("[arkiv] recordDelegation failed:", e); return null; }
}

export async function recordMint(r: MintRecord): Promise<string | null> {
  if (!arkivEnabled()) return null;
  try {
    const c = await ctx();
    const { entityKey } = await c.wallet.createEntity(c.Mint, {
      chain: r.chain, token: c.addr(r.token), to: c.addr(r.to), amount: c.dec(r.amount),
      tx: r.tx, block: r.block, ts: r.ts,
    }, LONG(c));
    return entityKey as string;
  } catch (e) { console.error("[arkiv] recordMint failed:", e); return null; }
}

/** Create the sweeper in the registry, or bump its delegatorCount if already there. */
export async function upsertDelegate(r: DelegateRecord): Promise<string | null> {
  if (!arkivEnabled()) return null;
  try {
    const c = await ctx();
    const { eq, and } = c.query;
    const { entities } = await c.pub
      .select({ $key: true, delegatorCount: true })
      .from(c.Delegate)
      .where(and(eq("chain", r.chain), eq("address", c.addr(r.address))))
      .ownedBy(c.account.address)
      .fetch();
    if (entities.length > 0) {
      const row = entities[0];
      const next = String((Number(val(row.delegatorCount)) || 0) + 1);
      await c.wallet.patchEntity(c.Delegate, row.$key, { set: { delegatorCount: next } });
      return row.$key;
    }
    const { entityKey } = await c.wallet.createEntity(c.Delegate, {
      chain: r.chain, address: c.addr(r.address), bytecodeHash: r.bytecodeHash, label: r.label,
      labelSource: r.labelSource ?? "chainwall-demo", delegatorCount: r.delegatorCount,
      firstSeenBlock: r.firstSeenBlock, ts: r.ts,
    }, LONG(c));
    return entityKey as string;
  } catch (e) { console.error("[arkiv] upsertDelegate failed:", e); return null; }
}

/**
 * Importer write: create or replace a delegate-registry entry with a fully
 * computed classification (label, delegatorCount). Unlike `upsertDelegate`
 * (which just +1s a count for the live demo), this sets the fields directly
 * from the chain scan. Idempotent on (chain, address).
 */
export async function importDelegate(r: DelegateRecord): Promise<{ key: string; created: boolean } | null> {
  if (!arkivEnabled()) return null;
  try {
    const c = await ctx();
    const { eq, and } = c.query;
    const { entities } = await c.pub
      .select({ $key: true })
      .from(c.Delegate)
      .where(and(eq("chain", r.chain), eq("address", c.addr(r.address))))
      .ownedBy(c.account.address)
      .fetch();
    if (entities.length > 0) {
      const key = entities[0].$key;
      await c.wallet.patchEntity(c.Delegate, key, {
        set: { label: r.label, labelSource: r.labelSource ?? "", delegatorCount: r.delegatorCount, firstSeenBlock: r.firstSeenBlock, ts: r.ts },
      });
      return { key: key as string, created: false };
    }
    const { entityKey } = await c.wallet.createEntity(c.Delegate, {
      chain: r.chain, address: c.addr(r.address), bytecodeHash: r.bytecodeHash, label: r.label,
      labelSource: r.labelSource ?? "", delegatorCount: r.delegatorCount, firstSeenBlock: r.firstSeenBlock, ts: r.ts,
    }, LONG(c));
    return { key: entityKey as string, created: true };
  } catch (e) { console.error("[arkiv] importDelegate failed:", e); return null; }
}

// ── reads ───────────────────────────────────────────────────────────────────
const val = (cell: unknown) =>
  cell && typeof cell === "object" && "value" in (cell as object) ? String((cell as { value: unknown }).value) : "";

export interface Activity {
  enabled: boolean;
  writer: string | null;
  delegations: (DelegationRecord & { key: string })[];
  mints: (MintRecord & { key: string })[];
  delegates: (DelegateRecord & { key: string })[];
}

export async function getActivity(): Promise<Activity> {
  if (!arkivEnabled()) return { enabled: false, writer: null, delegations: [], mints: [], delegates: [] };
  try {
    const c = await ctx();
    const owner = c.account.address;

    const dq = await c.pub.select({
      $key: true, chain: true, victim: true, delegate: true, attacker: true, token: true,
      drained: true, delegateTx: true, sweepTx: true, block: true, status: true, ts: true,
    }).from(c.Delegation).ownedBy(owner).fetch();

    const mq = await c.pub.select({
      $key: true, chain: true, token: true, to: true, amount: true, tx: true, block: true, ts: true,
    }).from(c.Mint).ownedBy(owner).fetch();

    const gq = await c.pub.select({
      $key: true, chain: true, address: true, bytecodeHash: true, label: true,
      labelSource: true, delegatorCount: true, firstSeenBlock: true, ts: true,
    }).from(c.Delegate).ownedBy(owner).fetch();

    const byTsDesc = (a: { ts: string }, b: { ts: string }) => Number(b.ts || 0) - Number(a.ts || 0);

    const delegations = dq.entities.map((e) => ({
      key: e.$key as string, chain: val(e.chain), victim: val(e.victim), delegate: val(e.delegate),
      attacker: val(e.attacker), token: val(e.token), drained: val(e.drained), delegateTx: val(e.delegateTx),
      sweepTx: val(e.sweepTx), block: val(e.block), status: val(e.status), ts: val(e.ts),
    })).sort(byTsDesc);

    const mints = mq.entities.map((e) => ({
      key: e.$key as string, chain: val(e.chain), token: val(e.token), to: val(e.to),
      amount: val(e.amount), tx: val(e.tx), block: val(e.block), ts: val(e.ts),
    })).sort(byTsDesc);

    const delegates = gq.entities.map((e) => ({
      key: e.$key as string, chain: val(e.chain), address: val(e.address), bytecodeHash: val(e.bytecodeHash),
      label: val(e.label), labelSource: val(e.labelSource), delegatorCount: val(e.delegatorCount),
      firstSeenBlock: val(e.firstSeenBlock), ts: val(e.ts),
    })).sort(byTsDesc);

    return { enabled: true, writer: owner, delegations, mints, delegates };
  } catch (e) {
    console.error("[arkiv] getActivity failed:", e);
    return { enabled: true, writer: null, delegations: [], mints: [], delegates: [] };
  }
}
