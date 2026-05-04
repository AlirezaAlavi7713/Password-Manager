import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { FiShield, FiMail, FiLock, FiEye, FiEyeOff, FiSmartphone } from "react-icons/fi";
import { useAuth } from "../context/auth-context.js";
import { getApiErrorMessage } from "../utils/errors.js";

export default function Login() {
  const { login, verify2fa } = useAuth();
  const navigate = useNavigate();

  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const [step,    setStep]    = useState("credentials"); // "credentials" | "totp"
  const [totpCode, setTotpCode] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email || !password) return toast.error("Remplis tous les champs.");
    setLoading(true);
    try {
      const result = await login(email.trim(), password);
      if (result?.requires2fa) {
        setStep("totp");
      } else {
        navigate("/");
      }
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Email ou mot de passe incorrect."));
    } finally {
      setLoading(false);
    }
  };

  const handleVerify2fa = async (e) => {
    e.preventDefault();
    const code = totpCode.replace(/\s/g, "");
    if (code.length !== 6) return toast.error("Le code doit faire 6 chiffres.");
    setLoading(true);
    try {
      await verify2fa(code);
      navigate("/");
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Code incorrect."));
      setTotpCode("");
    } finally {
      setLoading(false);
    }
  };

  if (step === "totp") {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-logo">
            <FiShield size={28} />
            VaultKey
          </div>

          <h2>Vérification 2FA</h2>
          <p className="subtitle">Ouvre ton application d'authentification et saisis le code à 6 chiffres.</p>

          <form className="auth-form" onSubmit={handleVerify2fa}>
            <div className="field">
              <label>Code de vérification</label>
              <div className="input-icon-wrap">
                <FiSmartphone className="input-icon" size={16} />
                <input
                  className="input input-with-icon"
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9 ]*"
                  maxLength={7}
                  placeholder="123 456"
                  value={totpCode}
                  onChange={(e) => setTotpCode(e.target.value)}
                  autoFocus
                />
              </div>
            </div>

            <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
              {loading ? <span className="spinner" /> : "Vérifier"}
            </button>
          </form>

          <p className="auth-footer">
            <button className="btn btn-ghost btn-sm" onClick={() => { setStep("credentials"); setTotpCode(""); }}>
              ← Retour
            </button>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-wrapper">
      <div className="auth-card">
        <div className="auth-logo">
          <FiShield size={28} />
          VaultKey
        </div>

        <h2>Connexion</h2>
        <p className="subtitle">Ton coffre-fort t&apos;attend.</p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <div className="field">
            <label>Email</label>
            <div className="input-icon-wrap">
              <FiMail className="input-icon" size={16} />
              <input
                className="input input-with-icon"
                type="email"
                placeholder="ton@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
              />
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
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
              <button
                type="button"
                className="btn-icon input-icon-right"
                onClick={() => setShowPwd((v) => !v)}
                aria-label={showPwd ? "Masquer le mot de passe maître" : "Afficher le mot de passe maître"}
              >
                {showPwd ? <FiEyeOff size={16} /> : <FiEye size={16} />}
              </button>
            </div>
          </div>

          <button className="btn btn-primary" type="submit" disabled={loading} style={{ marginTop: 4 }}>
            {loading ? <span className="spinner" /> : "Se connecter"}
          </button>
        </form>

        <p className="auth-footer">
          Pas encore de compte ?{" "}
          <Link to="/register">Créer un compte</Link>
        </p>
      </div>
    </div>
  );
}
