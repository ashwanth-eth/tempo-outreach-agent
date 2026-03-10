import { NextRequest, NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
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

const ALPHA_USD = '0x20c0000000000000000000000000000000000001' as const;

const COSTS = {
  parse: 0.001,
  draft: 0.001,
};

// Default agent configuration
const AGENT_CONFIG = {
  senderName: 'Ashwanth',
  senderContext: 'Builder exploring AI agents with autonomous payments',
  outreachPurpose: 'Connecting with people building in the AI + crypto space',
};

function encodeMemo(memo: string): `0x${string}` {
  const truncated = memo.slice(0, 31);
  return pad(stringToHex(truncated), { size: 32 });
}

function createTempoClient(privateKey: string) {
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

async function getBalance(client: any, address: `0x${string}`): Promise<number> {
  const balance = await client.token.getBalance({
    token: ALPHA_USD,
    address,
  });
  return Number(formatUnits(balance, 6));
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const image = formData.get('image') as File;
    const maxPerProfile = parseFloat(formData.get('maxPerProfile') as string);
    const maxTotal = parseFloat(formData.get('maxTotal') as string);
    const currentSpent = parseFloat(formData.get('currentSpent') as string) || 0;

    if (!image) {
      return NextResponse.json({ error: 'No image provided' }, { status: 400 });
    }

    const costPerProfile = COSTS.parse + COSTS.draft;

    // Check budget
    if (currentSpent + costPerProfile > maxTotal) {
      return NextResponse.json({
        skipped: true,
        reason: 'Would exceed total budget',
      });
    }

    if (costPerProfile > maxPerProfile) {
      return NextResponse.json({
        skipped: true,
        reason: 'Exceeds per-profile limit',
      });
    }

    // Check environment - now need both wallet keys
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY || process.env.PRIVATE_KEY;
    const userPrivateKey = process.env.USER_PRIVATE_KEY;
    const anthropicKey = process.env.ANTHROPIC_API_KEY;

    if (!agentPrivateKey || !userPrivateKey || !anthropicKey) {
      return NextResponse.json(
        { error: 'Missing environment variables (AGENT_PRIVATE_KEY, USER_PRIVATE_KEY, ANTHROPIC_API_KEY)' },
        { status: 500 }
      );
    }

    // Convert image to base64
    const bytes = await image.arrayBuffer();
    const base64 = Buffer.from(bytes).toString('base64');
    const mediaType = image.type as 'image/png' | 'image/jpeg' | 'image/webp';

    // Initialize clients - both user and agent wallets
    const anthropic = new Anthropic();
    const userWallet = createTempoClient(userPrivateKey);
    const agentWallet = createTempoClient(agentPrivateKey);

    const userAddress = userWallet.account.address;
    const agentAddress = agentWallet.account.address;

    // Step 1: Extract profile using Claude Vision
    const extractResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'image',
              source: {
                type: 'base64',
                media_type: mediaType,
                data: base64,
              },
            },
            {
              type: 'text',
              text: `Extract the LinkedIn profile information from this screenshot. Return ONLY a JSON object with these fields:
- name: Full name
- company: Current company name
- role: Current job title
- headline: LinkedIn headline (if visible)
- location: Location (if visible)
- about: Brief summary or about section (if visible)

If a field is not visible, omit it. Return ONLY the JSON object, no other text.`,
            },
          ],
        },
      ],
    });

    const extractContent = extractResponse.content[0];
    if (extractContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }

    let jsonStr = extractContent.text.trim();
    if (jsonStr.startsWith('```')) {
      jsonStr = jsonStr.replace(/^```(?:json)?\n?/, '').replace(/\n?```$/, '');
    }
    const profile = JSON.parse(jsonStr);

    // Step 2: User pays agent for parse action
    // Memo format: service:target:clientId
    const clientId = userAddress.slice(0, 6);
    const parseMemo = `parse:${profile.name}:${clientId}`.slice(0, 31);
    const { receipt: parseReceipt } = await (userWallet.client as any).token.transferSync({
      token: ALPHA_USD,
      to: agentAddress, // User pays agent
      amount: parseUnits(COSTS.parse.toString(), 6),
      memo: encodeMemo(parseMemo),
    });

    // Get updated balances after parse payment
    const userBalanceAfterParse = await getBalance(userWallet.client, userAddress);
    const agentBalanceAfterParse = await getBalance(agentWallet.client, agentAddress);

    // Step 3: Draft email
    const draftResponse = await anthropic.messages.create({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 1024,
      messages: [
        {
          role: 'user',
          content: `Write a personalized cold outreach email for the following person:

**Target Profile:**
- Name: ${profile.name}
- Role: ${profile.role}
- Company: ${profile.company}
${profile.headline ? `- Headline: ${profile.headline}` : ''}
${profile.about ? `- About: ${profile.about}` : ''}

**Sender Context:**
- Name: ${AGENT_CONFIG.senderName}
- Context: ${AGENT_CONFIG.senderContext}
- Purpose: ${AGENT_CONFIG.outreachPurpose}

**Instructions:**
1. Keep it under 150 words
2. Be genuine and specific — reference something about their role or company
3. Have a clear, low-friction ask (e.g., "Would you be open to a 15-minute call?")
4. No fake flattery or generic templates
5. Professional but warm tone

Return ONLY the email body (no subject line, no signature). Start with the greeting.`,
        },
      ],
    });

    const draftContent = draftResponse.content[0];
    if (draftContent.type !== 'text') {
      throw new Error('Unexpected response type from Claude');
    }
    const email = draftContent.text.trim();

    // Step 4: User pays agent for draft action
    const draftMemo = `draft:${profile.name}:${clientId}`.slice(0, 31);
    const { receipt: draftReceipt } = await (userWallet.client as any).token.transferSync({
      token: ALPHA_USD,
      to: agentAddress, // User pays agent
      amount: parseUnits(COSTS.draft.toString(), 6),
      memo: encodeMemo(draftMemo),
    });

    // Get final balances
    const userBalanceFinal = await getBalance(userWallet.client, userAddress);
    const agentBalanceFinal = await getBalance(agentWallet.client, agentAddress);

    return NextResponse.json({
      profile,
      email,
      transactions: {
        parse: {
          hash: parseReceipt.transactionHash,
          memo: parseMemo,
          cost: COSTS.parse,
          from: userAddress,
          to: agentAddress,
          direction: 'outbound',
        },
        draft: {
          hash: draftReceipt.transactionHash,
          memo: draftMemo,
          cost: COSTS.draft,
          from: userAddress,
          to: agentAddress,
          direction: 'outbound',
        },
      },
      totalCost: COSTS.parse + COSTS.draft,
      balances: {
        user: userBalanceFinal,
        agent: agentBalanceFinal,
      },
      wallets: {
        user: userAddress,
        agent: agentAddress,
      },
    });

  } catch (error) {
    console.error('Process error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

// New endpoint to get wallet info
export async function GET() {
  try {
    const agentPrivateKey = process.env.AGENT_PRIVATE_KEY || process.env.PRIVATE_KEY;
    const userPrivateKey = process.env.USER_PRIVATE_KEY;

    if (!agentPrivateKey || !userPrivateKey) {
      return NextResponse.json(
        { error: 'Missing wallet environment variables' },
        { status: 500 }
      );
    }

    const userWallet = createTempoClient(userPrivateKey);
    const agentWallet = createTempoClient(agentPrivateKey);

    const userBalance = await getBalance(userWallet.client, userWallet.account.address);
    const agentBalance = await getBalance(agentWallet.client, agentWallet.account.address);

    return NextResponse.json({
      wallets: {
        user: userWallet.account.address,
        agent: agentWallet.account.address,
      },
      balances: {
        user: userBalance,
        agent: agentBalance,
      },
    });
  } catch (error) {
    console.error('Get wallets error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}
