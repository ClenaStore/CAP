// /api/f360-login.js
export default async function handler(req, res) {
  try {
    const base = process.env.F360_BASE_URL || "https://financas.f360.com.br";
    const url = `${base}/Account/LoginPublicAPI`;

    const body = JSON.stringify({
      Email: process.env.F360_USER,
      Senha: process.env.F360_PASS,
    });

    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
    });

    const text = await r.text();
    res.status(r.status).send(text);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
