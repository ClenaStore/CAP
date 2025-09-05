// get-token.js
// Gera o token_jwt do F360
// Rode: node get-token.js

import fetch from "node-fetch";

const EMAIL = "souzanalbert58@gmail.com";
const SENHA = "@Central176";

async function gerarToken() {
  const url = "https://financas.f360.com.br/Account/LoginPublicAPI";
  const body = JSON.stringify({ Email: EMAIL, Senha: SENHA });

  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body
  });

  const text = await r.text();
  try {
    const json = JSON.parse(text);
    console.log("Resposta completa:", json);
    if (json.token || json.Token || json.jwt) {
      console.log("\n✅ Seu token_jwt é:");
      console.log(json.token || json.Token || json.jwt);
    } else {
      console.log("\n⚠️ Não achei campo token_jwt. Veja a resposta acima.");
    }
  } catch {
    console.log("Resposta não é JSON:", text);
  }
}

gerarToken();
