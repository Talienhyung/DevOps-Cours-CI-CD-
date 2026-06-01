# Réponses — TP TrainShop Starter

## Partie 3 — Comprendre

**1. Quels sont les services Docker ?**
Trois services définis dans `docker-compose.yml` : `frontend` (nginx), `api` (Node.js/Express) et `db` (PostgreSQL 16).

**2. Quel service expose le port 8081 ?**
Le service `frontend` : il mappe `8081` (hôte) → `80` (conteneur nginx).

**3. Quel service expose le port 3000 ?**
Le service `api` : il mappe `3000` (hôte) → `3000` (conteneur Express).

**4. Pourquoi la base PostgreSQL utilise un volume ?**
Le volume `db_data` rend les données **persistantes** : elles survivent à l'arrêt/redémarrage et à la recréation du conteneur. Sans volume, toutes les données seraient perdues à chaque `docker compose down`.

**5. À quoi sert `.env.example` ?**
C'est un modèle de configuration versionné (sans secret réel) qui documente les variables attendues (`POSTGRES_*`, `API_PORT`, `DATABASE_URL`). Chacun le copie en `.env` (qui, lui, est ignoré par git) pour ses propres valeurs.

**6. À quoi sert le Dockerfile API ?**
Il décrit comment construire l'image de l'API : on part de `node:20-alpine`, on installe les dépendances de production (`npm install --omit=dev`), on copie le code `src/`, on expose le port 3000 et on lance `node src/server.js`.

**7. À quoi sert le Dockerfile frontend ?**
Il construit l'image du frontend : on part de `nginx:1.27-alpine`, on copie les fichiers statiques (`src/`) dans `/usr/share/nginx/html/`, et nginx les sert sur le port 80.

**8. Pourquoi le projet ne contient pas encore `.github/workflows` ?**
C'est volontaire : l'objectif pédagogique du TP est que les apprenants créent eux-mêmes la CI/CD GitHub Actions. (Désormais ajouté dans le cadre de ce TP.)

## Partie 4 — Exercice API

Route `GET /about` ajoutée dans `api/src/app.js`, couverte par `api/tests/about.test.js`. Réponse :

```json
{
  "project": "TrainShop Starter",
  "module": "DevOps",
  "objective": "Créer une CI GitHub Actions"
}
```

## Partie 5 — Exercice CI

- `.github/workflows/ci.yml` — job `test-api` (checkout → Node 20 → `npm install` → `npm test`) puis job `docker-build` (build des images API et frontend), déclenché au push/PR sur `main`.
- **Bonus** : `.github/workflows/docker-publish.yml` — build + push des images sur Docker Hub (nécessite les secrets `DOCKERHUB_USERNAME` et `DOCKERHUB_TOKEN`).
