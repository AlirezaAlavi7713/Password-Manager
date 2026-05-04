-- ============================================================
--  Password Manager — Schéma base de données
--  Architecture zero-knowledge : le serveur ne voit jamais
--  les mots de passe en clair. Tout est chiffré côté client.
-- ============================================================

CREATE DATABASE IF NOT EXISTS password_manager CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE password_manager;

-- ------------------------------------------------------------
-- Utilisateurs
-- auth_key_hash : bcrypt du hash de clé dérivé côté client
--   (jamais le mot de passe maître lui-même)
-- pbkdf2_salt   : sel hexadécimal pour la dérivation PBKDF2
--   (envoyé au client pour recalculer la clé de chiffrement)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            INT PRIMARY KEY AUTO_INCREMENT,
  nom           VARCHAR(100)  NOT NULL,
  prenom        VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  UNIQUE NOT NULL,
  auth_key_hash VARCHAR(255)  NOT NULL,
  pbkdf2_salt   VARCHAR(255)  NOT NULL,
  totp_secret   VARCHAR(64)   DEFAULT NULL,
  totp_enabled  BOOLEAN       DEFAULT FALSE,
  created_at    TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- ------------------------------------------------------------
-- Catégories de mots de passe (non chiffrées, non sensibles)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categories (
  id         INT PRIMARY KEY AUTO_INCREMENT,
  user_id    INT          NOT NULL,
  name       VARCHAR(100) NOT NULL,
  icon       VARCHAR(50)  DEFAULT 'key',
  color      VARCHAR(20)  DEFAULT '#6366f1',
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ------------------------------------------------------------
-- Entrées du coffre-fort
-- encrypted_data : JSON chiffré AES-128-GCM contenant :
--   { name, username, password, url, notes }
-- iv             : vecteur d'initialisation AES-GCM (hex)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vault_entries (
  id             INT PRIMARY KEY AUTO_INCREMENT,
  user_id        INT     NOT NULL,
  category_id    INT     DEFAULT NULL,
  encrypted_data TEXT    NOT NULL,
  iv             VARCHAR(255) NOT NULL,
  is_favorite    BOOLEAN DEFAULT FALSE,
  created_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at     TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id)     REFERENCES users(id)      ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
);

-- Catégories par défaut insérées à la création du compte
-- (gérées dans le controller authController.js)
