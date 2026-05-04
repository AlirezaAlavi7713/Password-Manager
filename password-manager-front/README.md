# VaultKey Front

Interface React + Vite du gestionnaire de mots de passe VaultKey.

## Scripts

```bash
npm run dev
npm run lint
npm run build
npm run preview
```

## Configuration

Creer un fichier `.env` local avec:

```bash
VITE_API_URL=http://localhost:3003
```

Le client ajoute `/api` automatiquement et envoie les cookies d'authentification avec `withCredentials`.
