// /api/nft/checkout.js
const PRICE_USDC = "12.00";                 // string con dos decimales
const NETWORK = "base";                     // debe ser "base"
const ASSET = "USDC";                       // string
const TREASURY = process.env.TREASURY_ADDRESS;  // VERIFICAR en Vercel
const BASE_URL = process.env.BASE_URL;          // opcional: e.g. https://x402punks.vercel.app

function baseUrl(req) {
  if (BASE_URL) return BASE_URL.replace(/\/+$/, "");
  const proto = String(req.headers["x-forwarded-proto"] || "https");
  const host = String(req.headers.host || "");
  return `${proto}://${host}`;
}

function buildPayload(req) {
  const resourceUrl = `${baseUrl(req)}/api/nft/notify`;
  return {
    x402Version: 1,
    accepts: [
      {
        scheme: "exact",
        network: NETWORK,
        maxAmountRequired: PRICE_USDC,
        resource: resourceUrl,
        description: `Mint 1 NFT via x402 for ${PRICE_USDC} USDC`,
        mimeType: "application/json",
        payTo: TREASURY,
        maxTimeoutSeconds: 300, // number, no string
        asset: ASSET
        // (sin outputSchema ni extra para minimizar rechazos)
      }
    ]
    // (sin payer ni error)
  };
}

export default async function handler(req, res) {
  // CORS + no cache
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET,HEAD,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  res.setHeader("Cache-Control", "no-store");

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  // HEAD: solo status 402 sin body (algunos validadores lo usan)
  if (req.method === "HEAD") {
    res.status(402).end();
    return;
  }

  // GET/POST: status 402 + JSON exacto
  const payload = buildPayload(req);
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  return res.status(402).end(JSON.stringify(payload));
}
