# Painel de Aprovação de Parcelas – F360

Painel web + APIs (Vercel) para listar **títulos em aberto** do F360 e **aprovar/neg ar**.

## 1) Variáveis de Ambiente (Vercel → Settings → Environment Variables)

- `F360_API_KEY` → sua chave do F360
- `F360_BASE_URL` → seu endpoint base (ex.: `https://webhook.f360.com.br/.../f360-...-titulos`)
- `ADMIN_SECRET` → senha do painel (defina você)
- `F360_MODE` → `pull` (REST) **ou** `webhook` (para ler do Vercel Blob)
- `BLOB_BUCKET` → `default`

> **Nunca** commitar `.env` com credenciais.

## 2) Modos de Operação

### Modo `pull` (REST)
- O painel chama `/api/f360` que tenta múltiplas rotas/métodos comuns:
  - `GET {BASE}?status=aberto`
  - `GET {BASE}/abertos`
  - `GET {BASE}/titulos?status=aberto`
  - `POST {BASE}/listar  { status: 'aberto' }`
  - `POST {BASE}         { acao: 'listar', status: 'aberto' }`
- Use o botão **Ver debug** no painel para ver a resposta crua e ajustar `F360_BASE_URL`/rota se necessário.

### Modo `webhook`
- Defina `F360_MODE=webhook`.
- Configure seu F360 para enviar os eventos para:
  - `https://SEUAPP.vercel.app/api/webhook-in`
- A API salva/mescla os títulos recebidos em `f360/titulos.json` (Vercel Blob).
- O painel lê esse arquivo via `/api/f360`.

## 3) Aprovação/Negativa
- O painel envia `POST /api/approve` com `{ id, status: 'aprovar'|'negar', motivo? }`.
- A API tenta:
  - `POST {BASE}/{id}/status`
  - `POST {BASE}/{id}/acao`
  - `POST {BASE}/atualizar`
- Ajuste conforme o seu F360 exigir.

## 4) Segurança
- Todas as rotas exigem header `x-admin-secret: {ADMIN_SECRET}`.
- Não exponha suas chaves em código cliente.

## 5) Deploy
1. Suba estes arquivos no GitHub.
2. Importe o repositório na Vercel.
3. Configure as variáveis de ambiente.
4. Acesse o domínio, faça login com `ADMIN_SECRET`, clique em **Atualizar**.

## 6) Suporte
Abra o painel → **Ver debug**. Copie o conteúdo e compartilhe para ajustarmos a rota exata do seu ambiente F360.
