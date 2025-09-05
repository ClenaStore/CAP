// /api/f360.js
import { loginF360, f360Fetch } from "./_f360-helper.js";

const pad = (n) => String(n).padStart(2, "0");
const fmt = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;

export default async function handler(req, res) {
  try {
    const {
      tipo = "Ambos",
      tipoDatas = "Vencimento",
      status = "Aberto",
      inicio,
      fim,
    } = req.query || {};

    // defaults: últimos 31 dias, se não vier do front
    const end = fim ? new Date(fim) : new Date();
    const start = inicio ? new Date(inicio) : new Date();
    if (!inicio) start.setDate(end.getDate() - 31);

    const token = await loginF360();

    // conforme doc, obrigatórios: pagina, tipo, inicio, fim, tipoDatas
    const basePath = "ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos";
    const q = new URLSearchParams({
      pagina: "1",
      tipo,
      inicio: fmt(start),
      fim: fmt(end),
      tipoDatas,
    });
    if (status && status !== "Todos") q.set("status", status);

    const path = `${basePath}?${q.toString()}`;
    const r = await f360Fetch(path, { token });
    if (!r.ok) {
      return res.status(r.status).json({
        error: "f360_list_failed",
        status: r.status,
        path: r.url,
        body: r.text?.slice(0, 2000),
      });
    }
    return res.status(200).json(r.json || { raw: r.text });
  } catch (e) {
    return res.status(502).json({ error: "f360_pull_failed", detail: String(e) });
  }
}
