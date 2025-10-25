import dotenv from "dotenv";
import { Wallet } from "ethers";
dotenv.config();

console.log("🧾 Raw key from .env:", process.env.OWNER_PRIVATE_KEY);
console.log("📏 Length:", process.env.OWNER_PRIVATE_KEY.length);
console.log("🧠 First bytes:", Buffer.from(process.env.OWNER_PRIVATE_KEY).slice(0,10));

try {
  const wallet = new Wallet(process.env.OWNER_PRIVATE_KEY);
  console.log("✅ Wallet created:", wallet.address);
} catch (err) {
  console.error("❌ ERROR:", err);
}
