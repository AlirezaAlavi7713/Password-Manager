import { useState, useRef } from "react";
import { FiCopy, FiEye, FiEyeOff, FiEdit2, FiTrash2, FiStar, FiGlobe, FiUser, FiAlertTriangle, FiShield } from "react-icons/fi";
import { toast } from "react-toastify";
import { checkHibp } from "../utils/hibp.js";
import "../css/EntryCard.css";

const CLEAR_DELAY = 30_000;

export default function EntryCard({ entry, onEdit, onDelete, onToggleFavorite }) {
  const [showPassword, setShowPassword] = useState(false);
  const [breachCount, setBreachCount]   = useState(null);
  const [checkingHibp, setCheckingHibp] = useState(false);
  const clearTimer = useRef(null);

  const copy = (text, label) => {
    navigator.clipboard.writeText(text).then(() => {
      clearTimeout(clearTimer.current);
      const toastId = toast.info(
        `${label} copié — effacement dans 30 s`,
        { autoClose: CLEAR_DELAY, closeOnClick: false }
      );
      clearTimer.current = setTimeout(() => {
        navigator.clipboard.writeText("").catch(() => {});
        toast.dismiss(toastId);
        toast.success("Presse-papiers effacé.", { autoClose: 2000 });
      }, CLEAR_DELAY);
    });
  };

  const handleCheckHibp = async () => {
    if (!entry.password) return;
    setCheckingHibp(true);
    try {
      const count = await checkHibp(entry.password);
      setBreachCount(count);
      if (count === 0) toast.success("Mot de passe non compromis ✓", { autoClose: 3000 });
      else toast.warn(`Trouvé dans ${count.toLocaleString()} fuite(s) !`, { autoClose: 5000 });
    } catch {
      toast.error("Impossible de vérifier le mot de passe pour le moment.");
    } finally {
      setCheckingHibp(false);
    }
  };

  const favicon = entry.url
    ? `https://www.google.com/s2/favicons?sz=32&domain=${encodeURIComponent(entry.url)}`
    : null;

  return (
    <div className="entry-card">
      <div className="entry-card-header">
        <div className="entry-card-title">
          {favicon
            ? <img src={favicon} alt="" className="entry-favicon" onError={(e) => { e.target.style.display = "none"; }} />
            : <div className="entry-favicon-fallback">{entry.title?.[0]?.toUpperCase() || "?"}</div>
          }
          <div style={{ minWidth: 0 }}>
            <span className="entry-title">{entry.title}</span>
            {entry.url && (
              <a href={entry.url} target="_blank" rel="noopener noreferrer" className="entry-url">
                <FiGlobe size={11} /> {entry.url.replace(/^https?:\/\//, "").split("/")[0]}
              </a>
            )}
          </div>
        </div>

        <div style={{ display: "flex", gap: 2 }}>
          <button
            className="btn-icon"
            onClick={handleCheckHibp}
            disabled={checkingHibp}
            title="Vérifier HaveIBeenPwned"
            aria-label={`Vérifier si le mot de passe de ${entry.title} est compromis`}
            style={{ color: breachCount === null ? "var(--text-muted)" : breachCount === 0 ? "#10b981" : "#ef4444" }}
          >
            {checkingHibp
              ? <span className="spinner" style={{ width: 13, height: 13 }} />
              : <FiShield size={15} />
            }
          </button>
          <button
            className={`btn-icon fav-btn ${entry.is_favorite ? "fav-active" : ""}`}
            onClick={() => onToggleFavorite(entry.id)}
            title="Favori"
            aria-label={entry.is_favorite ? `Retirer ${entry.title} des favoris` : `Ajouter ${entry.title} aux favoris`}
          >
            <FiStar size={16} />
          </button>
        </div>
      </div>

      {entry.username && (
        <div className="entry-row">
          <FiUser size={13} className="row-icon" />
          <span className="row-value">{entry.username}</span>
          <button className="btn-icon" onClick={() => copy(entry.username, "Identifiant")} title="Copier" aria-label={`Copier l'identifiant de ${entry.title}`}>
            <FiCopy size={13} />
          </button>
        </div>
      )}

      <div className="entry-row">
        <FiEyeOff size={13} className="row-icon" />
        <span className="row-value password-value">
          {showPassword ? entry.password : "••••••••••••"}
        </span>
        <button className="btn-icon" onClick={() => setShowPassword((v) => !v)} title="Afficher" aria-label={showPassword ? `Masquer le mot de passe de ${entry.title}` : `Afficher le mot de passe de ${entry.title}`}>
          {showPassword ? <FiEyeOff size={13} /> : <FiEye size={13} />}
        </button>
        <button className="btn-icon" onClick={() => copy(entry.password, "Mot de passe")} title="Copier" aria-label={`Copier le mot de passe de ${entry.title}`}>
          <FiCopy size={13} />
        </button>
      </div>

      {breachCount !== null && (
        <div className={`breach-badge ${breachCount === 0 ? "breach-safe" : "breach-warn"}`}>
          {breachCount === 0
            ? <><FiShield size={12} /> Non compromis</>
            : <><FiAlertTriangle size={12} /> {breachCount.toLocaleString()} fuite{breachCount > 1 ? "s" : ""}</>
          }
        </div>
      )}

      {entry.notes && (
        <p className="entry-notes">{entry.notes}</p>
      )}

      <div className="entry-card-footer">
        <button className="btn btn-ghost btn-sm" onClick={() => onEdit(entry)}>
          <FiEdit2 size={13} /> Modifier
        </button>
        <button className="btn btn-danger btn-sm" onClick={() => onDelete(entry.id)}>
          <FiTrash2 size={13} /> Supprimer
        </button>
      </div>
    </div>
  );
}
