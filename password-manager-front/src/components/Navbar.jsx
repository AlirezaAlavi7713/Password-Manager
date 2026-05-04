import { Link, useLocation } from "react-router-dom";
import { FiShield, FiLogOut, FiUser, FiSettings } from "react-icons/fi";
import { useAuth } from "../context/auth-context.js";
import "../css/Navbar.css";

export default function Navbar() {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();

  return (
    <nav className="navbar">
      <Link to="/" className="navbar-brand">
        <FiShield size={22} />
        <span>VaultKey</span>
      </Link>

      <div className="navbar-right">
        <Link
          to="/profile"
          className={`navbar-user ${pathname === "/profile" ? "active" : ""}`}
          title="Mon profil"
        >
          <FiUser size={16} />
          <span>{user?.prenom} {user?.nom}</span>
          <FiSettings size={13} className="settings-icon" />
        </Link>
        <button className="btn-icon" onClick={logout} title="Se déconnecter" aria-label="Se déconnecter">
          <FiLogOut size={18} />
        </button>
      </div>
    </nav>
  );
}
