// index.js
import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { verifyPayment } from "./utils/verifyPayment.js";
import nftABI from "./abi/X402punks.json" assert { type: "json" };

// --- Boot ---
const app = express();
app.use(cors());
app.use(express.json());

const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
console.log("🔑 Loaded key (last 6):", String(CONFIG.PRIVATE_KEY).slice(-6));
console.log("💼 Wallet address:", await wallet.getAddress());

const nft = new ethers.Contract(CONFIG.NFT_CONTRACT, nftABI, wallet);

// Optional health check
app.get("/", (_req, res) => res.json({ ok: true, network: CONFIG.NETWORK }));

// ---------- x402 CHECKOUT (402 response with payment request) ----------
app.post("/api/nft/checkout", async (req, res) => {
  // You can optionally accept { buyer } from the body, but it’s not required by x402.
  const paymentId = Math.random().toString(36).slice(2); // ephemeral client id (not used on-chain)

  // Minimal x402 style payload (your x402 gateway will wrap this into a 402 response to the client)
  return res.status(402).json({
    x402: {
      paymentId,
      amount: CONFIG.PRICE_USDC,     // e.g. "12.00"
      asset: "USDC",
      chain: CONFIG.NETWORK,         // "base"
      payTo: CONFIG.TREASURY,        // your treasury address (USDC receiver)
      description: `Mint 1 Punk NFT for ${CONFIG.PRICE_USDC} USDC`
    }
  });
});

// ---------- x402 NOTIFY (called by your gateway after USDC payment) ----------
app.post("/api/nft/notify", async (req, res) => {
  try {
    // Accept both minimal and verbose bodies from x402:
    // { txHash, paymentId?, resource?, payer? }
    const { txHash, paymentId, resource, payer: payerFromBody } = req.body || {};
    if (!txHash) return res.status(400).json({ error: "Missing txHash" });

    // 1) Verify the USDC transfer and extract the real payer (USDC sender)
    const { ok, payer: payerFromLogs } = await verifyPayment(txHash, CONFIG);
    if (!ok) return res.status(400).json({ error: "Payment not verified" });

    const payer = payerFromBody || payerFromLogs;
    if (!payer) return res.status(400).json({ error: "Missing payer (not found in logs or body)" });

    // 2) Build a stable anti-replay id if not provided
    //    We use keccak256(resource || "mint:x402punks:1" + ":" + txHash)
    const paymentIdFinal =
      paymentId || ethers.id(`${resource || "mint:x402punks:1"}:${txHash}`);

    console.log("✅ Verified payment. Payer:", payer);
    console.log("🧾 paymentId:", paymentIdFinal);

    // 3) Mint to the payer
    const tx = await nft.mintAfterPayment(payer, 1, paymentIdFinal);
    const receipt = await tx.wait();

    console.log("🪙 Minted token(s) to:", payer, "tx:", receipt.transactionHash);
    return res.json({
      ok: true,
      to: payer,
      qty: 1,
      mintTx: receipt.transactionHash
    });
  } catch (err) {
    console.error("❌ notify error:", err);
    return res.status(500).json({ error: err?.message || "Internal error" });
  }
});

app.listen(3000, () => console.log("✅ x402 backend running on port 3000"));
