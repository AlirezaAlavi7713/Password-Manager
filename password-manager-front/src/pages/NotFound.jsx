import { Link } from "react-router-dom";
import { FiShield } from "react-icons/fi";

export default function NotFound() {
  return (
    <div className="auth-wrapper">
      <div style={{ textAlign: "center", display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
        <FiShield size={56} style={{ color: "var(--accent)" }} />
        <h1 style={{ fontSize: 72, fontWeight: 800, color: "var(--border)" }}>404</h1>
        <p style={{ color: "var(--text-muted)", fontSize: 16 }}>Cette page n&apos;existe pas.</p>
        <Link to="/" className="btn btn-primary" style={{ marginTop: 8 }}>
          Retour au coffre
        </Link>
      </div>
    </div>
  );
}
