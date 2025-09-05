// /api/f360.js
// Faz login no F360 com email/senha e retorna parcelas em aberto

export default async function handler(req, res) {
  try {
    const base = process.env.F360_BASE_URL || "https://financas.f360.com.br";

    // 🔹 1. Faz login para pegar o token
    const loginUrl = `${base}/Account/LoginPublicAPI`;
    const loginBody = JSON.stringify({
      Email: process.env.F360_USER,
      Senha: process.env.F360_PASS,
    });

    const loginResp = await fetch(loginUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: loginBody,
    });

    if (!loginResp.ok) {
      const txt = await loginResp.text();
      return res.status(401).json({ error: "login_failed", detail: txt });
    }

    const loginJson = await loginResp.json();
    const token =
      loginJson.token || loginJson.Token || loginJson.jwt || loginJson.JWT;

    if (!token) {
      return res
        .status(401)
        .json({ error: "no_token", detail: loginJson });
    }

    // 🔹 2. Chama API de parcelas
    const hoje = new Date().toISOString().slice(0, 10); // yyyy-MM-dd
    const inicio = "2024-01-01"; // ajuste conforme necessário
    const fim = hoje;

    const parcelasUrl = `${base}/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos?pagina=1&inicio=${inicio}&fim=${fim}&status=Abertos`;

    const parcelasResp = await fetch(parcelasUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
    });

    if (!parcelasResp.ok) {
      const txt = await parcelasResp.text();
      return res
        .status(parcelasResp.status)
        .json({ error: "f360_error", detail: txt });
    }

    const parcelasJson = await parcelasResp.json();

    // 🔹 3. Mapeia para formato simples que o painel entende
    const dados = (parcelasJson?.Result?.Parcelas || []).map((p) => ({
      id: p.ParcelaId || "",
      empresa: p.Empresa?.Nome || "-",
      fornecedor: p.Empresa?.Inscricao || "-",
      vencimento: p.Vencimento || "",
      meioPagamento: p.Modalidade || "",
      historico: p.Observacoes || "",
      valor: p.ValorBruto || 0,
    }));

    return res.status(200).json(dados);
  } catch (e) {
    return res.status(502).json({ error: "f360_pull_failed", detail: String(e) });
  }
}
