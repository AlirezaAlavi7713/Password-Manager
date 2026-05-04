import { getEntriesByUser, createEntry, updateEntry, toggleFavorite, deleteEntry, getStatsByUser } from "../models/Vault.js";
import { categoryBelongsToUser } from "../models/Category.js";

const parseBoolean = (value) => value === true || value === "true" || value === "1";

const validateCategory = async (category_id, user_id) => {
  if (!category_id) return true;
  return categoryBelongsToUser(category_id, user_id);
};

export const getEntries = async (req, res) => {
  try {
    const category_id = req.query.category_id || null;
    const favoriteOnly = parseBoolean(req.query.favorites);
    const rows = await getEntriesByUser(req.user.id, category_id, favoriteOnly);
    res.json(rows);
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const addEntry = async (req, res) => {
  try {
    const { category_id, encrypted_data, iv } = req.body;
    if (!(await validateCategory(category_id, req.user.id))) {
      return res.status(400).json({ message: "Catégorie invalide" });
    }
    const result = await createEntry(req.user.id, category_id, encrypted_data, iv);
    res.status(201).json({ id: result.insertId, message: "Entrée ajoutée" });
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const editEntry = async (req, res) => {
  try {
    const { category_id, encrypted_data, iv } = req.body;
    if (!(await validateCategory(category_id, req.user.id))) {
      return res.status(400).json({ message: "Catégorie invalide" });
    }
    const result = await updateEntry(req.params.id, req.user.id, category_id, encrypted_data, iv);
    if (result.affectedRows === 0) return res.status(403).json({ message: "Accès refusé ou entrée introuvable" });
    res.json({ message: "Entrée mise à jour" });
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const favorite = async (req, res) => {
  try {
    const result = await toggleFavorite(req.params.id, req.user.id);
    if (result.affectedRows === 0) return res.status(403).json({ message: "Accès refusé" });
    res.json({ message: "Favori mis à jour" });
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const removeEntry = async (req, res) => {
  try {
    const result = await deleteEntry(req.params.id, req.user.id);
    if (result.affectedRows === 0) return res.status(403).json({ message: "Accès refusé ou entrée introuvable" });
    res.json({ message: "Entrée supprimée" });
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const stats = async (req, res) => {
  try {
    const stats = await getStatsByUser(req.user.id);
    res.json(stats);
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};
