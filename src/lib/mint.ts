import { parseUnits, formatUnits, createPublicClient, createWalletClient, http, defineChain, type Hex } from "viem";
import { privateKeyToAccount } from "viem/accounts";
import { ERC20_ABI } from "./abi";
import { chainConfig, WHITECHAIN_ID } from "./chains";

const DEC = 6;

export interface MintResult {
  tx: `0x${string}`;
  block: number;
  amount: string;        // human tUSD minted
  victim: `0x${string}`;
  token: `0x${string}`;
  balance: string;       // victim tUSD balance after
  chainId: number;       // the network it was minted on
}

/**
 * Mint `amount` (human tUSD) to the victim on the SELECTED network, the same chain, token and victim
 * the attack drains and the balance reads (see lib/attack.ts and /api/balance). The relayer pays gas.
 * `chainId` defaults to Whitechain (1874) to preserve the single-chain behaviour.
 */
export async function mintToVictim(amount: string, chainId?: number): Promise<MintResult> {
  const relayerPk = process.env.RELAYER_PK as Hex | undefined;
  const victimPk = process.env.VICTIM_PK as Hex | undefined;
  if (!relayerPk) throw new Error("RELAYER_PK missing, run setup first.");
  if (!victimPk) throw new Error("VICTIM_PK missing, run setup first.");
  const n = Number(amount);
  if (!Number.isFinite(n) || n <= 0) throw new Error("Amount must be a positive number.");

  // Resolve the network exactly like the attack does, so mint, drain and balance all agree.
  const net = chainConfig(chainId);
  const chain = defineChain({
    id: net.id, name: net.name,
    nativeCurrency: net.id === WHITECHAIN_ID ? { name: "WhiteBIT Coin", symbol: "WBT", decimals: 18 } : { name: "Ether", symbol: "ETH", decimals: 18 },
    rpcUrls: { default: { http: [net.rpc] } },
  });
  const relayer = privateKeyToAccount(relayerPk);
  const victimAddr = privateKeyToAccount(victimPk).address;
  const token = net.token;

  const pub = createPublicClient({ chain, transport: http(net.rpc) });
  const wallet = createWalletClient({ account: relayer, chain, transport: http(net.rpc) });

  const value = parseUnits(amount, DEC);
  const tx = await wallet.writeContract({ address: token, abi: ERC20_ABI, functionName: "mint", args: [victimAddr, value] });
  const rc = await pub.waitForTransactionReceipt({ hash: tx });
  const raw = (await pub.readContract({ address: token, abi: ERC20_ABI, functionName: "balanceOf", args: [victimAddr] })) as bigint;

  return {
    tx,
    block: Number(rc.blockNumber),
    amount,
    victim: victimAddr,
    token,
    balance: formatUnits(raw, DEC),
    chainId: net.id,
  };
}
