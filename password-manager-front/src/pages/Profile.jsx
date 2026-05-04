import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiUser, FiMail, FiLock, FiEye, FiEyeOff, FiArrowLeft, FiSave, FiAlertTriangle, FiSmartphone, FiDownload, FiShield, FiCheckCircle } from "react-icons/fi";
import { useAuth } from "../context/auth-context.js";
import { deriveKeys, generateSalt, decryptData, encryptData } from "../utils/crypto.js";
import { getApiErrorMessage } from "../utils/errors.js";
import { buildExportEntries, downloadJson } from "../utils/vaultExport.js";
import api from "../api/api.js";
import Navbar from "../components/Navbar.jsx";
import "../css/Profile.css";

export default function Profile() {
  const { user, logout, updateUser, encKeyRaw } = useAuth();
  const navigate = useNavigate();

  // ── Infos personnelles ──
  const [info, setInfo] = useState({ nom: user?.nom || "", prenom: user?.prenom || "", email: user?.email || "" });
  const [savingInfo, setSavingInfo] = useState(false);

  // ── Changement de mot de passe ──
  const [pwd, setPwd] = useState({ old: "", new: "", confirm: "" });
  const [showOld,  setShowOld]  = useState(false);
  const [showNew,  setShowNew]  = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);

  const setI = (k) => (e) => setInfo((f) => ({ ...f, [k]: e.target.value }));
  const setP = (k) => (e) => setPwd((f)  => ({ ...f, [k]: e.target.value }));

  // ── Sauvegarder infos ──
  const handleSaveInfo = async (e) => {
    e.preventDefault();
    if (!info.nom || !info.prenom || !info.email) return toast.error("Remplis tous les champs.");
    setSavingInfo(true);
    try {
      const { data } = await api.patch("/auth/profile", info);
      updateUser(data.user);
      toast.success("Profil mis à jour !");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour."));
    } finally {
      setSavingInfo(false);
    }
  };

  // ── Changer mot de passe maître ──
  const handleChangePwd = async (e) => {
    e.preventDefault();
    if (!pwd.old || !pwd.new || !pwd.confirm) return toast.error("Remplis tous les champs.");
    if (pwd.new !== pwd.confirm) return toast.error("Les nouveaux mots de passe ne correspondent pas.");
    if (pwd.new.length < 8) return toast.error("Nouveau mot de passe trop court (min 8 caractères).");
    if (pwd.old === pwd.new) return toast.error("Le nouveau mot de passe doit être différent de l'ancien.");

    setSavingPwd(true);
    try {
      // 1. Dériver l'ancienne clé pour vérification
      const { data: saltData } = await api.post("/auth/salt", { email: user.email });
      const { authKeyHex: oldAuthKey, encKeyRaw: oldEncKey } = await deriveKeys(pwd.old, saltData.pbkdf2_salt);

      // 2. Générer nouveau sel + dériver nouvelle clé
      const newSalt = generateSalt();
      const { authKeyHex: newAuthKey, encKeyRaw: newEncKey } = await deriveKeys(pwd.new, newSalt);

      // 3. Récupérer toutes les entrées chiffrées
      const { data: rawEntries } = await api.get("/vault");

      // 4. Re-chiffrer chaque entrée avec la nouvelle clé
      const reEncrypted = await Promise.all(
        rawEntries.map(async (entry) => {
          const plain = await decryptData(entry.encrypted_data, entry.iv, oldEncKey);
          const { encrypted_data, iv } = await encryptData(plain, newEncKey);
          return { id: entry.id, encrypted_data, iv };
        })
      );

      // 5. Envoyer au serveur
      await api.post("/auth/change-password", {
        old_auth_key_hash: oldAuthKey,
        new_auth_key_hash: newAuthKey,
        new_salt:          newSalt,
        entries:           reEncrypted,
      });

      toast.success("Mot de passe mis à jour ! Reconnecte-toi.");
      setPwd({ old: "", new: "", confirm: "" });

      // Déconnecter pour forcer la re-dérivation avec le nouveau mot de passe
      setTimeout(() => logout(), 1500);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Ancien mot de passe incorrect."));
    } finally {
      setSavingPwd(false);
    }
  };

  const strength = (() => {
    const p = pwd.new;
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

  // ── Export du coffre ──
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    if (!encKeyRaw) return toast.error("Coffre verrouillé, impossible d'exporter.");
    setExporting(true);
    try {
      const { data: rawEntries } = await api.get("/vault");
      const { data: cats } = await api.get("/categories");

      const entries = await buildExportEntries(rawEntries, cats, encKeyRaw);
      const date = new Date().toISOString().slice(0, 10);
      downloadJson(`vaultkey-export-${date}.json`, {
        version: 1,
        exported_at: new Date().toISOString(),
        entries,
      });
      toast.success(`${entries.length} entrées exportées.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de l'export."));
    } finally {
      setExporting(false);
    }
  };

  // ── 2FA ──
  const [twofa, setTwofa] = useState({ enabled: user?.totp_enabled || false });
  const [tfaStep, setTfaStep] = useState("idle"); // "idle" | "setup" | "confirm" | "disable"
  const [tfaQr, setTfaQr] = useState(null);
  const [tfaCode, setTfaCode] = useState("");
  const [tfaLoading, setTfaLoading] = useState(false);

  const startSetup = async () => {
    setTfaLoading(true);
    try {
      const { data } = await api.get("/auth/2fa/setup");
      setTfaQr(data.qrDataUrl);
      setTfaStep("setup");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Erreur lors de la configuration."));
    } finally {
      setTfaLoading(false);
    }
  };

  const confirmEnable = async (e) => {
    e.preventDefault();
    const code = tfaCode.replace(/\s/g, "");
    if (code.length !== 6) return toast.error("Code à 6 chiffres requis.");
    setTfaLoading(true);
    try {
      await api.post("/auth/2fa/enable", { code });
      setTwofa({ enabled: true });
      setTfaStep("idle");
      setTfaQr(null);
      setTfaCode("");
      toast.success("2FA activé !");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Code incorrect."));
    } finally {
      setTfaLoading(false);
    }
  };

  const confirmDisable = async (e) => {
    e.preventDefault();
    const code = tfaCode.replace(/\s/g, "");
    if (code.length !== 6) return toast.error("Code à 6 chiffres requis.");
    setTfaLoading(true);
    try {
      await api.post("/auth/2fa/disable", { code });
      setTwofa({ enabled: false });
      setTfaStep("idle");
      setTfaCode("");
      toast.success("2FA désactivé.");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Code incorrect."));
    } finally {
      setTfaLoading(false);
    }
  };

  return (
    <div className="vault-layout">
      <Navbar />
      <div className="profile-page">
        <div className="profile-container">
          <button className="btn btn-ghost btn-sm" onClick={() => navigate("/")} style={{ alignSelf: "flex-start" }}>
            <FiArrowLeft size={14} /> Retour au coffre
          </button>

          <h1 className="profile-title">Mon profil</h1>

          {/* ── Infos personnelles ── */}
          <section className="profile-section">
            <div className="profile-section-header">
              <FiUser size={18} />
              <h2>Informations personnelles</h2>
            </div>

            <form className="profile-form" onSubmit={handleSaveInfo}>
              <div className="profile-grid">
                <div className="field">
                  <label>Prénom</label>
                  <input className="input" type="text" value={info.prenom} onChange={setI("prenom")} />
                </div>
                <div className="field">
                  <label>Nom</label>
                  <input className="input" type="text" value={info.nom} onChange={setI("nom")} />
                </div>
              </div>
              <div className="field">
                <label>Email</label>
                <div className="input-icon-wrap">
                  <FiMail className="input-icon" size={16} />
                  <input className="input input-with-icon" type="email" value={info.email} onChange={setI("email")} />
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-primary" type="submit" disabled={savingInfo}>
                  {savingInfo ? <span className="spinner" /> : <><FiSave size={14} /> Enregistrer</>}
                </button>
              </div>
            </form>
          </section>

          {/* ── Changement mot de passe ── */}
          <section className="profile-section">
            <div className="profile-section-header">
              <FiLock size={18} />
              <h2>Changer le mot de passe maître</h2>
            </div>

            <div className="warning-box" style={{ marginBottom: 20 }}>
              <FiAlertTriangle size={16} />
              <p>Toutes tes entrées seront automatiquement <strong>re-chiffrées</strong> avec le nouveau mot de passe. Tu seras déconnecté après.</p>
            </div>

            <form className="profile-form" onSubmit={handleChangePwd}>
              <div className="field">
                <label>Ancien mot de passe maître</label>
                <div className="input-icon-wrap">
                  <FiLock className="input-icon" size={16} />
                  <input
                    className="input input-with-icon input-with-icon-right"
                    type={showOld ? "text" : "password"}
                    placeholder="••••••••"
                    value={pwd.old}
                    onChange={setP("old")}
                  />
                  <button type="button" className="btn-icon input-icon-right" onClick={() => setShowOld(v => !v)} aria-label={showOld ? "Masquer l'ancien mot de passe" : "Afficher l'ancien mot de passe"}>
                    {showOld ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
              </div>

              <div className="field">
                <label>Nouveau mot de passe maître</label>
                <div className="input-icon-wrap">
                  <FiLock className="input-icon" size={16} />
                  <input
                    className="input input-with-icon input-with-icon-right"
                    type={showNew ? "text" : "password"}
                    placeholder="••••••••"
                    value={pwd.new}
                    onChange={setP("new")}
                  />
                  <button type="button" className="btn-icon input-icon-right" onClick={() => setShowNew(v => !v)} aria-label={showNew ? "Masquer le nouveau mot de passe" : "Afficher le nouveau mot de passe"}>
                    {showNew ? <FiEyeOff size={15} /> : <FiEye size={15} />}
                  </button>
                </div>
                {pwd.new && (
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
                    <div style={{ flex: 1, height: 4, background: "var(--border)", borderRadius: 99 }}>
                      <div style={{ width: `${strength * 25}%`, height: "100%", background: strengthColor, borderRadius: 99, transition: "width .3s" }} />
                    </div>
                    <span style={{ fontSize: 12, color: strengthColor }}>{strengthLabel}</span>
                  </div>
                )}
              </div>

              <div className="field">
                <label>Confirmer le nouveau mot de passe</label>
                <div className="input-icon-wrap">
                  <FiLock className="input-icon" size={16} />
                  <input
                    className="input input-with-icon"
                    type="password"
                    placeholder="••••••••"
                    value={pwd.confirm}
                    onChange={setP("confirm")}
                  />
                </div>
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end" }}>
                <button className="btn btn-primary" type="submit" disabled={savingPwd}>
                  {savingPwd ? <><span className="spinner" /> Re-chiffrement en cours…</> : <><FiLock size={14} /> Changer le mot de passe</>}
                </button>
              </div>
            </form>
          </section>

          {/* ── 2FA ── */}
          <section className="profile-section">
            <div className="profile-section-header">
              <FiSmartphone size={18} />
              <h2>Double authentification (2FA)</h2>
            </div>

            {twofa.enabled && tfaStep === "idle" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "#10b981", fontWeight: 600, fontSize: 14 }}>
                  <FiCheckCircle size={16} /> 2FA activé
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => { setTfaStep("disable"); setTfaCode(""); }}>
                  Désactiver
                </button>
              </div>
            )}

            {!twofa.enabled && tfaStep === "idle" && (
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Protège ton compte avec une app d'authentification (Google Authenticator, Authy…).
                </p>
                <button className="btn btn-primary btn-sm" onClick={startSetup} disabled={tfaLoading}>
                  {tfaLoading ? <span className="spinner" /> : <><FiShield size={13} /> Activer le 2FA</>}
                </button>
              </div>
            )}

            {tfaStep === "setup" && tfaQr && (
              <form className="profile-form" onSubmit={confirmEnable}>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Scanne ce QR code avec ton application, puis saisis le code à 6 chiffres pour confirmer.
                </p>
                <img src={tfaQr} alt="QR Code 2FA" style={{ width: 180, height: 180, borderRadius: 12, alignSelf: "center", background: "#fff", padding: 8 }} />
                <div className="field">
                  <label>Code de vérification</label>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="123 456"
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value)}
                    autoFocus
                  />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setTfaStep("idle"); setTfaQr(null); setTfaCode(""); }}>Annuler</button>
                  <button type="submit" className="btn btn-primary" disabled={tfaLoading}>
                    {tfaLoading ? <span className="spinner" /> : "Confirmer"}
                  </button>
                </div>
              </form>
            )}

            {tfaStep === "disable" && (
              <form className="profile-form" onSubmit={confirmDisable}>
                <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                  Saisis le code actuel de ton application pour désactiver le 2FA.
                </p>
                <div className="field">
                  <label>Code de vérification</label>
                  <input
                    className="input"
                    type="text"
                    inputMode="numeric"
                    maxLength={7}
                    placeholder="123 456"
                    value={tfaCode}
                    onChange={(e) => setTfaCode(e.target.value)}
                    autoFocus
                  />
                </div>
                <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                  <button type="button" className="btn btn-ghost" onClick={() => { setTfaStep("idle"); setTfaCode(""); }}>Annuler</button>
                  <button type="submit" className="btn btn-danger" disabled={tfaLoading}>
                    {tfaLoading ? <span className="spinner" /> : "Désactiver"}
                  </button>
                </div>
              </form>
            )}
          </section>

          {/* ── Export ── */}
          <section className="profile-section">
            <div className="profile-section-header">
              <FiDownload size={18} />
              <h2>Exporter le coffre</h2>
            </div>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
              <p style={{ fontSize: 13, color: "var(--text-muted)" }}>
                Télécharge toutes tes entrées en clair au format JSON. Garde ce fichier en lieu sûr.
              </p>
              <button className="btn btn-ghost" onClick={handleExport} disabled={exporting}>
                {exporting ? <span className="spinner" /> : <><FiDownload size={14} /> Exporter</>}
              </button>
            </div>
          </section>

        </div>
      </div>
    </div>
  );
}
