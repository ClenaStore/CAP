// /api/f360.js
// Backend para listar parcelas do F360 sem exigir senha extra

let cachedToken = null;
let tokenExpiration = null;

async function getToken() {
  if (cachedToken && tokenExpiration && Date.now() < tokenExpiration) {
    return cachedToken;
  }

  const res = await fetch("https://financas.f360.com.br/PublicAPI/Account/Login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Email: process.env.F360_USER,
      Senha: process.env.F360_PASS
    })
  });

  if (!res.ok) {
    const txt = await res.text();
    throw new Error("Erro login F360: " + res.status + " → " + txt);
  }

  const data = await res.json();
  const token = data.Token || data.token || data.jwt;
  if (!token) throw new Error("Token JWT não retornado pelo F360.");

  cachedToken = token;
  tokenExpiration = Date.now() + 10 * 60 * 1000; // 10 min
  return token;
}

export default async function handler(req, res) {
  try {
    const token = await getToken();
    const {
      tipo = "Ambos",
      tipoDatas = "Vencimento",
      status = "Aberto",
      inicio,
      fim,
      pagina = 1
    } = req.query;

    if (!inicio || !fim) {
      return res.status(400).json({ error: "Campos obrigatórios: inicio e fim (yyyy-MM-dd)" });
    }

    const url = `https://financas.f360.com.br/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos?pagina=${pagina}&tipo=${tipo}&inicio=${inicio}&fim=${fim}&tipoDatas=${tipoDatas}&status=${status}`;

    const r = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`
      }
    });

    const data = await r.json();
    if (!r.ok) {
      return res.status(r.status).json({ error: "Erro API F360", detail: data });
    }

    res.status(200).json(data);
  } catch (err) {
    console.error("Erro f360.js:", err);
    res.status(500).json({ error: err.message });
  }
}
