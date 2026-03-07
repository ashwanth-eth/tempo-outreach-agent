/**
 * Tempo TIP-20 client for two-sided payments
 * User wallet pays Agent wallet for services
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
export const ALPHA_USD = '0x20c0000000000000000000000000000000000001' as const;

// Cost per action in USD (using small amounts for testnet)
export const COSTS = {
  parse: 0.001,  // $0.001 to parse a profile
  draft: 0.001,  // $0.001 to draft an email
} as const;

export type ActionType = keyof typeof COSTS;

export type PaymentDirection = 'outbound' | 'inbound';

export interface PaymentResult {
  hash: string;
  memo: string;
  cost: number;
  from: `0x${string}`;
  to: `0x${string}`;
  direction: PaymentDirection;
}

/**
 * Encode a memo string into bytes32 format for TIP-20 transfers.
 * Max ~31 characters (32 bytes minus null padding).
 */
export function encodeMemo(memo: string): `0x${string}` {
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
 * User pays agent for a service action
 * Memo format: service:target:clientId (truncated to 31 chars)
 */
export async function payAgentForService(
  userClient: any,
  agentAddress: `0x${string}`,
  action: ActionType,
  target: string,
): Promise<PaymentResult> {
  const cost = COSTS[action];
  const userAddress = userClient.account!.address as `0x${string}`;

  // Memo format: action:target:client (client is shortened address)
  const clientId = userAddress.slice(0, 6);
  const memoString = `${action}:${target}:${clientId}`.slice(0, 31);
  const memoBytes32 = encodeMemo(memoString);

  const { receipt } = await userClient.token.transferSync({
    token: ALPHA_USD,
    to: agentAddress,
    amount: parseUnits(cost.toString(), 6),
    memo: memoBytes32,
  });

  return {
    hash: receipt.transactionHash,
    memo: memoString,
    cost,
    from: userAddress,
    to: agentAddress,
    direction: 'outbound', // From user's perspective
  };
}

/**
 * Explorer URL for a transaction
 */
export function explorerUrl(hash: string): string {
  return `https://explore.tempo.xyz/tx/${hash}`;
}
