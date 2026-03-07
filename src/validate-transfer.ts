/**
 * Validate TIP-20 Transfer on Tempo Testnet
 *
 * This script sends a TIP-20 stablecoin transfer with a structured memo
 * to verify the core payment primitive works before building the agent.
 *
 * Run: npm run validate
 */

import { createWalletClient, createPublicClient, http, parseUnits, formatUnits } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';

// Tempo Testnet configuration
const TEMPO_TESTNET = {
  id: 42431,
  name: 'Tempo Testnet',
  nativeCurrency: {
    name: 'USD',
    symbol: 'USD',
    decimals: 18,
  },
  rpcUrls: {
    default: { http: ['https://rpc.testnet.tempo.xyz'] },
  },
  blockExplorers: {
    default: { name: 'Tempo Explorer', url: 'https://explore.tempo.xyz' },
  },
} as const;

// Test memo structure for the outreach agent
const TEST_MEMO = {
  action: 'validate_transfer',
  agent: 'tempo-outreach-agent',
  version: '0.1.0',
  timestamp: new Date().toISOString(),
};

async function main() {
  // Load private key from environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY not set in environment');
    console.log('');
    console.log('To set up:');
    console.log('1. Copy .env.example to .env');
    console.log('2. Add your testnet private key');
    console.log('3. Fund your wallet via tempo_fundAddress RPC method');
    process.exit(1);
  }

  // Create account from private key
  const account = privateKeyToAccount(privateKey as `0x${string}`);
  console.log('Wallet address:', account.address);

  // Create clients
  const publicClient = createPublicClient({
    chain: TEMPO_TESTNET,
    transport: http(),
  });

  const walletClient = createWalletClient({
    account,
    chain: TEMPO_TESTNET,
    transport: http(),
  });

  // Check balance
  const balance = await publicClient.getBalance({ address: account.address });
  console.log('Balance:', formatUnits(balance, 18), 'USD');

  if (balance === 0n) {
    console.error('');
    console.error('Error: Wallet has no balance');
    console.log('Fund your wallet using the tempo_fundAddress RPC method');
    process.exit(1);
  }

  // Send a test transfer to self with memo
  // TODO: Verify the exact TIP-20 memo field format from Tempo docs
  // For now, encoding memo as hex data
  const memoHex = `0x${Buffer.from(JSON.stringify(TEST_MEMO)).toString('hex')}` as `0x${string}`;

  console.log('');
  console.log('Sending test transfer...');
  console.log('Memo:', JSON.stringify(TEST_MEMO, null, 2));

  try {
    const hash = await walletClient.sendTransaction({
      to: account.address, // Send to self for testing
      value: parseUnits('0.001', 18), // 0.001 USD
      data: memoHex,
    });

    console.log('');
    console.log('✓ Transaction sent!');
    console.log('Hash:', hash);
    console.log('Explorer:', `https://explore.tempo.xyz/tx/${hash}`);
    console.log('');
    console.log('Next steps:');
    console.log('1. Open the explorer link above');
    console.log('2. Verify the memo appears correctly in the transaction');
    console.log('3. Note any differences in memo format for docs/tempo-notes.md');

  } catch (error) {
    console.error('');
    console.error('Transaction failed:', error);
    process.exit(1);
  }
}

main();
