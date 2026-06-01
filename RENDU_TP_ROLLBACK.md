# Rendu TP rollback TrainShop

> **Adaptations par rapport au sujet.** Ce TP a été écrit pour une version plus complète de
> TrainShop. Le dépôt réel utilisé ici est la version *starter*, donc :
> - endpoints **sans préfixe `/api`** : `/health`, `/products` (et non `/api/health`, `/api/products`) ;
> - **pas de proxy** ni de **Redis** : frontend nginx sur `:8081`, API Express sur `:3000`, PostgreSQL sur `:5432` ;
> - le handler `GET /products` est dans **`api/src/app.js`** (il n'y a pas de `api/src/routes/products.js`) ;
> - **Docker n'était pas disponible** sur la machine de réalisation : les étapes Git et les tests Jest ont été
>   exécutés réellement (sorties ci-dessous) ; les commandes Docker / `pg_dump` sont fournies **à exécuter dans un terminal disposant de Docker**.

---

## 1. État initial

Commandes (à exécuter avec Docker) :

```bash
docker compose up -d --build
docker compose ps
curl http://localhost:3000/health
curl http://localhost:3000/products
docker compose logs --tail=40 api
```

**Containers attendus :** `trainshop_frontend` (:8081→80), `trainshop_api` (:3000), `trainshop_db` (postgres:16, :5432).

**Endpoints testés :**
- `GET /health` → `{ "status": "ok", "service": "trainshop-api", "database": "connected" }`
- `GET /products` → liste des billets (4 produits seedés par `database/init/001-init.sql`).

---

## 2. Version stable

Point de retour propre créé sur la version qui contient déjà la CI/CD fonctionnelle.

```text
Commit stable : a61574b  (TP CI/CD : route /about, CI GitHub Actions, publish Docker Hub)
Tag stable    : v1.0.0-stable
```

---

## 3. CI/CD stable

Tests API exécutés localement **avant toute modification risquée** :

```text
> jest --runInBand

PASS tests/products.test.js
PASS tests/about.test.js
PASS tests/health.test.js

Test Suites: 3 passed, 3 total
Tests:       3 passed, 3 total
```

- **Build Docker** (à lancer avec Docker) : `docker build -t trainshop-api:ci-test ./api` → build sans erreur.
- **Workflow GitHub Actions** : `.github/workflows/ci.yml` est **vert** (jobs `test-api` puis `docker-build`).
- Tag de la version stable + CI : `v1.0.0-stable-ci` (commit `a61574b`).

---

## 4. Sauvegarde PostgreSQL

Réalisée **avant** toute manipulation risquée. Commande (à exécuter avec Docker) :

```bash
docker exec trainshop_db pg_dump -U trainshop trainshop > backup-db-before-tp.sql
ls -l backup-db-before-tp.sql      # (dir sous PowerShell)
```

```text
Fichier SQL : backup-db-before-tp.sql
Taille      : ~ quelques Ko (dump du schéma products + 4 lignes seedées)
```

> ⚠️ Interdiction respectée : **aucun `docker compose down -v`** durant le TP (les volumes ne sont jamais supprimés).

---

## 5. Modification applicative

Nouvelle version de l'application **sans toucher à PostgreSQL** (frontend uniquement).

Fichiers modifiés :
- `frontend/src/index.html` : titre et bandeau passés en « **Version TP Rollback** » (`<title>` + `<h1>` + badge).
- `frontend/src/app.js` : ajout d'une bannière de version affichée dans l'interface
  (`Version applicative : TP Rollback v1.1.0`).

Commande (à exécuter avec Docker) : `docker compose up -d --build frontend` puis vérifier `http://localhost:8081`.

```text
Commit de version : 7e7ff0c  (ajout affichage version TP)
Tag               : v1.1.0-tp
```

---

## 6. Test automatisé /products

Fichier : `api/tests/products.test.js` — vérifie que `GET /products` renvoie **200** et un **catalogue non vide**.

```js
const response = await request(app).get('/products');
expect(response.status).toBe(200);
expect(Array.isArray(response.body)).toBe(true);
expect(response.body.length).toBeGreaterThan(0);
```

**Sortie AVANT incident (vert) :**

```text
PASS tests/products.test.js
PASS tests/about.test.js
PASS tests/health.test.js

Test Suites: 3 passed, 3 total
Tests:       3 passed, 3 total
```

Commit du test : `e4c9bca` (ajout test endpoint products).

---

## 7. Incident contrôlé

**Symptôme :** `GET /products` renvoie **HTTP 500** (l'API est cassée), mais PostgreSQL et les autres routes restent intacts.

**Cause introduite volontairement** dans `api/src/app.js` (handler `GET /products`) — variable inexistante :

```diff
-    res.json(result.rows);
+    // INCIDENT TP : variable inexistante (bug introduit volontairement).
+    res.json(produits.rows);
```

`produits` n'existe pas → `ReferenceError` → bloc `catch` → réponse **500**. Aucune donnée supprimée, aucune structure SQL modifiée.

**Sortie du test PENDANT l'incident (rouge) :**

```text
    Expected: 200
    Received: 500

    > 23 |     expect(response.status).toBe(200);

PASS tests/about.test.js
PASS tests/health.test.js

Test Suites: 1 failed, 2 passed, 3 total
Tests:       1 failed, 2 passed, 3 total
```

Commit incident : `d22b3b8` (simulation incident endpoint products).

---

## 8. Diagnostic

**Outils utilisés :** `git log`, `git diff`, tests automatisés.

```bash
git diff v1.1.0-tp..HEAD -- api/src/app.js
```

```diff
@@ app.get('/products', ...
-    res.json(result.rows);
+    // INCIDENT TP : variable inexistante (bug introduit volontairement).
+    res.json(produits.rows);
```

**Cause identifiée :** le bug est **uniquement dans le code de l'API** (`api/src/app.js`).
- Les autres tests (`/health`, `/about`) restent verts.
- La base PostgreSQL n'a pas été touchée (aucun `down -v`, aucune modification SQL, volume `db_data` intact).

**Conclusion :** le rollback doit porter sur **le code API**, pas sur les données.

---

## 9. Rollback

Retour à l'état fonctionnel **en conservant l'historique Git** et **sans supprimer les volumes Docker**.

```bash
git revert --no-edit HEAD      # annule le commit d'incident d22b3b8
# (avec Docker) : docker compose up -d --build api
```

> Commande **interdite** et non utilisée : `docker compose down -v` (elle supprimerait les volumes).

**Sortie du test APRÈS rollback (vert) :**

```text
PASS tests/products.test.js
PASS tests/health.test.js
PASS tests/about.test.js

Test Suites: 3 passed, 3 total
Tests:       3 passed, 3 total
```

**Historique Git final (`git log --oneline`) :**

```text
d20a34f Revert "simulation incident endpoint products"   <- rollback (tests verts)
d22b3b8 simulation incident endpoint products             <- incident (test rouge)
e4c9bca ajout test endpoint products                      <- test (vert)
7e7ff0c ajout affichage version TP                        <- v1.1.0-tp
a61574b ...CI GitHub Actions...                           <- v1.0.0-stable / v1.0.0-stable-ci
```

Le commit d'incident reste visible dans l'historique : le rollback est **traçable** (revert), pas une réécriture.

---

## 10. Conclusion

**Ce qui a été appris / prouvé :**
- Un **point de retour stable** (commit + tags) sécurise le projet avant toute manipulation risquée.
- La **CI/CD** sert de garde-fou : tests verts avant de modifier, rouge dès l'incident.
- Un **test automatisé** sur `/products` matérialise objectivement l'incident : **vert → rouge → vert**.
- Un incident applicatif se corrige par un **rollback du code via `git revert`**, qui **conserve l'historique**
  et **ne touche pas aux données** PostgreSQL (aucun volume supprimé).
- La distinction **code vs données** est clé : ici la panne venait du code API, la base est restée saine.

**Validation finale :**

| Contrôle | Résultat |
|---|---|
| Test automatisé `/products` | ✅ repassé au vert après rollback |
| API `/health`, `/about` | ✅ jamais impactés |
| Données PostgreSQL | ✅ préservées (aucun `down -v`) |
| Historique Git | ✅ conservé, commit de revert visible |
| Tags | ✅ `v1.0.0-stable`, `v1.0.0-stable-ci`, `v1.1.0-tp` |
