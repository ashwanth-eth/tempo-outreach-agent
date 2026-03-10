#!/usr/bin/env node
/**
 * CLI for the Tempo Outreach Agent
 *
 * Usage: npm run agent -- <image1.png> [image2.png ...]
 */

import 'dotenv/config';
import * as fs from 'fs';
import * as path from 'path';
import { processProfiles } from './lib/agent.js';
import type { AgentConfig } from './types/profile.js';

// Default configuration
const DEFAULT_CONFIG: AgentConfig = {
  maxPerProfile: 0.01,  // $0.01 per profile
  maxTotal: 0.10,       // $0.10 total budget
  senderName: 'Ashwanth',
  senderContext: 'Builder exploring AI agents with autonomous payments',
  outreachPurpose: 'Connecting with people building in the AI + crypto space',
};

async function main() {
  // Check environment
  const privateKey = process.env.PRIVATE_KEY;
  if (!privateKey) {
    console.error('Error: PRIVATE_KEY not set in .env');
    process.exit(1);
  }

  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  if (!anthropicKey) {
    console.error('Error: ANTHROPIC_API_KEY not set in .env');
    console.log('');
    console.log('Get your API key at: https://console.anthropic.com');
    process.exit(1);
  }

  // Get image paths from arguments
  const args = process.argv.slice(2);
  if (args.length === 0) {
    console.log('Tempo Outreach Agent');
    console.log('');
    console.log('Usage: npm run agent -- <image1.png> [image2.png ...]');
    console.log('');
    console.log('Options:');
    console.log('  --max-per-profile <usd>  Max spend per profile (default: 0.01)');
    console.log('  --max-total <usd>        Max total spend (default: 0.10)');
    console.log('');
    console.log('Example:');
    console.log('  npm run agent -- profile1.png profile2.png');
    process.exit(0);
  }

  // Parse arguments
  const imagePaths: string[] = [];
  const config = { ...DEFAULT_CONFIG };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    if (arg === '--max-per-profile' && args[i + 1]) {
      config.maxPerProfile = parseFloat(args[++i]);
    } else if (arg === '--max-total' && args[i + 1]) {
      config.maxTotal = parseFloat(args[++i]);
    } else if (!arg.startsWith('--')) {
      // Resolve path relative to cwd
      const fullPath = path.resolve(process.cwd(), arg);
      if (!fs.existsSync(fullPath)) {
        console.error(`Error: File not found: ${arg}`);
        process.exit(1);
      }
      imagePaths.push(fullPath);
    }
  }

  if (imagePaths.length === 0) {
    console.error('Error: No image files provided');
    process.exit(1);
  }

  console.log('');
  console.log('🤖 Tempo Outreach Agent');
  console.log('========================');
  console.log('');

  // Process profiles
  const state = await processProfiles(imagePaths, config, privateKey);

  // Print summary
  console.log('');
  console.log('━━━ Summary ━━━');
  console.log(`✅ Processed: ${state.results.length} profiles`);
  console.log(`⚠️  Skipped: ${state.skipped.length} profiles`);
  console.log(`💰 Total spent: $${state.totalSpent.toFixed(4)}`);
  console.log('');

  // Print drafted emails
  if (state.results.length > 0) {
    console.log('━━━ Drafted Emails ━━━');
    for (const result of state.results) {
      console.log('');
      console.log(`To: ${result.profile.name} (${result.profile.role} at ${result.profile.company})`);
      console.log('---');
      console.log(result.email);
      console.log('---');
      console.log(`Parse tx: ${result.transactions.parse.hash}`);
      console.log(`Draft tx: ${result.transactions.draft.hash}`);
      console.log('');
    }
  }
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
