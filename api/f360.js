// /api/f360.js
import { list, get } from '@vercel/blob';

const readRaw = async (r) => {
  const text = await r.text();
  try { return { json: JSON.parse(text), text }; } catch { return { json: null, text }; }
};

const normalize = (payload) => {
  const arr = Array.isArray(payload) ? payload
    : (payload && Array.isArray(payload.data) ? payload.data
    : (payload && Array.isArray(payload.items) ? payload.items : []));
  return arr.map(p => ({
    id: p.id || p.tituloId || p.uuid || p.codigo || String(p.numero || ''),
    empresa: p.empresa_nome || p.empresa || p.filial || p.unidade || '-',
    fornecedor: p.fornecedor_nome || p.fornecedor || p.sacado || p.cliente_fornecedor || '-',
    vencimento: p.data_vencimento || p.vencimento || p.dtVenc || p.data || '-',
    meioPagamento: p.meio_pagamento || p.forma_pagamento || p.meio || p.forma || null,
    historico: p.historico || p.descricao || p.obs || '',
    valor: Number(p.valor || p.valor_titulo || p.vlr || p.total || 0)
  })).filter(x => x.id);
};

export const config = { runtime: 'nodejs' };

export default async function handler(req, res) {
  // Auth simples
  if (req.query.ping) {
    if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
      return res.status(401).json({ error: 'unauthorized' });
    }
    return res.status(200).json({ ok: true });
  }
  if (req.headers['x-admin-secret'] !== process.env.ADMIN_SECRET) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  // ----- MODO WEBHOOK (ler do Blob) -----
  if ((process.env.F360_MODE || 'pull').toLowerCase() === 'webhook') {
    try {
      const key = 'f360/titulos.json';
      const files = await list({ prefix: key });
      if (!files.blobs.length) return res.status(200).json([]); // vazio
      const blob = await get(files.blobs[0].url);
      const txt = await blob.text();
      if (req.query.debug) return res.status(200).send(txt);
      const json = JSON.parse(txt || '[]');
      const out = normalize(json);
      return res.status(200).json(out);
    } catch (e) {
      return res.status(500).json({ error: 'blob_read_error', detail: String(e) });
    }
  }

  // ----- MODO PULL (REST) -----
  const base = (process.env.F360_BASE_URL || '').replace(/\/+$/, '');
  const headers = {
    'Authorization': `Bearer ${process.env.F360_API_KEY}`,
    'x-api-key': process.env.F360_API_KEY,
    'Accept': 'application/json',
    'Content-Type': 'application/json'
  };

  const tries = [
    { method: 'GET',  url: `${base}?status=aberto` },
    { method: 'GET',  url: `${base}/abertos` },
    { method: 'GET',  url: `${base}/titulos?status=aberto` },
    { method: 'POST', url: `${base}/listar`, body: { status: 'aberto' } },
    { method: 'POST', url: `${base}`,        body: { acao: 'listar', status: 'aberto' } }
  ];

  const errors = [];
  for (const t of tries) {
    try {
      const r = await fetch(t.url, { method: t.method, headers, body: t.body ? JSON.stringify(t.body) : undefined });
      const { json, text } = await readRaw(r);
      if (req.query.debug) return res.status(r.status).send(text);
      if (!r.ok || !json) { errors.push({ try: t, status: r.status, text: text.slice(0,400) }); continue; }
      const out = normalize(json);
      return res.status(200).json(out);
    } catch (e) {
      errors.push({ try: t, error: String(e).slice(0,400) });
    }
  }

  if (req.query.debug) return res.status(502).send(JSON.stringify({ errors }, null, 2));
  return res.status(502).json({ error: 'f360_pull_failed', errors });
}
