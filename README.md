# VaultKey Password Manager

Application de gestion de mots de passe avec chiffrement cote client. Le serveur stocke les entrees chiffrees, le sel PBKDF2 et le hash bcrypt de la cle d'authentification derivee, mais ne recoit jamais le mot de passe maitre ni la cle de chiffrement du coffre.

## Structure

- `password-manager-front` : application React + Vite.
- `password-manager-back` : API Express + MySQL.
- `password-manager-back/sql/schema.sql` : schema de base de donnees.

## Demarrage

Back:

```bash
cd password-manager-back
cp .env.example .env
npm install
npm run dev
```

Front:

```bash
cd password-manager-front
npm install
npm run dev
```

Variables importantes:

- `FRONTEND_URL` cote back doit correspondre a l'URL Vite.
- `VITE_API_URL` cote front doit pointer vers l'API, sans `/api` final.
- `JWT_SECRET` doit etre long, aleatoire et different selon l'environnement.

## Verification

```bash
cd password-manager-front && npm run lint && npm run build
cd password-manager-back && npm test
```
