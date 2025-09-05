export default async function handler(req, res) {
  try {
    const r = await fetch(`${process.env.F360_BASE_URL}/titulos/abertos`, {
      headers: { Authorization: `Bearer ${process.env.F360_API_KEY}` }
    });
    const data = await r.json();

    // Ajustar o parser conforme retorno real da API F360
    const parcelas = data.map(p => ({
      id: p.id,
      empresa: p.empresa_nome,
      fornecedor: p.fornecedor_nome,
      vencimento: p.data_vencimento,
      meioPagamento: p.meio_pagamento,
      historico: p.historico
    }));

    res.status(200).json(parcelas);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
