// /api/webhook-in.js
import { put, get } from '@vercel/blob';

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'method not allowed' });

  try {
    const body = await getBody(req);
    const incoming = Array.isArray(body) ? body : (body.data || body.items || [body]);

    // lê existentes
    let current = [];
    try {
      const existing = await get('f360/titulos.json');
      current = JSON.parse(await existing.text() || '[]');
    } catch (_) {}

    // mescla por id
    const byId = new Map(current.map(x => [String(x.id || x.tituloId || x.codigo), x]));
    for (const it of incoming) {
      const k = String(it.id || it.tituloId || it.codigo || Date.now());
      byId.set(k, { ...it, id: k });
    }
    const merged = Array.from(byId.values());

    await put('f360/titulos.json', JSON.stringify(merged), { access: 'public' });
    return res.status(200).json({ ok: true, stored: merged.length });
  } catch (e) {
    return res.status(500).json({ error: 'webhook_store_error', detail: String(e) });
  }
}

function getBody(req){
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', c => data += c);
    req.on('end', () => { try { resolve(JSON.parse(data || '{}')); } catch (e) { reject(e); } });
    req.on('error', reject);
  });
}
