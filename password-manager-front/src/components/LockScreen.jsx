import { useState } from "react";
import { motion } from "framer-motion";
import { FiLock, FiEye, FiEyeOff, FiLogOut } from "react-icons/fi";
import { toast } from "react-toastify";
import { useAuth } from "../context/auth-context.js";
import { getApiErrorMessage } from "../utils/errors.js";
import "../css/LockScreen.css";

export default function LockScreen() {
  const { user, unlock, logout } = useAuth();
  const [password, setPassword] = useState("");
  const [showPwd,  setShowPwd]  = useState(false);
  const [loading,  setLoading]  = useState(false);

  const handleUnlock = async (e) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      await unlock(password);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Mot de passe incorrect."));
      setPassword("");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="lockscreen-overlay">
      <motion.div
        className="lockscreen-card"
        initial={{ opacity: 0, scale: .92 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: .2 }}
      >
        <div className="lockscreen-icon">
          <FiLock size={32} />
        </div>

        <h2>Coffre verrouillé</h2>
        <p className="lockscreen-sub">
          Session inactive. Ressaisis ton mot de passe maître pour continuer.
        </p>
        <p className="lockscreen-email">{user?.email}</p>

        <form onSubmit={handleUnlock} className="lockscreen-form">
          <div className="input-icon-wrap">
            <input
              className="input input-with-icon-right"
              type={showPwd ? "text" : "password"}
              placeholder="Mot de passe maître"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
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

          <button className="btn btn-primary" type="submit" disabled={loading}>
            {loading ? <span className="spinner" /> : "Déverrouiller"}
          </button>
        </form>

        <button className="btn-logout" onClick={logout}>
          <FiLogOut size={14} /> Se déconnecter
        </button>
      </motion.div>
    </div>
  );
}
