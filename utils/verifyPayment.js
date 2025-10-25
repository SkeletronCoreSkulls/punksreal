import { ethers } from "ethers";

/**
 * Verify USDC payment and extract payer address from tx logs.
 * Returns: { ok: boolean, payer?: string }
 */
export async function verifyPayment(txHash, CONFIG) {
  const provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  const tx = await provider.getTransactionReceipt(txHash);
  if (!tx || !tx.logs) return { ok: false };

  const USDC_IFACE = new ethers.Interface([
    "event Transfer(address indexed from, address indexed to, uint256 value)"
  ]);

  for (const log of tx.logs) {
    try {
      const parsed = USDC_IFACE.parseLog(log);
      if (
        parsed.name === "Transfer" &&
        String(parsed.args.to).toLowerCase() === String(CONFIG.TREASURY).toLowerCase()
      ) {
        const amount = Number(ethers.formatUnits(parsed.args.value, 6));
        if (amount >= Number(CONFIG.PRICE_USDC)) {
          const payer = ethers.getAddress(parsed.args.from);
          return { ok: true, payer };
        }
      }
    } catch {
      continue;
    }
  }

  return { ok: false };
}
