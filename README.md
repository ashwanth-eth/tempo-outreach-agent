# Tempo Outreach Agent

An AI agent that reads LinkedIn profiles, drafts personalized cold emails, and pays for every action autonomously in TIP-20 stablecoins on Tempo testnet — with a full spend-controlled audit trail embedded in each transaction memo.

## Why Tempo?

| Feature | Base + USDC | Tempo TIP-20 |
|---------|-------------|--------------|
| Memo field on transfers | No | Yes — structured data in every tx |
| Spend controls | App-level smart contract | Protocol-level TIP-20 policy hooks |
| Fee token | ETH (volatile) | USD stablecoin natively |
| Payment lanes | No | Yes — payments never congested |

The agent's audit trail isn't stored in a database — it's embedded in the payment itself.

## How It Works

For each LinkedIn profile:

1. **Parse profile** — Extract name, company, role from PDF
   → TIP-20 payment with memo: `{action: "profile_parse", target: "Jane Doe / Acme"}`

2. **Draft email** — Claude synthesizes a personalized cold email
   → TIP-20 payment with memo: `{action: "draft_generated", target: "Jane Doe / Acme"}`

3. **Spend cap check** — Before each step, agent checks remaining budget. If exceeded, contact is skipped and flagged.

Every payment is logged with a Tempo explorer link.

## Setup

```bash
# Install dependencies
npm install

# Copy environment template
cp .env.example .env

# Add your testnet private key to .env
# Fund your wallet via tempo_fundAddress RPC method

# Validate TIP-20 transfer works
npm run validate
```

## Stack

- **Frontend:** Next.js + Tailwind
- **Wallet:** Privy (Tempo testnet)
- **Transfers:** viem + Tempo wagmi hooks
- **AI:** Claude API
- **Output:** docx/PDF generation

## Links

- [Tempo Docs](https://docs.tempo.xyz)
- [Block Explorer](https://explore.tempo.xyz)
- [TIP-20 Standard](https://docs.tempo.xyz/guide/issuance/create-a-stablecoin)
