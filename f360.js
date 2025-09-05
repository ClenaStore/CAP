// ⚠️ Coloque seu usuário e senha do F360 aqui
const EMAIL = "SEU_EMAIL@F360.COM";
const SENHA = "SUA_SENHA";

async function getToken() {
  const res = await fetch("https://financas.f360.com.br/PublicAPI/Account/Login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ Email: EMAIL, Senha: SENHA })
  });

  if (!res.ok) throw new Error("Erro login F360: " + res.status);
  const data = await res.json();
  return data.Token || data.token || data.jwt;
}

async function carregar() {
  document.getElementById("erro").innerText = "";
  document.getElementById("tabela").innerHTML = "<tr><td colspan=7>Carregando...</td></tr>";

  const tipo = document.getElementById("tipo").value;
  const tipoDatas = document.getElementById("tipoDatas").value;
  const status = document.getElementById("status").value;
  const inicio = document.getElementById("inicio").value;
  const fim = document.getElementById("fim").value;

  if (!inicio || !fim) {
    document.getElementById("erro").innerText = "Por favor, selecione datas de Início e Fim.";
    return;
  }

  try {
    const token = await getToken();
    const url = `https://financas.f360.com.br/ParcelasDeTituloPublicAPI/ListarParcelasDeTitulos?pagina=1&tipo=${tipo}&inicio=${inicio}&fim=${fim}&tipoDatas=${tipoDatas}&status=${status}`;

    const r = await fetch(url, {
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` }
    });

    const data = await r.json();
    if (!r.ok) throw new Error(JSON.stringify(data));

    const lista = data?.Result?.Parcelas || [];
    if (!lista.length) {
      document.getElementById("tabela").innerHTML = "<tr><td colspan=7>Nenhum registro encontrado.</td></tr>";
      return;
    }

    document.getElementById("tabela").innerHTML = lista.map(p => `
      <tr>
        <td>${p.DadosDoTitulo?.Empresa?.Nome || ""}</td>
        <td>${p.DadosDoTitulo?.ClienteFornecedor?.Nome || ""}</td>
        <td>${p.Vencimento || ""}</td>
        <td>${p.MeioDePagamento || ""}</td>
        <td>${p.DadosDoTitulo?.Observacao || ""}</td>
        <td>${(p.ValorBruto||0).toLocaleString("pt-BR",{style:"currency",currency:"BRL"})}</td>
        <td>${p.Status || ""}</td>
      </tr>
    `).join("");
  } catch (err) {
    document.getElementById("tabela").innerHTML = "";
    document.getElementById("erro").innerText = "Erro: " + err.message;
  }
}

function ultimos31() {
  const hoje = new Date();
  const fim = hoje.toISOString().split("T")[0];
  const inicio = new Date(hoje.getTime() - 31*24*60*60*1000).toISOString().split("T")[0];
  document.getElementById("inicio").value = inicio;
  document.getElementById("fim").value = fim;
  carregar();
}

window.onload = ultimos31;
