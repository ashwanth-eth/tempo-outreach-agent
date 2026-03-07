# Tempo Testnet Notes

Learnings from building the outreach agent on Tempo testnet.

## Configuration

| Setting | Value |
|---------|-------|
| Network | Tempo Testnet (Moderato) |
| Chain ID | 42431 |
| RPC URL | https://rpc.moderato.tempo.xyz |
| Explorer | https://explore.tempo.xyz |
| viem chain | `tempoModerato` from `viem/chains` |

## TIP-20 Token Addresses

| Token | Address |
|-------|---------|
| AlphaUSD | `0x20c0000000000000000000000000000000000001` |
| BetaUSD | `0x20c0000000000000000000000000000000000002` |
| PathUSD | `0x20c0000000000000000000000000000000000003` |
| ThetaUSD | `0x20c0000000000000000000000000000000000004` |

## TIP-20 Memo Field

**Format:** `bytes32` (32 bytes, hex-encoded)

**Max string length:** 31 characters (32 bytes minus null padding)

**Encoding (viem):**
```typescript
import { stringToHex, pad } from 'viem';

function encodeMemo(memo: string): `0x${string}` {
  if (memo.length > 31) {
    throw new Error(`Memo too long: ${memo.length} chars (max 31)`);
  }
  return pad(stringToHex(memo), { size: 32 });
}
```

**Decoding:**
```typescript
import { fromHex } from 'viem';

const memo = fromHex(log.args.memo, 'string').replace(/\0/g, '');
```

**Example memo patterns for the agent:**
- `parse:JaneDoe` — profile parse action
- `draft:JaneDoe` — email draft action
- `agent:validate:v1` — validation/test action

## Validated Transactions

| Action | Hash | Explorer |
|--------|------|----------|
| Transfer (no memo) | `0x802b740e...` | [View](https://explore.tempo.xyz/tx/0x802b740eef64a2793bacf741074093b8841b96fd3a41bbe58112936561248ade) |
| Transfer (with memo) | `0xa4a14097...` | [View](https://explore.tempo.xyz/tx/0xa4a1409767337752c405170330770713e484b9e6088c6dd16bf6655e7e2aeb91) |

## viem Setup

```typescript
import { createClient, http, publicActions, walletActions } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { tempoModerato } from 'viem/chains';
import { tempoActions } from 'viem/tempo';

const client = createClient({
  account: privateKeyToAccount('0x...'),
  chain: tempoModerato,
  transport: http(),
})
  .extend(publicActions)
  .extend(walletActions)
  .extend(tempoActions());

// Transfer with memo
const { receipt } = await client.token.transferSync({
  token: '0x20c0000000000000000000000000000000000001', // AlphaUSD
  to: recipientAddress,
  amount: parseUnits('1.00', 6), // 6 decimals
  memo: encodeMemo('parse:JaneDoe'),
});
```

## Funding Testnet Wallet

Use the faucet: https://docs.tempo.xyz/quickstart/faucet

Or via RPC:
```bash
curl -X POST https://rpc.moderato.tempo.xyz \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","method":"tempo_fundAddress","params":["YOUR_ADDRESS"],"id":1}'
```

## Key Differences from Ethereum

| Feature | Ethereum | Tempo |
|---------|----------|-------|
| Native transfers | `sendTransaction` with `value` | Not allowed — use TIP-20 |
| Token standard | ERC-20 | TIP-20 (with memo, policies) |
| Memo field | No native support | Built into TIP-20 |
| Fee payment | ETH only | Any TIP-20 stablecoin |
| Decimals | 18 (ETH) | 6 (USD stablecoins) |
