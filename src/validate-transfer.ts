/**
 * Validate TIP-20 Transfer on Tempo Testnet
 *
 * This script sends a TIP-20 stablecoin transfer with a structured memo
 * to verify the core payment primitive works before building the agent.
 *
 * Run: npm run validate
 */

import 'dotenv/config';
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

/**
 * Encode a memo string into bytes32 format for TIP-20 transfers.
 * Max ~31 characters (32 bytes minus null padding).
 */
function encodeMemo(memo: string): `0x${string}` {
  if (memo.length > 31) {
    throw new Error(`Memo too long: ${memo.length} chars (max 31)`);
  }
  return pad(stringToHex(memo), { size: 32 });
}

async function main() {
  // Load private key from environment (support both old and new names)
  const privateKey = process.env.AGENT_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: AGENT_PRIVATE_KEY not set in environment');
    console.log('');
    console.log('To set up:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your testnet private keys');
    console.log('3. Fund wallets via faucet: https://docs.tempo.xyz/quickstart/faucet');
    process.exit(1);
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('Wallet address:', account.address);

  // Create Tempo client with all extensions
  const client = createClient({
    account,
    chain: tempoModerato,
    transport: http(),
  })
    .extend(publicActions)
    .extend(walletActions)
    .extend(tempoActions());

  // Check TIP-20 token balance
  const balance = await (client.token.getBalance as (params: { token: `0x${string}`; address: `0x${string}` }) => Promise<bigint>)({
    token: ALPHA_USD,
    address: account.address,
  });
  console.log('USD Balance:', formatUnits(balance, 6), 'USD');

  if (balance === 0n) {
    console.error('');
    console.error('Error: Wallet has no USD balance');
    console.log('Fund your wallet using the faucet: https://docs.tempo.xyz/quickstart/faucet');
    process.exit(1);
  }

  // Test memo: action:target format (fits in 32 bytes)
  const memoString = 'agent:validate:v1';
  const memoBytes32 = encodeMemo(memoString);

  console.log('');
  console.log('Sending test transfer with memo...');
  console.log('Memo string:', memoString);
  console.log('Memo bytes32:', memoBytes32);

  try {
    // Send TIP-20 transfer with memo
    const { receipt } = await client.token.transferSync({
      token: ALPHA_USD,
      to: account.address, // Send to self for testing
      amount: parseUnits('0.001', 6), // 0.001 USD (6 decimals)
      memo: memoBytes32,
    });

    console.log('');
    console.log('✓ Transaction sent!');
    console.log('Hash:', receipt.transactionHash);
    console.log('Explorer:', `https://explore.tempo.xyz/tx/${receipt.transactionHash}`);
    console.log('');
    console.log('Validation complete! Memo field works.');

  } catch (error) {
    console.error('');
    console.error('Transaction failed:', error);
    process.exit(1);
  }
}

main();
