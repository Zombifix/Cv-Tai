# 🚀 Guide de déploiement sur Railway

## Ce qui a été modifié dans cette version

- ✅ **Scraping d'URL réel** : colle une URL LinkedIn/Indeed/WTTJ et l'app récupère automatiquement le texte via Jina.ai (gratuit, sans clé)
- ✅ **Config Railway** : fichier `railway.toml` ajouté, l'app se déploie en 1 clic
- ✅ **Message UI mis à jour** : plus de message d'erreur "LinkedIn bloque l'accès", remplacé par une info positive

---

## Étapes Railway (30 minutes, pas de code)

### 1. Mettre le code sur GitHub

1. Va sur [github.com](https://github.com) → crée un compte gratuit
2. Clique **New repository** → nomme-le `cv-tai` → **Create repository**
3. Sur la page du repo, clique **uploading an existing file**
4. Glisse-dépose **tous les fichiers** du zip (décompresse d'abord)
5. Clique **Commit changes**

### 2. Créer le projet Railway

1. Va sur [railway.app](https://railway.app) → **Login with GitHub**
2. Clique **New Project** → **Deploy from GitHub repo**
3. Sélectionne ton repo `cv-tai`
4. Railway détecte automatiquement Node.js → clique **Deploy**

### 3. Ajouter la base de données

1. Dans ton projet Railway, clique **+ New** → **Database** → **PostgreSQL**
2. La variable `DATABASE_URL` est automatiquement injectée dans ton app ✅

### 4. Configurer les variables d'environnement

Dans Railway → ton service → onglet **Variables**, ajoute :

| Variable | Valeur |
|---|---|
| `GROQ_API_KEY` | Ta clé depuis [console.groq.com](https://console.groq.com) |
| `SESSION_SECRET` | N'importe quelle longue phrase aléatoire |
| `NODE_ENV` | `production` |

### 5. Initialiser la base de données

Une fois déployé, dans Railway → ton service → onglet **Deploy** → **Run command** :
```
npm run db:push
```

### 6. C'est prêt ! 🎉

Railway te donne une URL publique (ex: `cv-tai-production.up.railway.app`).
Chaque fois que tu modifies le code sur GitHub → Railway redéploie automatiquement.

---

## Coût estimé

- Railway : ~5€/mois (plan Hobby)
- Groq API : quasi gratuit (quelques centimes pour des centaines de CV)
- **Total : ~5€/mois** vs le gouffre Replit 💸
