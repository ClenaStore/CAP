// /api/_f360-helper.js
// utilitários: login + fetch autenticado

function candidatesLoginURLs() {
  const envUrl = (process.env.F360_LOGIN_URL || "").trim();
  const list = [];
  if (envUrl) list.push(envUrl); // 1) se você setar F360_LOGIN_URL, tentamos primeiro

  // 2) candidatos comuns (ordem importa)
  list.push(
    "https://financas.f360.com.br/Account/LoginPublicAPI",
    "https://financas.f360.com.br/api/Account/LoginPublicAPI",
    "https://api.f360.com.br/Account/LoginPublicAPI",
    "https://app.f360.com.br/Account/LoginPublicAPI",
    "https://financas.f360.com.br/PublicAPI/Account/LoginPublicAPI"
  );
  // remove duplicados
  return [...new Set(list)];
}

export async function loginF360() {
  if (process.env.F360_JWT && process.env.F360_JWT.trim()) {
    // fallback: use o JWT direto se você quiser
    return process.env.F360_JWT.trim();
  }

  const body = JSON.stringify({
    Email: process.env.F360_USER,
    Senha: process.env.F360_PASS,
  });

  const tried = [];
  for (const url of candidatesLoginURLs()) {
    try {
      const r = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
      });
      const text = await r.text();
      let json;
      try { json = JSON.parse(text); } catch {}
      if (r.ok && (json?.token || json?.Token || json?.jwt || json?.JWT)) {
        return json.token || json.Token || json.jwt || json.JWT;
      }
      tried.push({ url, status: r.status, body: text.slice(0, 800) });
    } catch (e) {
      tried.push({ url, error: String(e) });
    }
  }
  const err = { error: "login_failed", tried };
  throw new Error(JSON.stringify(err));
}

export async function f360Fetch(path, { method = "GET", token, headers = {}, body } = {}) {
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
  const text = await r.text();
  let json;
  try { json = JSON.parse(text); } catch {}
  return { ok: r.ok, status: r.status, text, json, url };
}
