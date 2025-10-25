# x402punks — Changes for payer-directed mint

This patch makes the backend mint to the **USDC payer** (x402 sender) instead of the collection owner.

## What changed
- `utils/verifyPayment.js`: now returns `{ ok, payer }` by decoding the USDC `Transfer` log (`from` → `TREASURY`).
- `api/nft/notify.js` and `index.js` notify handlers:
  - Compute a stable `paymentId = keccak256(resource + ":" + txHash)` if not provided.
  - Call `mintAfterPayment(payer, 1, paymentId)` on the NFT contract.
- `.env.example` added with all required variables.

## What you must update after redeploy
1. **Set environment variables** (Vercel or local `.env`):
   - `RPC_URL`
   - `NFT_CONTRACT` → your NEW contract address
   - `OWNER_PRIVATE_KEY` → private key of the **owner** of the new contract
   - `TREASURY_ADDRESS` → USDC receiving wallet
   - `USDC_CONTRACT` (Base USDC)
   - `BASE_URL` (optional)
2. **ABI** already includes `mintAfterPayment` (see `abi/X402punks.json`).
3. **Ownership**: ensure your relayer wallet is the **contract owner** (or transfer ownership).
4. **x402scan**: keep the same `/api/nft/checkout` and `/api/nft/notify` endpoints; the notify now mints to payer.

## Test locally
- `npm install`
- `node index.js`
- Simulate a notify POST with body: 
```json
{
  "resource": "mint:x402punks:1",
  "txHash": "0x...",
  "paymentId": "0xoptional"
}
```
- The server will fetch logs for `txHash`, extract `payer`, and mint to them.
