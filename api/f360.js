// /api/f360.js
const dayjs = (d = new Date()) => {
  const pad = n => String(n).padStart(2, '0');
  return {
    sub(days) {
      const dt = new Date(d);
      dt.setDate(dt.getDate() - days);
      return dayjs(dt);
    },
    fmt() {
      return `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
    }
  };
};

const normalizeTitulos = (payload) => {
  // Formato típico: { Ok: true, Result: { Parcelas: [ ... ] } }
  const arr = payload?.Result?.Parcelas || payload?.Parcelas || payload?.data || payload?.items || [];
  return arr.map(p => ({
    id: p._id || p.Id || p.id || p.TituloId || p.ParcelaId || String(p.Numero || ''),
    empresa: p.Empresa?.Nome || p.Empresa || p.Filial || '-',
    fornecedor: p.Fornecedor || p.ClienteFornecedor || p.Sacado || '-',
    vencimento: p.Vencimento || p.DataVencimento || p.Data || '-',
    meioPagamento: p.MeioDePagamento || p.FormaPagamento || p.Forma || null,
    historico: p.Historico || p.Descricao || p.Observacoes || '',
    valor: Number(p.Valor || p.ValorBruto || p.ValorLiquido || 0)
  })).filter(x => x.id);
};

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // auth do painel
  if (req.query.ping) {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    return res.status(200).json({ ok: true });
  }
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  try {
    const base = (process.env.F360_BASE_URL || '').replace(/\/+$/, '');
    if (!base) return res.status(400).json({ error: 'F360_BASE_URL ausente' });

    // filtros padrão: últimos 60 dias e "AbertosTodos"
    const hoje = dayjs().fmt();
    const inicio = (req.query.inicio || dayjs().sub(60).fmt());
    const fim = (req.query.fim || hoje);
    const pagina = Number(req.query.pagina || 1);
    const status = req.query.status || 'AbertosTodos'; // ajuste se sua conta usar outro texto

    const url = `${base}?pagina=${encodeURIComponent(pagina)}&inicio=${encodeURIComponent(inicio)}&fim=${encodeURIComponent(fim)}&status=${encodeURIComponent(status)}`;

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.F360_API_KEY}`,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      }
    });

    const text = await r.text();
    if (req.query.debug) return res.status(r.status).send(text);

    if (!r.ok) {
      return res.status(r.status).json({ error: 'f360_error', detail: text.slice(0, 2000) });
    }

    let json;
    try { json = JSON.parse(text); } catch { return res.status(502).json({ error: 'invalid_json', body: text.slice(0, 2000) }); }

    const out = normalizeTitulos(json);
    return res.status(200).json(out);
  } catch (e) {
    return res.status(500).json({ error: String(e) });
  }
}
