import { getConfig, getNft } from "../../lib/web3.js";
import { ethers } from "ethers";
import { verifyPayment } from "../../utils/verifyPayment.js";

/**
 * Serverless notify endpoint for x402.
 * Accepts JSON body from x402: { x402Version, payer, resource, txHash, amount, ... }
 * Computes paymentId if not provided, verifies USDC transfer, and mints to `payer`.
 */
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.status(405).json({ error: "Method Not Allowed" });
    return;
  }

  const CONFIG = getConfig();
  const nft = getNft();

  try {
    const { payer: payerFromBody, resource, txHash, paymentId } = req.body || {};
    if (!txHash) return res.status(400).json({ error: "Missing txHash" });

    const { ok, payer: payerFromLogs } = await verifyPayment(txHash, CONFIG);
    if (!ok) return res.status(400).json({ error: "Payment not verified" });

    const payer = payerFromBody || payerFromLogs;
    if (!payer) return res.status(400).json({ error: "Missing payer" });

    const paymentIdFinal = paymentId || ethers.id(`${resource || "mint:x402punks:1"}:${txHash}`);

    const tx = await nft.mintAfterPayment(payer, 1, paymentIdFinal);
    const receipt = await tx.wait();

    res.json({ ok: true, to: payer, qty: 1, txHash: receipt.transactionHash });
  } catch (e) {
    console.error(e);
    res.status(500).json({ error: e.message });
  }
}
