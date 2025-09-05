// /api/_f360-helper.js
// utilitários compartilhados: login e chamada autenticada ao F360

export async function loginF360() {
  const url = "https://financas.f360.com.br/Account/LoginPublicAPI";
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      Email: process.env.F360_USER,
      Senha: process.env.F360_PASS,
    }),
  });
  const txt = await r.text();
  let json = null;
  try { json = JSON.parse(txt); } catch {}
  if (!r.ok) {
    throw new Error(`login_failed ${r.status}: ${txt}`);
  }
  const token = json?.token || json?.Token || json?.jwt || json?.JWT;
  if (!token) throw new Error(`login_ok_sem_token: ${txt}`);
  return token;
}

export async function f360Fetch(path, { method="GET", token, headers={}, body } = {}) {
  const base = "https://financas.f360.com.br";
  const url = `${base}/${path.replace(/^\/+/, "")}`;
  const r = await fetch(url, {
    method,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...headers,
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const txt = await r.text();
  let json = null;
  try { json = JSON.parse(txt); } catch {}
  return { ok: r.ok, status: r.status, text: txt, json };
}
