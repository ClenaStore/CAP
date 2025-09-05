// /api/f360.js
// Consulta parcelas do F360 fazendo login automático
// Runtime Node.js na Vercel

const parseMaybeJson = (t) => { try { return JSON.parse(t); } catch { return null; } };

function fmtDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const normalizeTitulos = (payload) => {
  const arr =
    payload?.Result?.Parcelas ||
    payload?.Parcelas ||
    payload?.Result?.Items ||
    payload?.Items ||
    payload?.data ||
    payload?.items ||
    [];
  return arr.map((p) => ({
    id: p._id || p.Id || p.id || p.TituloId || p.ParcelaId || String(p.Numero || ""),
    empresa: p.Empresa?.Nome || p.Empresa || p.Filial || "-",
    fornecedor: p.Fornecedor || p.ClienteFornecedor || p.Sacado || "-",
    vencimento: p.Vencimento || p.DataVencimento || p.Data || "-",
    meioPagamento: p.MeioDePagamento || p.FormaPagamento || p.Forma || null,
    historico: p.Historico || p.Descricao || p.Observacoes || "",
    valor: Number(p.Valor || p.ValorBruto || p.ValorLiquido || 0),
  })).filter((x) => x.id);
};

// === Faz login e retorna token JWT ===
async function getToken() {
  const url = `${process.env.F360_BASE_URL}/Account/LoginPublicAPI`;
  const body = JSON.stringify({
    Email: process.env.F360_USER,
    Senha: process.env.F360_PASS
  });
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });
  const txt = await r.text();
  const json = parseMaybeJson(txt);
  if (!r.ok) {
    throw new Error(`Erro login F360 (${r.status}): ${txt}`);
  }
  const token = json?.token || json?.Token || json?.jwt;
  if (!token) throw new Error("Login F360 sem token_jwt");
  return token;
}

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // 🔹 Primeiro: debug mostra a senha configurada no servidor
  if (req.query.debug === "secret") {
    return res.status(200).send(process.env.ADMIN_SECRET || "não definido");
  }

  // 🔹 Depois: valida a senha recebida no header
  if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  try {
    const token = await getToken();

    const base = process.env.F360_BASE_URL.replace(/\/+$/, "");
    const path = (process.env.F360_PATH || "").replace(/^\/+|\/+$/g, "");

    const inicio = fmtDate(addDays(new Date(), -31));
    const fim = fmtDate(new Date());

    const url = `${base}/${path}?pagina=1&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}`;

    const r = await fetch(url, {
      method: "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        Accept: "application/json"
      }
    });

    const txt = await r.text();
    if (req.query.debug) return res.status(r.status).send(txt);

    if (!r.ok) throw new Error(`Erro F360 ${r.status}: ${txt}`);

    const json = parseMaybeJson(txt);
    if (!json) throw new Error("Resposta inválida F360");

    const out = normalizeTitulos(json);
    return res.status(200).json(out);

  } catch (e) {
    console.error("Erro f360.js", e);
    return res.status(502).json({ error: "f360_login_or_fetch_failed", detail: String(e) });
  }
}
