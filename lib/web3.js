import dotenv from "dotenv";
dotenv.config();

import { ethers } from "ethers";
import { readFileSync } from "fs";
import path from "path";
import { fileURLToPath } from "url";

// Resolve __dirname for ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Lee el JSON del ABI sin import assertions
const abiPath = path.join(__dirname, "../abi/X402punks.json");
const nftABI = JSON.parse(readFileSync(abiPath, "utf8"));

const CONFIG = {
  RPC_URL: process.env.RPC_URL,
  NFT_CONTRACT: process.env.NFT_CONTRACT,
  PRIVATE_KEY: process.env.OWNER_PRIVATE_KEY,
  TREASURY: process.env.TREASURY_ADDRESS,
  USDC: process.env.USDC_CONTRACT,
  NETWORK: "base",
  PRICE_USDC: "12.00",
};

let _provider, _wallet, _nft;

export function getConfig() {
  return CONFIG;
}
export function getProvider() {
  if (!_provider) _provider = new ethers.JsonRpcProvider(CONFIG.RPC_URL);
  return _provider;
}
export function getWallet() {
  if (!_wallet) _wallet = new ethers.Wallet(CONFIG.PRIVATE_KEY, getProvider());
  return _wallet;
}
export function getNft() {
  if (!_nft) _nft = new ethers.Contract(CONFIG.NFT_CONTRACT, nftABI, getWallet());
  return _nft;
}
