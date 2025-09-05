// /api/f360.js
// Lista "Parcelas de Títulos" conforme a documentação pública do F360.
// Requer variáveis na Vercel: F360_USER e F360_PASS.

import { loginF360, f360Fetch } from "./_f360-helper.js";

function fmt(d) {
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export default async function handler(req, res) {
  try {
    const token = await loginF360();

    // período máximo: 31 dias (doc)
    const fim = new Date();
    const inicio = new Date();
    inicio.setDate(fim.getDate() - 31);

    // parâmetros obrigatórios da doc:
    // tipo (Ambos), inicio, fim, tipoDatas (tentamos Vencimento depois Emissão), pagina=1
    const basePath = "ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos";
    const common = `pagina=1&tipo=Ambos&inicio=${fmt(inicio)}&fim=${fmt(fim)}`;

    const tries = [
      `${basePath}?${common}&tipoDatas=Vencimento&status=Aberto`,
      `${basePath}?${common}&tipoDatas=Emissão&status=Aberto`,
    ];

    let last = null;
    for (const path of tries) {
      const r = await f360Fetch(path, { token });
      if (r.ok && (r.json?.Result?.Parcelas || r.json?.Parcelas)) {
        // Devolvemos o payload cru da API para o front (mais fácil mapear)
        return res.status(200).json(r.json);
      }
      last = { pathTried: path, status: r.status, body: r.text };
      // se 4xx/5xx, tenta a próxima variação
    }

    return res
      .status(last?.status || 502)
      .json({ error: "f360_list_failed", last_try: last, hint:
        "Verifique se sua conta tem dados no período, se o status 'Aberto' existe e " +
        "se 'tipoDatas' é aceito como 'Vencimento' ou 'Emissão' na sua instância."
      });
  } catch (e) {
    return res.status(502).json({ error: "f360_pull_failed", detail: String(e) });
  }
}
