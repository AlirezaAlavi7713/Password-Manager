import { motion, AnimatePresence } from "framer-motion";
import { FiAlertTriangle, FiX } from "react-icons/fi";

export default function ConfirmModal({ open, message, onConfirm, onCancel, danger = true }) {
  return (
    <AnimatePresence>
      {open && (
        <div className="overlay" onClick={onCancel}>
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirm-modal-title"
            style={{
              background: "var(--surface)",
              border: "1px solid var(--border)",
              borderRadius: 14,
              padding: "28px 28px 24px",
              width: "100%",
              maxWidth: 380,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: .93, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: .93, y: 12 }}
            transition={{ duration: .16 }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <FiAlertTriangle size={20} style={{ color: danger ? "var(--danger)" : "var(--warn)", flexShrink: 0 }} />
                <span id="confirm-modal-title" style={{ fontWeight: 700, fontSize: 15 }}>Confirmation</span>
              </div>
              <button className="btn-icon" onClick={onCancel} aria-label="Fermer la confirmation"><FiX size={16} /></button>
            </div>

            <p style={{ fontSize: 14, color: "var(--text-muted)", lineHeight: 1.5 }}>{message}</p>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 10 }}>
              <button className="btn btn-ghost" onClick={onCancel}>Annuler</button>
              <button
                className={`btn ${danger ? "btn-danger" : "btn-primary"}`}
                onClick={() => { onConfirm(); onCancel(); }}
              >
                Confirmer
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
