// ================================================================
//  Utilitaires cryptographiques — Web Crypto API (natif navigateur)
//
//  Architecture zero-knowledge :
//  1. masterPassword + salt → PBKDF2 → 256 bits
//  2. Les 128 premiers bits → authKey  (envoyé au serveur pour login)
//  3. Les 128 derniers bits → encKey   (reste côté client, chiffre le vault en AES-128-GCM)
//
//  Le serveur ne voit jamais le mot de passe maître ni la clé de chiffrement.
// ================================================================

const PBKDF2_ITERATIONS = 310_000;

const toHex = (buffer) =>
  Array.from(new Uint8Array(buffer)).map(b => b.toString(16).padStart(2, "0")).join("");

const fromHex = (hex) =>
  new Uint8Array(hex.match(/.{2}/g).map(b => parseInt(b, 16)));

export const generateSalt = () => toHex(crypto.getRandomValues(new Uint8Array(32)));

const deriveBits = async (masterPassword, saltHex) => {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(masterPassword),
    "PBKDF2",
    false,
    ["deriveBits"]
  );
  return crypto.subtle.deriveBits(
    { name: "PBKDF2", salt: fromHex(saltHex), iterations: PBKDF2_ITERATIONS, hash: "SHA-256" },
    keyMaterial,
    256
  );
};

export const deriveKeys = async (masterPassword, saltHex) => {
  const bits = await deriveBits(masterPassword, saltHex);
  const arr = new Uint8Array(bits);
  return {
    authKeyHex: toHex(arr.slice(0, 16)),
    encKeyRaw:  arr.slice(16, 32),
  };
};

const importEncKey = (rawKey) =>
  crypto.subtle.importKey("raw", rawKey, "AES-GCM", false, ["encrypt", "decrypt"]);

export const encryptData = async (data, encKeyRaw) => {
  const key = await importEncKey(encKeyRaw);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    new TextEncoder().encode(JSON.stringify(data))
  );
  return { encrypted_data: toHex(encrypted), iv: toHex(iv) };
};

export const decryptData = async (encryptedHex, ivHex, encKeyRaw) => {
  const key = await importEncKey(encKeyRaw);
  const decrypted = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv: fromHex(ivHex) },
    key,
    fromHex(encryptedHex)
  );
  return JSON.parse(new TextDecoder().decode(decrypted));
};
