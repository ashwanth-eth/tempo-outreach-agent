/**
 * Core agent logic: process profiles, pay for actions, draft emails
 */

import type { Profile, ProfileResult, AgentConfig } from '../types/profile.js';
import { extractProfile, draftEmail } from './claude.js';
import {
  createTempoClient,
  getBalance,
  payForAction,
  explorerUrl,
  COSTS,
} from './tempo.js';

export interface AgentState {
  totalSpent: number;
  results: ProfileResult[];
  skipped: string[];
}

export interface ProcessOptions {
  onLog?: (message: string) => void;
}

/**
 * Process a single profile image through the agent pipeline
 */
export async function processProfile(
  imagePath: string,
  config: AgentConfig,
  state: AgentState,
  tempoClient: ReturnType<typeof createTempoClient>,
  options: ProcessOptions = {},
): Promise<ProfileResult | null> {
  const log = options.onLog || console.log;
  const costPerProfile = COSTS.parse + COSTS.draft;

  // Check spend cap before starting
  if (state.totalSpent + costPerProfile > config.maxTotal) {
    log(`⚠️  Skipping — would exceed total budget ($${config.maxTotal})`);
    state.skipped.push(imagePath);
    return null;
  }

  if (costPerProfile > config.maxPerProfile) {
    log(`⚠️  Skipping — cost exceeds per-profile limit ($${config.maxPerProfile})`);
    state.skipped.push(imagePath);
    return null;
  }

  // Step 1: Extract profile from image
  log(`📄 Extracting profile from ${imagePath}...`);
  const profile = await extractProfile(imagePath);
  log(`   Found: ${profile.name} — ${profile.role} at ${profile.company}`);

  // Step 2: Pay for parse action
  log(`💰 Paying for profile parse... ($${COSTS.parse})`);
  const parseTx = await payForAction(tempoClient.client, 'parse', profile.name);
  log(`   ✓ Paid — ${explorerUrl(parseTx.hash)}`);

  // Step 3: Draft email
  log(`✉️  Drafting email...`);
  const email = await draftEmail(profile, config);
  log(`   ✓ Draft complete (${email.split(' ').length} words)`);

  // Step 4: Pay for draft action
  log(`💰 Paying for email draft... ($${COSTS.draft})`);
  const draftTx = await payForAction(tempoClient.client, 'draft', profile.name);
  log(`   ✓ Paid — ${explorerUrl(draftTx.hash)}`);

  // Update state
  const totalCost = parseTx.cost + draftTx.cost;
  state.totalSpent += totalCost;

  const result: ProfileResult = {
    profile,
    email,
    transactions: {
      parse: { hash: parseTx.hash, memo: parseTx.memo },
      draft: { hash: draftTx.hash, memo: draftTx.memo },
    },
    totalCost,
  };

  state.results.push(result);
  log(`✅ Complete — Total spent: $${state.totalSpent.toFixed(4)}`);
  log('');

  return result;
}

/**
 * Process multiple profile images
 */
export async function processProfiles(
  imagePaths: string[],
  config: AgentConfig,
  privateKey: string,
  options: ProcessOptions = {},
): Promise<AgentState> {
  const log = options.onLog || console.log;
  const tempoClient = createTempoClient(privateKey);

  // Check initial balance
  const balance = await getBalance(tempoClient.client, tempoClient.account.address);
  log(`💳 Wallet: ${tempoClient.account.address}`);
  log(`💵 Balance: $${balance.toFixed(2)} AlphaUSD`);
  log(`📊 Budget: $${config.maxPerProfile}/profile, $${config.maxTotal} total`);
  log('');

  const state: AgentState = {
    totalSpent: 0,
    results: [],
    skipped: [],
  };

  for (let i = 0; i < imagePaths.length; i++) {
    log(`━━━ Profile ${i + 1}/${imagePaths.length} ━━━`);
    await processProfile(imagePaths[i], config, state, tempoClient, options);
  }

  return state;
}
