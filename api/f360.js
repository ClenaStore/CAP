// /api/f360.js
let cacheToken = null;
let tokenExpira = 0;

async function getToken() {
  if (cacheToken && Date.now() < tokenExpira) return cacheToken;

  const r = await fetch(`${process.env.VERCEL_URL ? "https://" + process.env.VERCEL_URL : ""}/api/f360-login`);
  const json = await r.json();

  if (!json || !json.token) throw new Error("Não foi possível obter token do F360");

  cacheToken = json.token;
  tokenExpira = Date.now() + 1000 * 60 * 30; // 30 min
  return cacheToken;
}

export default async function handler(req, res) {
  try {
    const token = await getToken();

    const r = await fetch("https://financas.f360.com.br/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos", {
      method: "GET",
      headers: { "Authorization": `Bearer ${token}` }
    });

    const json = await r.json();
    res.status(r.status).json(json);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
