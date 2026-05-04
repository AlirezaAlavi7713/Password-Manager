import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiEdit2, FiTrash2, FiCheck, FiXCircle, FiPlus } from "react-icons/fi";
import { toast } from "react-toastify";
import api from "../api/api.js";
import { getApiErrorMessage } from "../utils/errors.js";
import "../css/CategoryModal.css";

const EMOJIS = [
  "🔗","🏦","💼","🛒","📁","🔑","🌐","📧","🎮","🎵","📚","🏠","✈️","💊","🖥️","📱",
  "💳","🔒","☁️","⭐","🎯","🛡️","📷","🚗","🍕","💡","🔧","📝","🎁","💰",
];

function EditRow({ cat, onDone }) {
  const [name, setName] = useState(cat.name);
  const [icon, setIcon] = useState(cat.icon);
  const [showPicker, setShowPicker] = useState(false);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!name.trim()) return;
    setSaving(true);
    try {
      await api.put(`/categories/${cat.id}`, { name: name.trim(), icon, color: cat.color });
      onDone();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la modification."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4 }}>
      <div className="cat-edit-form">
        <button
          type="button"
          className="add-category-row cat-icon-preview"
          onClick={() => setShowPicker((v) => !v)}
          aria-label="Choisir l'icône de la catégorie"
          style={{ width: 32, height: 32, fontSize: 16 }}
        >
          {icon}
        </button>
        <input
          className="cat-edit-input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter") save(); if (e.key === "Escape") onDone(false); }}
          autoFocus
        />
        <button className="btn-icon" onClick={save} disabled={saving} title="Enregistrer" aria-label="Enregistrer la catégorie">
          <FiCheck size={14} />
        </button>
        <button className="btn-icon" onClick={() => onDone(false)} title="Annuler" aria-label="Annuler la modification">
          <FiXCircle size={14} />
        </button>
      </div>
      {showPicker && (
        <div className="emoji-picker">
          {EMOJIS.map((e) => (
            <button
              key={e}
              type="button"
              className={`emoji-btn ${icon === e ? "selected" : ""}`}
              onClick={() => { setIcon(e); setShowPicker(false); }}
            >
              {e}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function CategoryModalContent({ categories, onClose, onRefresh }) {
  const [editingId, setEditingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const [newName, setNewName] = useState("");
  const [newIcon, setNewIcon] = useState("📁");
  const [showNewPicker, setShowNewPicker] = useState(false);
  const [adding, setAdding] = useState(false);

  const handleDelete = async (id) => {
    setDeletingId(id);
    try {
      await api.delete(`/categories/${id}`);
      toast.success("Catégorie supprimée.");
      onRefresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la suppression."));
    } finally {
      setDeletingId(null);
    }
  };

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setAdding(true);
    try {
      await api.post("/categories", { name: newName.trim(), icon: newIcon, color: "#94a3b8" });
      toast.success("Catégorie ajoutée !");
      setNewName("");
      setNewIcon("📁");
      onRefresh();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'ajout."));
    } finally {
      setAdding(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <motion.div
        className="category-modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="category-modal-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: 0.94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.94, y: 16 }}
        transition={{ duration: 0.18 }}
      >
        <div className="category-modal-header">
          <h3 id="category-modal-title">Gérer les catégories</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Fermer la gestion des catégories"><FiX size={18} /></button>
        </div>

        <div className="category-list">
          {categories.length === 0 && (
            <p className="no-categories">Aucune catégorie. Crée-en une ci-dessous.</p>
          )}
          {categories.map((cat) => (
            <div key={cat.id} className="category-row">
              {editingId === cat.id ? (
                <EditRow
                  cat={cat}
                  onDone={(refresh = true) => { setEditingId(null); if (refresh) onRefresh(); }}
                />
              ) : (
                <>
                  <span className="cat-icon">{cat.icon}</span>
                  <span className="cat-name">{cat.name}</span>
                  <div className="cat-actions">
                    <button className="btn-icon" onClick={() => setEditingId(cat.id)} title="Modifier" aria-label={`Modifier ${cat.name}`}>
                      <FiEdit2 size={13} />
                    </button>
                    <button
                      className="btn-icon"
                      onClick={() => handleDelete(cat.id)}
                      disabled={deletingId === cat.id}
                      title="Supprimer"
                      aria-label={`Supprimer ${cat.name}`}
                      style={{ color: "var(--danger)" }}
                    >
                      <FiTrash2 size={13} />
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>

        <div className="category-modal-footer">
          <form className="add-category-form" onSubmit={handleAdd}>
            <div className="add-category-row">
              <button
                type="button"
                className="cat-icon-preview"
                onClick={() => setShowNewPicker((v) => !v)}
                title="Choisir un emoji"
                aria-label="Choisir un emoji pour la nouvelle catégorie"
              >
                {newIcon}
              </button>
              <input
                className="input"
                placeholder="Nouvelle catégorie…"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
              <button type="submit" className="btn btn-primary" disabled={adding || !newName.trim()} aria-label="Ajouter la catégorie">
                <FiPlus size={15} />
              </button>
            </div>
            {showNewPicker && (
              <div className="emoji-picker">
                {EMOJIS.map((e) => (
                  <button
                    key={e}
                    type="button"
                    className={`emoji-btn ${newIcon === e ? "selected" : ""}`}
                    onClick={() => { setNewIcon(e); setShowNewPicker(false); }}
                  >
                    {e}
                  </button>
                ))}
              </div>
            )}
          </form>
        </div>
      </motion.div>
    </div>
  );
}

export default function CategoryModal({ open, categories, onClose, onRefresh }) {
  return (
    <AnimatePresence>
      {open && (
        <CategoryModalContent
          key="cat-modal"
          categories={categories}
          onClose={onClose}
          onRefresh={onRefresh}
        />
      )}
    </AnimatePresence>
  );
}
