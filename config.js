import dotenv from "dotenv";
dotenv.config(); // ✅ ahora se ejecuta antes de leer process.env

export const CONFIG = {
  RPC_URL: process.env.RPC_URL,
  NFT_CONTRACT: process.env.NFT_CONTRACT,
  PRIVATE_KEY: process.env.OWNER_PRIVATE_KEY,
  TREASURY: process.env.TREASURY_ADDRESS,
  USDC: process.env.USDC_CONTRACT,
  NETWORK: "base",
  PRICE_USDC: "12.00"
};
