import { useState, useCallback, useEffect, useRef } from "react";
import api from "../api/api.js";
import { deriveKeys, generateSalt, decryptData } from "../utils/crypto.js";
import { AuthContext } from "./auth-context.js";

const LOCK_TIMEOUT = 5 * 60 * 1000; // 5 minutes d'inactivité

export function AuthProvider({ children }) {
  const stored = localStorage.getItem("pm_user");
  const [user,      setUser]      = useState(stored ? JSON.parse(stored) : null);
  // encKeyRaw vit UNIQUEMENT en mémoire — jamais persisté
  const [encKeyRaw, setEncKeyRaw] = useState(null);
  const [locked,    setLocked]    = useState(false);
  // Stockage temporaire de la clé pendant l'étape 2FA
  const pendingKeyRef = useRef(null);

  const timerRef = useRef(null);

  // ── Auto-lock par inactivité ──
  useEffect(() => {
    if (!encKeyRaw) return;

    const doLock = () => {
      setEncKeyRaw(null);
      setLocked(true);
    };

    const reset = () => {
      clearTimeout(timerRef.current);
      timerRef.current = setTimeout(doLock, LOCK_TIMEOUT);
    };

    const events = ["mousemove", "keydown", "click", "scroll", "touchstart"];
    events.forEach((e) => window.addEventListener(e, reset, { passive: true }));
    reset();

    return () => {
      events.forEach((e) => window.removeEventListener(e, reset));
      clearTimeout(timerRef.current);
    };
  }, [encKeyRaw]);

  const register = useCallback(async (nom, prenom, email, masterPassword) => {
    const pbkdf2_salt = generateSalt();
    const { authKeyHex, encKeyRaw: rawKey } = await deriveKeys(masterPassword, pbkdf2_salt);

    const { data } = await api.post("/auth/register", {
      nom, prenom, email,
      auth_key_hash: authKeyHex,
      pbkdf2_salt,
    });

    localStorage.setItem("pm_user", JSON.stringify(data.user));
    setUser(data.user);
    setEncKeyRaw(rawKey);
    setLocked(false);
  }, []);

  const login = useCallback(async (email, masterPassword) => {
    const { data: saltData } = await api.post("/auth/salt", { email });
    const { authKeyHex, encKeyRaw: rawKey } = await deriveKeys(masterPassword, saltData.pbkdf2_salt);

    const { data } = await api.post("/auth/login", {
      email,
      auth_key_hash: authKeyHex,
    });

    if (data.requires2fa) {
      pendingKeyRef.current = rawKey;
      return { requires2fa: true };
    }

    localStorage.setItem("pm_user", JSON.stringify(data.user));
    setUser(data.user);
    setEncKeyRaw(rawKey);
    setLocked(false);
  }, []);

  const verify2fa = useCallback(async (code) => {
    const { data } = await api.post("/auth/2fa/verify-login", { code });
    localStorage.setItem("pm_user", JSON.stringify(data.user));
    setUser(data.user);
    setEncKeyRaw(pendingKeyRef.current);
    pendingKeyRef.current = null;
    setLocked(false);
  }, []);

  // ── Déverrouillage sans quitter la session ──
  const unlock = useCallback(async (masterPassword) => {
    const { data: saltData } = await api.post("/auth/salt", { email: user.email });
    const { encKeyRaw: rawKey } = await deriveKeys(masterPassword, saltData.pbkdf2_salt);

    // Vérification zero-knowledge : on tente de déchiffrer une entrée du coffre.
    // Si la clé est mauvaise, AES-GCM lève une DOMException immédiatement.
    // On n'appelle pas /auth/login → pas de bcrypt, pas de rate limit.
    let entries = [];
    try {
      const { data } = await api.get("/vault");
      entries = data;
    } catch {
      // Token expiré ou réseau — on ne peut pas vérifier, on fait confiance à la clé.
    }

    if (entries.length > 0) {
      try {
        await decryptData(entries[0].encrypted_data, entries[0].iv, rawKey);
      } catch {
        throw new Error("Mot de passe maître incorrect.");
      }
    }

    setEncKeyRaw(rawKey);
    setLocked(false);
  }, [user]);

  const logout = useCallback(() => {
    clearTimeout(timerRef.current);
    api.post("/auth/logout").catch(() => {});
    localStorage.removeItem("pm_user");
    setUser(null);
    setEncKeyRaw(null);
    setLocked(false);
  }, []);

  const updateUser = useCallback((nextUser) => {
    localStorage.setItem("pm_user", JSON.stringify(nextUser));
    setUser(nextUser);
  }, []);

  return (
    <AuthContext.Provider value={{ user, encKeyRaw, locked, register, login, verify2fa, unlock, logout, updateUser }}>
      {children}
    </AuthContext.Provider>
  );
}
