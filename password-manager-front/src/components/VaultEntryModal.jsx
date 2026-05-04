import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiX, FiEye, FiEyeOff, FiRefreshCw, FiAlertTriangle } from "react-icons/fi";
import { checkHibp } from "../utils/hibp.js";
import "../css/VaultEntryModal.css";

const EMPTY = { title: "", username: "", password: "", url: "", notes: "", category_id: "" };

const generatePassword = () => {
  const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*";
  const arr = crypto.getRandomValues(new Uint8Array(20));
  return Array.from(arr).map((b) => chars[b % chars.length]).join("");
};

const STRENGTH_LABELS = ["", "Très faible", "Faible", "Moyen", "Fort", "Très fort"];
const STRENGTH_COLORS = ["", "#ef4444", "#f97316", "#fbbf24", "#34d399", "#22d3ee"];

function getStrength(p) {
  if (!p) return 0;
  let s = 0;
  if (p.length >= 8)  s++;
  if (p.length >= 14) s++;
  if (/[A-Z]/.test(p) && /[a-z]/.test(p)) s++;
  if (/[0-9]/.test(p)) s++;
  if (/[^A-Za-z0-9]/.test(p)) s++;
  return Math.min(s, 5);
}

function StrengthBar({ password }) {
  const s = getStrength(password);
  return (
    <div style={{ marginTop: 6, display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 99 }}>
        <div style={{ width: `${(s / 5) * 100}%`, height: "100%", background: STRENGTH_COLORS[s], borderRadius: 99, transition: "width .25s, background .25s" }} />
      </div>
      <span style={{ fontSize: 11, color: STRENGTH_COLORS[s], minWidth: 64 }}>{STRENGTH_LABELS[s]}</span>
    </div>
  );
}

function VaultEntryModalContent({ entry, categories, onSave, onClose }) {
  const [form, setForm] = useState(() => (entry ? { ...EMPTY, ...entry } : EMPTY));
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [hibpWarning, setHibpWarning] = useState(null);

  const set = (key) => (e) => {
    setForm((f) => ({ ...f, [key]: e.target.value }));
    if (key === "password") setHibpWarning(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title || !form.password) return;
    setLoading(true);
    try {
      if (hibpWarning === null) {
        try {
          const count = await checkHibp(form.password);
          if (count > 0) {
            setHibpWarning(count);
            setLoading(false);
            return;
          }
          setHibpWarning(0);
        } catch {
          // HIBP unavailable — proceed anyway
        }
      }
      await onSave(form);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="overlay" onClick={onClose}>
      <motion.div
        className="modal-card"
        role="dialog"
        aria-modal="true"
        aria-labelledby="vault-entry-modal-title"
        onClick={(e) => e.stopPropagation()}
        initial={{ opacity: 0, scale: .94, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: .94, y: 16 }}
        transition={{ duration: .18 }}
      >
        <div className="modal-header">
          <h3 id="vault-entry-modal-title">{entry ? "Modifier l'entrée" : "Nouvelle entrée"}</h3>
          <button className="btn-icon" onClick={onClose} aria-label="Fermer la fenêtre"><FiX size={18} /></button>
        </div>

            <form className="modal-body" onSubmit={handleSubmit}>
              <div className="field">
                <label>Titre *</label>
                <input className="input" type="text" placeholder="ex: GitHub" value={form.title} onChange={set("title")} required />
              </div>

              <div className="field">
                <label>Catégorie</label>
                <select className="input" value={form.category_id} onChange={set("category_id")}>
                  <option value="">— Aucune —</option>
                  {categories.map((c) => (
                    <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
                  ))}
                </select>
              </div>

              <div className="field">
                <label>Identifiant / Email</label>
                <input className="input" type="text" placeholder="utilisateur@email.com" value={form.username} onChange={set("username")} />
              </div>

              <div className="field">
                <label>Mot de passe *</label>
                <div className="input-icon-wrap">
                  <input
                    className="input input-with-icon-right"
                    type={showPwd ? "text" : "password"}
                    placeholder="••••••••"
                    value={form.password}
                    onChange={set("password")}
                    required
                  />
                  <div className="input-actions-right">
                    <button type="button" className="btn-icon" onClick={() => setShowPwd((v) => !v)} title="Voir" aria-label={showPwd ? "Masquer le mot de passe" : "Afficher le mot de passe"}>
                      {showPwd ? <FiEyeOff size={14} /> : <FiEye size={14} />}
                    </button>
                    <button
                      type="button"
                      className="btn-icon"
                      title="Générer"
                      aria-label="Générer un mot de passe"
                      onClick={() => setForm((f) => ({ ...f, password: generatePassword() }))}
                    >
                      <FiRefreshCw size={14} />
                    </button>
                  </div>
                </div>
                {form.password && <StrengthBar password={form.password} />}
              </div>

              <div className="field">
                <label>URL</label>
                <input className="input" type="url" placeholder="https://github.com" value={form.url} onChange={set("url")} />
              </div>

              <div className="field">
                <label>Notes</label>
                <textarea className="input" rows={3} placeholder="Informations supplémentaires…" value={form.notes} onChange={set("notes")} style={{ resize: "vertical" }} />
              </div>

              {hibpWarning !== null && hibpWarning > 0 && (
                <div className="hibp-warning">
                  <FiAlertTriangle size={15} />
                  <div>
                    <strong>Mot de passe compromis</strong> — trouvé dans {hibpWarning.toLocaleString()} fuite(s).
                    <br />
                    <span style={{ fontSize: 12, opacity: 0.8 }}>Clique à nouveau sur "Enregistrer" pour continuer quand même.</span>
                  </div>
                </div>
              )}

              <div className="modal-footer">
                <button type="button" className="btn btn-ghost" onClick={onClose}>Annuler</button>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  {loading ? <span className="spinner" /> : entry ? "Enregistrer" : "Ajouter"}
                </button>
              </div>
            </form>
      </motion.div>
    </div>
  );
}

export default function VaultEntryModal({ open, entry, categories, onSave, onClose }) {
  return (
    <AnimatePresence>
      {open && (
        <VaultEntryModalContent
          key={entry?.id ?? "new"}
          entry={entry}
          categories={categories}
          onSave={onSave}
          onClose={onClose}
        />
      )}
    </AnimatePresence>
  );
}
