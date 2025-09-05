// /api/f360-login.js
export default async function handler(req, res) {
  try {
    const r = await fetch("https://financas.f360.com.br/Account/LoginPublicAPI", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        Email: process.env.F360_USER,
        Senha: process.env.F360_PASS
      })
    });

    const json = await r.json();
    res.status(r.status).json(json);
  } catch (e) {
    res.status(500).json({ error: String(e) });
  }
}
