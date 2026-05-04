import bcrypt from "bcrypt";
import { findUserByEmail, findUserById, createUser, getSalt, updateProfile, updateMasterPasswordWithEntries } from "../models/User.js";
import { createCategory } from "../models/Category.js";
import { clearAuthCookie, setAuthCookie, setTwoFaCookie } from "../utils/authTokens.js";

const DEFAULT_CATEGORIES = [
  { name: "Réseaux sociaux", icon: "🔗", color: "#6366f1" },
  { name: "Banque",          icon: "🏦", color: "#10b981" },
  { name: "Travail",         icon: "💼", color: "#f59e0b" },
  { name: "Shopping",        icon: "🛒", color: "#ec4899" },
  { name: "Autre",           icon: "📁", color: "#94a3b8" },
];

export const register = async (req, res) => {
  try {
    const { nom, prenom, email, auth_key_hash, pbkdf2_salt } = req.body;

    const existing = await findUserByEmail(email);
    if (existing.length) return res.status(409).json({ message: "Email déjà utilisé" });

    const hash = await bcrypt.hash(auth_key_hash, 12);
    const result = await createUser(nom, prenom, email, hash, pbkdf2_salt);
    const userId = result.insertId;

    for (const cat of DEFAULT_CATEGORIES) {
      await createCategory(userId, cat.name, cat.icon, cat.color);
    }

    setAuthCookie(res, { id: userId, email });
    res.status(201).json({ user: { id: userId, nom, prenom, email } });
  } catch (err) { console.error("[register]", err.message); res.status(500).json({ error: err.message }); }
};

export const getSaltForEmail = async (req, res) => {
  try {
    const { email } = req.body;
    const rows = await getSalt(email);
    if (!rows.length) return res.status(404).json({ message: "Email introuvable" });
    res.json({ pbkdf2_salt: rows[0].pbkdf2_salt });
  } catch (err) {
    console.error("[salt]", err.message);
    res.status(500).json({ message: "Erreur serveur" });
  }
};

export const login = async (req, res) => {
  try {
    const { email, auth_key_hash } = req.body;

    const users = await findUserByEmail(email);
    if (!users.length) return res.status(401).json({ message: "Identifiants invalides" });

    const user = users[0];
    const valid = await bcrypt.compare(auth_key_hash, user.auth_key_hash);
    if (!valid) return res.status(401).json({ message: "Identifiants invalides" });

    if (user.totp_enabled) {
      setTwoFaCookie(res, { id: user.id, email });
      return res.json({ requires2fa: true });
    }

    setAuthCookie(res, { id: user.id, email });
    res.json({ user: { id: user.id, nom: user.nom, prenom: user.prenom, email: user.email } });
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const me = async (req, res) => {
  try {
    const rows = await findUserById(req.user.id);
    if (!rows.length) return res.status(404).json({ message: "Utilisateur introuvable" });
    res.json(rows[0]);
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const patchProfile = async (req, res) => {
  try {
    const { nom, prenom, email } = req.body;
    if (!nom || !prenom || !email) return res.status(400).json({ error: "Champs manquants" });

    const existing = await findUserByEmail(email);
    if (existing.length && existing[0].id !== req.user.id)
      return res.status(409).json({ error: "Cet email est déjà utilisé" });

    await updateProfile(req.user.id, nom.trim(), prenom.trim(), email.trim());
    const [updated] = await findUserById(req.user.id);
    res.json({ user: updated });
  } catch (err) { res.status(500).json({ error: err.message }); }
};

export const logout = async (_req, res) => {
  clearAuthCookie(res);
  res.json({ message: "Déconnecté" });
};

export const changeMasterPassword = async (req, res) => {
  try {
    const { old_auth_key_hash, new_auth_key_hash, new_salt, entries } = req.body;
    if (!old_auth_key_hash || !new_auth_key_hash || !new_salt || !Array.isArray(entries))
      return res.status(400).json({ error: "Données manquantes" });

    // Vérifier l'ancien mot de passe
    const users = await findUserByEmail(req.user.email);
    if (!users.length) return res.status(404).json({ error: "Utilisateur introuvable" });
    const valid = await bcrypt.compare(old_auth_key_hash, users[0].auth_key_hash);
    if (!valid) return res.status(401).json({ error: "Ancien mot de passe incorrect" });

    const hash = await bcrypt.hash(new_auth_key_hash, 12);
    await updateMasterPasswordWithEntries(req.user.id, hash, new_salt, entries);

    setAuthCookie(res, { id: req.user.id, email: req.user.email });
    res.json({ message: "Mot de passe mis à jour" });
  } catch (err) { res.status(500).json({ error: err.message }); }
};
