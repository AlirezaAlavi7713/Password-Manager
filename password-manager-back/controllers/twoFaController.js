import { generateSecret, generateURI, verify } from "otplib";
import QRCode from "qrcode";
import { findUserByEmail, findUserById, findUserSecurityById, saveTotpSecret, enableTotp, disableTotp } from "../models/User.js";
import { clearTwoFaCookie, readCookie, setAuthCookie, signAuthToken, TWO_FA_COOKIE, verifyToken } from "../utils/authTokens.js";

const verifyTotp = async (token, secret) => {
  const result = await verify({ token, secret });
  return Boolean(result.valid);
};

// GET /auth/2fa/setup — génère un secret temporaire + QR code
export const setup2fa = async (req, res) => {
  try {
    const [user] = await findUserById(req.user.id);
    if (!user) return res.status(404).json({ message: "Utilisateur introuvable" });

    const secret = generateSecret();
    await saveTotpSecret(req.user.id, secret);

    const uri = generateURI({ issuer: "VaultKey", label: user.email, secret, type: "totp" });
    const qrDataUrl = await QRCode.toDataURL(uri);

    res.json({ secret, qrDataUrl });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /auth/2fa/enable — vérifie le code et active le 2FA
export const enable2fa = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code requis" });

    const rows = await findUserSecurityById(req.user.id);
    const user = rows[0];
    if (!user?.totp_secret) return res.status(400).json({ message: "Lance d'abord la configuration" });

    const valid = await verifyTotp(code, user.totp_secret);
    if (!valid) return res.status(401).json({ message: "Code incorrect" });

    await enableTotp(req.user.id);
    res.json({ message: "2FA activé" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /auth/2fa/disable — vérifie le code et désactive le 2FA
export const disable2fa = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code requis" });

    const rows = await findUserSecurityById(req.user.id);
    const user = rows[0];
    if (!user?.totp_enabled) return res.status(400).json({ message: "2FA déjà désactivé" });
    if (!user?.totp_secret) return res.status(400).json({ message: "2FA non configuré" });

    const valid = await verifyTotp(code, user.totp_secret);
    if (!valid) return res.status(401).json({ message: "Code incorrect" });

    await disableTotp(req.user.id);
    res.json({ message: "2FA désactivé" });
  } catch (err) { res.status(500).json({ message: err.message }); }
};

// POST /auth/2fa/verify-login — 2e étape du login quand 2FA activé
export const verifyLogin2fa = async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ message: "Code requis" });

    const tempToken = readCookie(req.headers.cookie, TWO_FA_COOKIE);
    if (!tempToken) return res.status(401).json({ message: "Session expirée, reconnecte-toi." });

    let payload;
    try {
      payload = verifyToken(tempToken);
    } catch {
      return res.status(401).json({ message: "Session expirée, reconnecte-toi." });
    }

    if (!payload.pending2fa) return res.status(401).json({ message: "Token invalide" });

    const users = await findUserByEmail(payload.email);
    const user = users[0];
    if (!user?.totp_secret) return res.status(401).json({ message: "2FA non configuré" });

    const valid = await verifyTotp(code, user.totp_secret);
    if (!valid) return res.status(401).json({ message: "Code incorrect" });

    clearTwoFaCookie(res);
    setAuthCookie(res, { id: user.id, email: user.email });
    res.json({ token: signAuthToken({ id: user.id, email: user.email }), user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email } });
  } catch (err) { res.status(500).json({ message: err.message }); }
};
