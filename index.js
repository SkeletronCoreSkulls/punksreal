// index.js
import express from "express";
import cors from "cors";
import { ethers } from "ethers";
import { CONFIG } from "./config.js";
import { verifyPayment } from "./utils/verifyPayment.js";
import nftABI from "./abi/X402punks.json" assert { type: "json" };

const app = express();
app.use(cors());
app.use(express.json());

const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
const wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, provider);
console.log("💼 Wallet address:", await wallet.getAddress());

const nft = new ethers.Contract(CONFIG.NFT_CONTRACT, nftABI, wallet);

// =============== HEALTH CHECK ===============
app.get("/", (_req, res) => res.json({ ok: true, network: CONFIG.NETWORK }));

// ======================================================
// ✅ STRICT x402 CHECKOUT ENDPOINT (required by x402scan)
// ======================================================
app.post("/api/nft/checkout", async (req, res) => {
  try {
    // Check that TREASURY is set correctly
    if (!CONFIG.TREASURY || !/^0x[a-fA-F0-9]{40}$/.test(CONFIG.TREASURY)) {
      return res.status(500).json({ error: "Invalid or missing TREASURY_ADDRESS" });
    }

    const resource = "mint:x402punks:1"; // Name of your resource
    const price = String(CONFIG.PRICE_USDC || "12.00");

    // This is the strict schema x402scan expects
    const body = {
      x402Version: 1,
      accepts: [
        {
          scheme: "exact",
          network: "base",
          maxAmountRequired: price,
          resource,
          description: `Mint 1 Punk NFT for ${price} USDC`,
          mimeType: "application/json",
          payTo: CONFIG.TREASURY, // must be valid 0x address
          maxTimeoutSeconds: 900, // 15 minutes
          asset: "USDC",

          outputSchema: {
            input: {
              type: "http",
              method: "POST",
              bodyType: "json",
              bodyFields: {
                txHash: {
                  type: "string",
                  required: true,
                  description: "USDC payment transaction hash on Base network"
                },
                payer: {
                  type: "string",
                  required: false,
                  description: "USDC sender (optional, auto-detected from logs)"
                },
                paymentId: {
                  type: "string",
                  required: false,
                  description: "Optional idempotency hash"
                }
              }
            },
            output: {
              ok: true,
              to: "0x<recipient>",
              qty: 1,
              mintTx: "0x<txhash>"
            }
          },

          extra: {
            project: "x402punks",
            version: "alpha"
          }
        }
      ]
    };

    res.setHeader("Content-Type", "application/json; charset=utf-8");
    return res.status(402).end(JSON.stringify(body));
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: e?.message || "Internal Error" });
  }
});

// ======================================================
// ✅ x402 NOTIFY ENDPOINT (mints NFT after payment verification)
// ======================================================
app.post("/api/nft/notify", async (req, res) => {
  try {
    const { txHash, paymentId, resource, payer: payerFromBody } = req.body || {};
    if (!txHash) return res.status(400).json({ error: "Missing txHash" });

    // Verify USDC payment and extract payer
    const { ok, payer: payerFromLogs } = await verifyPayment(txHash, CONFIG);
    if (!ok) return res.status(400).json({ error: "Payment not verified" });

    const payer = payerFromBody || payerFromLogs;
    if (!payer) return res.status(400).json({ error: "Missing payer" });

    const paymentIdFinal =
      paymentId || ethers.id(`${resource || "mint:x402punks:1"}:${txHash}`);

    console.log("✅ Verified payment from:", payer);
    console.log("🧾 paymentId:", paymentIdFinal);

    const tx = await nft.mintAfterPayment(payer, 1, paymentIdFinal);
    const receipt = await tx.wait();

    console.log("🪙 Mint successful:", receipt.transactionHash);

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

// optional HEAD for validation
app.head("/api/nft/checkout", (_req, res) => res.status(402).end());

app.listen(3000, () => console.log("✅ x402 backend running on port 3000"));
