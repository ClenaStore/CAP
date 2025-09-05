// /api/f360.js
// Estratégia:
// - Usa base https://financas.f360.com.br
// - Tenta uma lista de caminhos mais comuns das PublicAPI de "Parcelas de Título"
// - Permite forçar um caminho via env F360_PATH
// - Envia Bearer JWT (F360_API_KEY)
// - Filtros: pagina=1, últimos 31 dias (formato yyyy-MM-dd)

function fmtDate(d = new Date()) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}
function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

const parseMaybeJson = (t) => { try { return JSON.parse(t); } catch { return null; } };

const normalizeTitulos = (payload) => {
  // Tenta capturar vários formatos comuns da PublicAPI do F360
  const arr =
    payload?.Result?.Parcelas ||
    payload?.Parcelas ||
    payload?.Result?.Items ||
    payload?.Items ||
    payload?.data ||
    payload?.items ||
    [];

  return arr
    .map((p) => ({
      id: p._id || p.Id || p.id || p.TituloId || p.ParcelaId || String(p.Numero || ""),
      empresa: p.Empresa?.Nome || p.Empresa || p.Filial || "-",
      fornecedor: p.Fornecedor || p.ClienteFornecedor || p.Sacado || "-",
      vencimento: p.Vencimento || p.DataVencimento || p.Data || "-",
      meioPagamento: p.MeioDePagamento || p.FormaPagamento || p.Forma || null,
      historico: p.Historico || p.Descricao || p.Observacoes || "",
      valor: Number(p.Valor || p.ValorBruto || p.ValorLiquido || 0),
    }))
    .filter((x) => x.id);
};

export const config = { runtime: "nodejs" };

export default async function handler(req, res) {
  // auth do painel
  if (req.query.ping) {
    if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: "unauthorized" });
    }
    return res.status(200).json({ ok: true });
  }
  if (req.headers["x-admin-secret"] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: "unauthorized" });
  }

  const base = (process.env.F360_BASE_URL || "").replace(/\/+$/, "");
  if (!base) return res.status(400).json({ error: "F360_BASE_URL ausente" });

  // período padrão: últimos 31 dias (conforme vários endpoints do F360 limitam a 31d)
  const fim = fmtDate(new Date());
  const inicio = fmtDate(addDays(new Date(), -31));
  const pagina = 1;

  // lista de caminhos prováveis para "Parcelas de Título"
  const forced = (process.env.F360_PATH || "").replace(/^\/+|\/+$/g, "");
  const candidates = [
    // se você souber a rota exata, defina F360_PATH e fica em primeiro
    ...(forced ? [forced] : []),

    // variações prováveis (plural/singular, nomes próximos)
    "ParcelasDeTitulosPublicAPI/ListarParcelasDeTitulos",
    "ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos",
    "ParcelasDeTitulosPublicAPI/ListarParcelas",
    "ParcelasDeTituloPublicAPI/ListarParcelas",
    "TitulosPublicAPI/ListarParcelasDeTitulos",
    "TitulosPublicAPI/ListarParcelas",
    "ParcelasPublicAPI/ListarParcelasDeTitulos",
    "ParcelasPublicAPI/ListarParcelas",

    // mesma coisa com prefixo /api (alguns ambientes exigem)
    "api/ParcelasDeTitulosPublicAPI/ListarParcelasDeTitulos",
    "api/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos",
    "api/ParcelasDeTitulosPublicAPI/ListarParcelas",
    "api/ParcelasDeTituloPublicAPI/ListarParcelas",
    "api/TitulosPublicAPI/ListarParcelasDeTitulos",
    "api/TitulosPublicAPI/ListarParcelas",
    "api/ParcelasPublicAPI/ListarParcelasDeTitulos",
    "api/ParcelasPublicAPI/ListarParcelas",
  ];

  const headers = {
    Authorization: `Bearer ${process.env.F360_API_KEY}`,
    Accept: "application/json",
    "Content-Type": "application/json",
  };

  const attempts = [];
  for (const path of candidates) {
    const url = `${base}/${path}?pagina=${pagina}&inicio=${encodeURIComponent(
      inicio
    )}&fim=${encodeURIComponent(fim)}`;
    try {
      const r = await fetch(url, { method: "GET", headers });
      const text = await r.text();

      // modo debug: devolve a primeira resposta crua
      if (req.query.debug) return res.status(r.status).send(text);

      if (!r.ok) {
        attempts.push({ path, status: r.status, body: text.slice(0, 200) });
        continue;
      }

      const json = parseMaybeJson(text);
      if (!json) {
        attempts.push({ path, status: r.status, body: "invalid json" });
        continue;
      }

      const out = normalizeTitulos(json);
      // mesmo que venha vazio, devolvemos vazio (não erro)
      return res.status(200).json(out);
    } catch (e) {
      attempts.push({ path, error: String(e).slice(0, 200) });
      continue;
    }
  }

  // se nada rolou, mostra as tentativas
  const payload = { error: "f360_paths_exhausted", tries: attempts };
  if (req.query.debug) return res.status(502).send(JSON.stringify(payload, null, 2));
  return res.status(502).json(payload);
}
