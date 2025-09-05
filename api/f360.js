export default async function handler(req, res) {
  // health check para login
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
    const base = process.env.F360_BASE_URL.replace(/\/+$/, ''); // sem / final
    const url = `${base}?status=aberto`; // ajuste aqui se seu provedor usar outro query param

    const r = await fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${process.env.F360_API_KEY}`,
        'x-api-key': process.env.F360_API_KEY,
        'Accept': 'application/json'
      }
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: 'F360 error', detail: txt });
    }

    const json = await r.json();
    // Tolerância de formato: aceita {data:[..]} ou array direto
    const list = Array.isArray(json) ? json : (Array.isArray(json.data) ? json.data : []);

    // Mapeamento tolerante de campos
    const parcelas = list.map(p => ({
      id: p.id || p.tituloId || p.uuid || String(p.codigo || ''),
      empresa: p.empresa_nome || p.empresa || p.filial || '-',
      fornecedor: p.fornecedor_nome || p.fornecedor || p.cliente_fornecedor || '-',
      vencimento: p.data_vencimento || p.vencimento || p.dtVenc || p.data || '-',
      meioPagamento: p.meio_pagamento || p.meio || p.forma_pagamento || null,
      historico: p.historico || p.descricao || p.obs || '',
      valor: Number(p.valor || p.valor_titulo || p.vlr || 0)
    })).filter(x => x.id);

    return res.status(200).json(parcelas);
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
