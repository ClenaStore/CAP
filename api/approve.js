// /api/approve.js
export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { id, status, motivo } = req.body || {};
  if (!id || !status) return res.status(400).json({ error: 'id e status são obrigatórios' });
  if (!['aprovar', 'negar'].includes(status)) {
    return res.status(400).json({ error: 'status inválido (use aprovar|negar)' });
  }

  const base = (process.env.F360_BASE_URL || '').replace(/\/+$/, '');
  const headers = {
    'Authorization': `Bearer ${process.env.F360_API_KEY}`,
    'x-api-key': process.env.F360_API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const tries = [
    { method: 'POST', url: `${base}/${encodeURIComponent(id)}/status`, body: { status, motivo: motivo || '' } },
    { method: 'POST', url: `${base}/${encodeURIComponent(id)}/acao`,   body: { acao: status, motivo: motivo || '' } },
    { method: 'POST', url: `${base}/atualizar`,                         body: { id, status, motivo: motivo || '' } }
  ];

  const errors = [];
  for (const t of tries) {
    try {
      const r = await fetch(t.url, { method: t.method, headers, body: JSON.stringify(t.body) });
      const txt = await r.text();
      if (!r.ok) { errors.push({ try: t, status: r.status, body: txt.slice(0, 400) }); continue; }
      return res.status(200).json({ ok: true, raw: txt });
    } catch (e) {
      errors.push({ try: t, error: String(e).slice(0, 400) });
    }
  }
  return res.status(502).json({ error: 'Falha ao enviar ação ao F360', tries: errors });
}
