/**
 * Tempo TIP-20 client for payments
 */

import {
  createClient,
  http,
  publicActions,
  walletActions,
  parseUnits,
  formatUnits,
  stringToHex,
  pad,
} from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';
import { tempoActions } from 'viem/tempo';

// TIP-20 AlphaUSD token address on Tempo testnet (Moderato)
const ALPHA_USD = '0x20c0000000000000000000000000000000000001' as const;

// Cost per action in USD (using small amounts for testnet)
export const COSTS = {
  parse: 0.001,  // $0.001 to parse a profile
  draft: 0.001,  // $0.001 to draft an email
} as const;

export type ActionType = keyof typeof COSTS;

/**
 * Encode a memo string into bytes32 format for TIP-20 transfers.
 * Max ~31 characters (32 bytes minus null padding).
 */
export function encodeMemo(memo: string): `0x${string}` {
  // Truncate if too long
  const truncated = memo.slice(0, 31);
  return pad(stringToHex(truncated), { size: 32 });
}

/**
 * Create a Tempo client from a private key
 */
export function createTempoClient(privateKey: string): { client: any; account: ReturnType<typeof privateKeyToAccount> } {
  const account = privateKeyToAccount(privateKey as `0x${string}`);

  const client = createClient({
    account,
    chain: tempoModerato,
    transport: http(),
  })
    .extend(publicActions)
    .extend(walletActions)
    .extend(tempoActions());

  return { client, account };
}

/**
 * Get the current AlphaUSD balance
 */
export async function getBalance(client: any, address: `0x${string}`): Promise<number> {
  const balance = await client.token.getBalance({
    token: ALPHA_USD,
    address,
  });
  return Number(formatUnits(balance, 6));
}

/**
 * Pay for an action with a structured memo
 */
export async function payForAction(
  client: any,
  action: ActionType,
  target: string,
): Promise<{ hash: string; memo: string; cost: number }> {
  const cost = COSTS[action];
  const memoString = `${action}:${target}`.slice(0, 31);
  const memoBytes32 = encodeMemo(memoString);

  const { receipt } = await client.token.transferSync({
    token: ALPHA_USD,
    to: client.account!.address, // Pay to self (simulating payment to service)
    amount: parseUnits(cost.toString(), 6),
    memo: memoBytes32,
  });

  return {
    hash: receipt.transactionHash,
    memo: memoString,
    cost,
  };
}

/**
 * Explorer URL for a transaction
 */
export function explorerUrl(hash: string): string {
  return `https://explore.tempo.xyz/tx/${hash}`;
}
