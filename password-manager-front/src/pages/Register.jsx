import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiShield, FiMail, FiLock, FiUser, FiEye, FiEyeOff, FiAlertTriangle } from "react-icons/fi";
import { useAuth } from "../context/auth-context.js";
import { getApiErrorMessage } from "../utils/errors.js";

export default function Register() {
  const { register } = useAuth();
  const navigate      = useNavigate();

  const [form, setForm] = useState({ nom: "", prenom: "", email: "", password: "", confirm: "" });
  const [showPwd,    setShowPwd]    = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading,    setLoading]    = useState(false);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const strength = (() => {
    const p = form.password;
    if (!p) return 0;
    let s = 0;
    if (p.length >= 12) s++;
    if (/[A-Z]/.test(p)) s++;
    if (/[0-9]/.test(p)) s++;
    if (/[^A-Za-z0-9]/.test(p)) s++;
    return s;
  })();

  const strengthLabel = ["", "Faible", "Moyen", "Bon", "Fort"][strength];
  const strengthColor = ["", "#f87171", "#fbbf24", "#34d399", "#22d3ee"][strength];

  const handleSubmit = async (e) => {
    e.preventDefault();
    const { nom, prenom, email, password, confirm } = form;
    if (!nom || !prenom || !email || !password) return toast.error("Remplis tous les champs.");
    if (password !== confirm) return toast.error("Les mots de passe ne correspondent pas.");
    if (password.length < 8) return toast.error("Mot de passe trop court (min 8 caractères).");
    setLoading(true);
    try {
      await register(nom.trim(), prenom.trim(), email.trim(), password);
      toast.success("Compte créé ! Bienvenue.");
      navigate("/");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'inscription."));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <FiShield size={28} />
          VaultKey
        </div>

        <h2>Créer un compte</h2>
        <p className="subtitle">Chiffrement côté client — nous ne voyons jamais tes mots de passe.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="auth-name-grid">
            <div className="field">
              <label>Prénom</label>
              <div className="input-icon-wrap">
                <FiUser className="input-icon" size={16} />
                <input className="input input-with-icon" type="text" placeholder="Prénom" value={form.prenom} onChange={set("prenom")} />
              </div>
            </div>
            <div className="field">
              <label>Nom</label>
              <input className="input" type="text" placeholder="Nom" value={form.nom} onChange={set("nom")} />
            </div>
          </div>

          <div className="field">
            <label>Email</label>
            <div className="input-icon-wrap">
              <FiMail className="input-icon" size={16} />
              <input className="input input-with-icon" type="email" placeholder="ton@email.com" value={form.email} onChange={set("email")} autoComplete="email" />
            </div>
          </div>

          <div className="field">
            <label>Mot de passe maître</label>
            <div className="input-icon-wrap">
              <FiLock className="input-icon" size={16} />
              <input
                className="input input-with-icon input-with-icon-right"
                type={showPwd ? "text" : "password"}
                placeholder="••••••••••••"
                value={form.password}
                onChange={set("password")}
                autoComplete="new-password"
              />
              <button type="button" className="btn-icon input-icon-right" onClick={() => setShowPwd((v) => !v)} aria-label={showPwd ? "Masquer le mot de passe maître" : "Afficher le mot de passe maître"}>
                {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
            {form.password && (
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 4 }}>
                <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 99 }}>
                  <div style={{ width: `${strength * 25}%`, height: "100%", background: strengthColor, borderRadius: 99, transition: "width .3s" }} />
                </div>
                <span style={{ fontSize: 12, color: strengthColor }}>{strengthLabel}</span>
              </div>
            )}
          </div>

          <div className="field">
            <label>Confirmer le mot de passe</label>
            <div className="input-icon-wrap">
              <FiLock className="input-icon" size={16} />
              <input
                className="input input-with-icon input-with-icon-right"
                type={showConfirm ? "text" : "password"}
                placeholder="••••••••••••"
                value={form.confirm}
                onChange={set("confirm")}
                autoComplete="new-password"
              />
              <button type="button" className="btn-icon input-icon-right" onClick={() => setShowConfirm((v) => !v)} aria-label={showConfirm ? "Masquer la confirmation du mot de passe" : "Afficher la confirmation du mot de passe"}>
                {showConfirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <div className="warning-box">
            <FiAlertTriangle size={16} />
            <p>Mémorise bien ton mot de passe maître. S&apos;il est perdu, tes données sont <strong>irrécupérables</strong>.</p>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <span className="spinner" /> : "Créer mon compte"}
          </button>
        </form>

        <p className="auth-footer">
          Déjà un compte ? <Link to="/login">Se connecter</Link>
        </p>
      </div>
    </div>
  );
}
