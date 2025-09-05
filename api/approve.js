// /api/approve.js
// aprova uma parcela no F360 (tenta múltiplas rotas públicas conhecidas)

import { loginF360, f360Fetch } from "./_f360-helper.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method_not_allowed" });
  }

  try {
    const { id, motivo } = await req.json?.() ?? await (async () => {
      try { return await req.clone().json(); } catch { return {}; }
    })();
    if (!id) return res.status(400).json({ error: "missing_id" });

    const token = await loginF360();

    // candidatos de rota (ajuste aqui se você souber a rota exata da sua conta)
    const tries = [
      { path: "ParcelasDeTituloPublicAPI/Aprovar", body: { ParcelaId: id, Motivo: motivo || "" } },
      { path: "TitulosPublicAPI/AprovarParcela", body: { ParcelaId: id, Motivo: motivo || "" } },
      { path: "ParcelasPublicAPI/Aprovar", body: { ParcelaId: id, Motivo: motivo || "" } },
    ];

    for (const t of tries) {
      const r = await f360Fetch(t.path, { method: "POST", token, body: t.body });
      if (r.ok) return res.status(200).json({ ok: true, path: t.path, result: r.json ?? r.text });
      if (r.status === 401) return res.status(401).json({ error: "token_invalido_ou_expirado" });
    }

    return res.status(502).json({ error: "approve_paths_exhausted", tries });
  } catch (e) {
    return res.status(500).json({ error: "approve_error", detail: String(e) });
  }
}
