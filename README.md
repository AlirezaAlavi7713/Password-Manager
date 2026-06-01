# VaultKey — Gestionnaire de mots de passe

Application de gestion de mots de passe à **chiffrement côté client (zero-knowledge)**. Le serveur stocke uniquement des données chiffrées qu'il est incapable de déchiffrer, même en cas de compromission de la base de données.

---

## Architecture

```
password-manager/
├── password-manager-front/   # React 19 + Vite  (port 5173)
└── password-manager-back/    # Express 5 + MySQL (port 3003)
```

### Frontend (React + Vite)

- `src/utils/crypto.js` — toute la cryptographie via la **Web Crypto API** native (pas de bibliothèque tierce)
- `src/context/AuthContext.jsx` — état d'authentification global (JWT + clé de chiffrement en mémoire)
- `src/pages/` — Login, Register, Vault, Profile
- `src/components/` — Navbar, LockScreen, VaultEntryModal, EntryCard

### Backend (Express + MySQL)

Couche MVC classique : `routes/` → `controllers/` → `models/` → `config/db.js`

| Préfixe de route      | Ressource                           |
|-----------------------|-------------------------------------|
| `POST /api/auth/register`  | Création de compte               |
| `POST /api/auth/salt`      | Récupération du sel PBKDF2       |
| `POST /api/auth/login`     | Connexion                        |
| `POST /api/auth/logout`    | Déconnexion                      |
| `GET  /api/auth/me`        | Profil courant                   |
| `POST /api/auth/2fa/*`     | Activation / vérification TOTP   |
| `GET  /api/vault`          | Entrées du coffre (chiffrées)    |
| `POST /api/vault`          | Ajout d'une entrée               |
| `PUT  /api/vault/:id`      | Modification d'une entrée        |
| `DELETE /api/vault/:id`    | Suppression d'une entrée         |
| `GET  /api/categories`     | Catégories de l'utilisateur      |

---

## Sécurité

### Pourquoi le serveur ne voit jamais le mot de passe maître

C'est le principe fondamental du projet. Voici le flux cryptographique complet :

```
Mot de passe maître + sel (32 octets, généré à l'inscription)
        │
        ▼
  PBKDF2-SHA-256 (310 000 itérations) → 256 bits dérivés
        │
        ├── bits  0–127 → authKey  (envoyé au serveur pour s'authentifier)
        │
        └── bits 128–255 → encKey  (reste en mémoire côté client, ne quitte jamais le navigateur)
```

**Ce que le serveur reçoit et stocke :**
- `pbkdf2_salt` — sel aléatoire, nécessaire pour rederiver les clés à la connexion suivante
- `bcrypt(authKey, cost=12)` — le hash bcrypt de l'authKey, jamais l'authKey elle-même
- `encrypted_data` + `iv` — le contenu chiffré en AES-128-GCM, illisible sans encKey

**Ce que le serveur ne voit jamais :**
- le mot de passe maître
- la clé de chiffrement encKey
- le contenu déchiffré des entrées du coffre

Même si la base de données est volée en intégralité, les données du coffre sont inutilisables sans le mot de passe maître de chaque utilisateur.

### Détail des choix cryptographiques

| Mécanisme | Usage | Paramètres |
|-----------|-------|-----------|
| **PBKDF2** | Dérivation des clés depuis le mot de passe maître | SHA-256, 310 000 itérations, sel 32 octets — conforme aux recommandations NIST |
| **AES-128-GCM** | Chiffrement authentifié des entrées du coffre | IV de 96 bits généré aléatoirement par entrée — l'authentification GCM détecte toute altération |
| **bcrypt** | Hachage de l'authKey côté serveur | Facteur de coût 12 — résistant aux attaques par GPU |
| **JWT** | Sessions utilisateurs | Expire en 12h, signé avec `JWT_SECRET`, transporté en cookie `httpOnly` |
| **TOTP (otplib)** | Authentification à deux facteurs optionnelle | Compatible Google Authenticator / Authy |
| **Web Crypto API** | Toute la cryptographie côté client | API native du navigateur, sans dépendance tierce |

### Protections réseau et serveur

- **Helmet** — sécurise les en-têtes HTTP (CSP, HSTS, X-Frame-Options…)
- **CORS strict** — seule l'origine `FRONTEND_URL` est autorisée
- **Rate-limiting** :
  - `/api/auth/login` et `/api/auth/register` — 10 requêtes par IP / 15 min
  - `/api/auth/salt` — 30 requêtes par IP / 15 min
  - Toutes les routes — 300 requêtes par IP / 15 min (protection globale)
- **Validation des entrées** — `express-validator` sur toutes les routes sensibles
- **Cookies `httpOnly` + `Secure` + `SameSite`** — protection contre XSS et CSRF

---

## Démarrage

### Backend

```bash
cd password-manager-back
cp .env.example .env   # remplir les variables ci-dessous
npm install
npm run dev
```

Variables d'environnement requises :

| Variable | Description |
|----------|-------------|
| `DB_HOST` | Hôte MySQL |
| `DB_USER` | Utilisateur MySQL |
| `DB_PASSWORD` | Mot de passe MySQL |
| `DB_NAME` | Nom de la base de données |
| `DB_PORT` | Port MySQL (par défaut 3306) |
| `DB_SSL` | `true` pour TiDB Cloud / MySQL distant |
| `JWT_SECRET` | Secret JWT — long, aléatoire, différent selon l'environnement |
| `PORT` | Port du serveur Express (par défaut 3003) |
| `FRONTEND_URL` | URL du frontend autorisée par CORS (ex. `http://localhost:5173`) |

Initialiser la base de données :

```bash
mysql -u <user> -p <db_name> < sql/schema.sql
```

### Frontend

```bash
cd password-manager-front
cp .env.example .env   # définir VITE_API_URL
npm install
npm run dev
```

| Variable | Description |
|----------|-------------|
| `VITE_API_URL` | URL de l'API sans `/api` final (ex. `http://localhost:3003`) |

---

## Vérification

```bash
# Lint + build du frontend
cd password-manager-front && npm run lint && npm run build

# Tests d'intégration du backend (nécessite une base de données de test)
cd password-manager-back && npm test
```
