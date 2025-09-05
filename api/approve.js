export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const { id, status } = req.body;

  try {
    const r = await fetch(`${process.env.F360_BASE_URL}/titulos/${id}/aprovar`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.F360_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ status }) // aprovar | negar
    });
    const result = await r.json();
    res.status(200).json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
