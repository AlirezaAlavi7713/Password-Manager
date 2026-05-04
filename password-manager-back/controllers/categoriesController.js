import { getCategoriesByUser, createCategory, updateCategory, deleteCategory } from "../models/Category.js";

export const getCategories = async (req, res) => {
  try {
    const rows = await getCategoriesByUser(req.user.id);
    res.json(rows);
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const addCategory = async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const result = await createCategory(req.user.id, name, icon || "key", color || "#6366f1");
    res.status(201).json({ id: result.insertId, message: "Catégorie créée" });
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const editCategory = async (req, res) => {
  try {
    const { name, icon, color } = req.body;
    const result = await updateCategory(req.params.id, req.user.id, name, icon, color);
    if (result.affectedRows === 0) return res.status(403).json({ message: "Accès refusé ou catégorie introuvable" });
    res.json({ message: "Catégorie mise à jour" });
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};

export const removeCategory = async (req, res) => {
  try {
    const result = await deleteCategory(req.params.id, req.user.id);
    if (result.affectedRows === 0) return res.status(403).json({ message: "Accès refusé ou catégorie introuvable" });
    res.json({ message: "Catégorie supprimée" });
  } catch { res.status(500).json({ message: "Erreur serveur" }); }
};
