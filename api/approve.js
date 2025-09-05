export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { id, status, motivo } = req.body || {};
  if (!id || !status) {
    return res.status(400).json({ error: 'id e status são obrigatórios' });
  }
  if (!['aprovar', 'negar'].includes(status)) {
    return res.status(400).json({ error: 'status inválido (use aprovar|negar)' });
  }

  try {
    const base = process.env.F360_BASE_URL.replace(/\/+$/, '');
    // Exemplos de caminhos comuns; deixe o 1º ativo. Se seu webhook usar outro, troque aqui:
    const url = `${base}/${encodeURIComponent(id)}/status`;
    // const url = `${base}/${encodeURIComponent(id)}/acao`;
    // const url = `${base}/atualizar`; // e enviar id no body

    const r = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.F360_API_KEY}`,
        'x-api-key': process.env.F360_API_KEY,
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({ status, motivo: motivo || '' })
    });

    if (!r.ok) {
      const txt = await r.text();
      return res.status(r.status).json({ error: 'F360 error', detail: txt });
    }

    const out = await r.json().catch(() => ({}));
    return res.status(200).json({ ok: true, ...out });
  } catch (e) {
    return res.status(500).json({ error: e.message || String(e) });
  }
}
