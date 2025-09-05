// /api/debug-login.js
import { loginF360 } from "./_f360-helper.js";
export default async function handler(req, res) {
  try {
    const token = await loginF360();
    // não devolvo o token inteiro por segurança; só prefixo e tamanho
    return res.status(200).json({
      ok: true,
      token_prefix: token.slice(0, 16),
      token_len: token.length,
      note: "Login OK. O /api/f360 deve funcionar com este token."
    });
  } catch (e) {
    return res.status(500).json({ ok: false, err: String(e) });
  }
}
