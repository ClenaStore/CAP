// /api/f360.js
const asJsonSafe = async (r) => {
  const txt = await r.text();
  try { return {json: JSON.parse(txt), raw: txt}; } catch { return {json: null, raw: txt}; }
};

const normalizeList = (payload) => {
  const list = Array.isArray(payload) ? payload
             : (payload && Array.isArray(payload.data) ? payload.data
             : (payload && Array.isArray(payload.items) ? payload.items : []));
  return list.map(p => ({
    id: p.id || p.tituloId || p.uuid || p.codigo || String(p.numero || p.nro || ''),
    empresa: p.empresa_nome || p.empresa || p.filial || p.unidade || '-',
    fornecedor: p.fornecedor_nome || p.fornecedor || p.cliente_fornecedor || p.sacado || '-',
    vencimento: p.data_vencimento || p.vencimento || p.dtVenc || p.data || '-',
    meioPagamento: p.meio_pagamento || p.forma_pagamento || p.meio || p.forma || null,
    historico: p.historico || p.descricao || p.obs || p.historico_titulo || '',
    valor: Number(p.valor || p.valor_titulo || p.vlr || p.total || 0)
  })).filter(x => x.id);
};

export default async function handler(req, res) {
  // health check para validar senha no login
  if (req.query.ping) {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    return res.status(200).json({ ok: true });
  }

  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const base = (process.env.F360_BASE_URL || '').replace(/\/+$/, '');

  // Tentativas comuns (algumas contas exigem GET com path/param específico; outras POST)
  const attempts = [
    { method: 'GET',  url: `${base}?status=aberto` },
    { method: 'GET',  url: `${base}/abertos` },
    { method: 'GET',  url: `${base}/titulos?status=aberto` },
    { method: 'POST', url: `${base}/listar`, body: { status: 'aberto' } },
    { method: 'POST', url: `${base}`, body: { acao: 'listar', status: 'aberto' } },
  ];

  const headers = {
    'Authorization': `Bearer ${process.env.F360_API_KEY}`,
    'x-api-key': process.env.F360_API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const errors = [];
  for (const t of attempts) {
    try {
      const r = await fetch(t.url, {
        method: t.method,
        headers,
        body: t.body ? JSON.stringify(t.body) : undefined,
      });

      const { json, raw } = await asJsonSafe(r);

      if (!r.ok) {
        errors.push({ try: t, status: r.status, body: raw.slice(0, 400) });
        continue;
      }

      if (!json) {
        errors.push({ try: t, status: r.status, body: 'Resposta não-JSON' });
        continue;
      }

      const parcelas = normalizeList(json);
      if (parcelas.length) {
        return res.status(200).json(parcelas);
      } else {
        // Pode ser que a lista esteja vazia mesmo — devolve vazia mas com meta de debug
        return res.status(200).json([]);
      }
    } catch (e) {
      errors.push({ try: t, error: String(e).slice(0, 400) });
    }
  }

  // Se todas falharem, devolve detalhe para aparecer no front
  return res.status(502).json({
    error: 'Falha ao obter títulos do F360',
    tries: errors
  });
}
