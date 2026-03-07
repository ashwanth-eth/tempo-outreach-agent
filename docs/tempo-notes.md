# Tempo Testnet Notes

Learnings from building the outreach agent on Tempo testnet.

## Configuration

- **Chain ID:** 42431
- **RPC URL:** https://rpc.testnet.tempo.xyz
- **Explorer:** https://explore.tempo.xyz
- **CAIP-2:** eip155:42431

## TIP-20 Memo Field

_To be filled in after running validate-transfer.ts_

**Format:**
- [ ] Field name in transaction
- [ ] Byte limit
- [ ] Encoding (hex? utf8?)
- [ ] How it appears in explorer

**Example memo structure:**
```json
{
  "action": "profile_parse",
  "target": "Jane Doe / Acme Corp",
  "provider": "pdf_extract",
  "cost": 0.001
}
```

## Funding Testnet Wallet

Use the `tempo_fundAddress` RPC method:

```bash
curl -X POST https://rpc.testnet.tempo.xyz \
  -H "Content-Type: application/json" \
  -d '{
    "jsonrpc": "2.0",
    "method": "tempo_fundAddress",
    "params": ["YOUR_WALLET_ADDRESS"],
    "id": 1
  }'
```

## Issues Encountered

_Document any issues and workarounds here_

---

## Resources

- [Tempo Docs](https://docs.tempo.xyz)
- [TIP-20 Standard](https://docs.tempo.xyz/guide/issuance/create-a-stablecoin)
- [Developer Tools](https://docs.tempo.xyz/quickstart/developer-tools)
