# Inventory Manager Hub

Application complète de gestion de stock avec boutique en ligne, caisse POS, authentification par rôles et paiement Stripe.

---

## 🚀 Démarrage rapide

```bash
chmod +x launch.sh
./launch.sh
```

À la première exécution : Docker construit les images, migre la base de données, crée le compte admin et démarre l'application.

---

## 🌐 Accès

| Service          | URL                               |
|------------------|-----------------------------------|
| Boutique         | http://localhost                  |
| Admin            | http://localhost/app              |
| Caisse (POS)     | http://localhost/app/pos          |
| API (health)     | http://localhost:8080/api/health  |

**Compte admin par défaut :**
- Email : `admin@stockflow.com`
- Mot de passe : `Admin1234!`
- ⚠️ Changez ces valeurs dans `.env` avant de déployer en production.

---

## ⚙️ Configuration (fichier `.env`)

```env
# Base de données
POSTGRES_PASSWORD=changeme_en_production

# JWT — générez avec : openssl rand -base64 48
JWT_SECRET=votre_secret_tres_long

# Compte admin initial
ADMIN_EMAIL=admin@votredomaine.com
ADMIN_PASSWORD=MotDePasseSecure!

# Stripe (paiement en ligne)
VITE_STRIPE_PUBLIC_KEY=pk_live_xxxxx
STRIPE_SECRET_KEY=sk_live_xxxxx
STRIPE_WEBHOOK_SECRET=whsec_xxxxx

# Ports
FRONTEND_PORT=80
API_PORT=8080
```

---

## 👥 Rôles utilisateurs

| Rôle      | Accès                                      |
|-----------|--------------------------------------------|
| `admin`   | Tout : admin, POS, utilisateurs, boutique  |
| `seller`  | Dashboard, POS, produits, stocks           |
| `client`  | Boutique, panier, commandes, profil        |

Les vendeurs et admins sont créés depuis `/app/users`.  
Les clients s'inscrivent depuis la boutique (`/register`).

---

## 💳 Intégration Stripe

1. Créez un compte sur [stripe.com](https://stripe.com)
2. Récupérez vos clés dans le Dashboard → Développeurs → Clés API
3. Ajoutez-les dans `.env`
4. Relancez : `./launch.sh --build`

**Mode test :** utilisez la carte `4242 4242 4242 4242` (expiry : toute date future, CVV : 3 chiffres)

**Webhook local (développement) :**
```bash
stripe listen --forward-to localhost:8080/api/webhook/stripe
```

---

## 🛠️ Commandes

```bash
./launch.sh            # Démarrer
./launch.sh --build    # Rebuild des images (après modif du code)
./launch.sh --stop     # Arrêter (données conservées)
./launch.sh --logs     # Logs en temps réel
./launch.sh --status   # État des services
./launch.sh --clean    # ⚠️ Tout supprimer (données comprises)
```

---

## 🏗️ Architecture

```
Navigateur
    │
    ▼
Nginx :80
    ├─ /* ──────────────▶ React SPA (Vite build)
    └─ /api/* ──────────▶ API Node.js :3000
                               │
                    ┌──────────┴──────────┐
                    ▼                     ▼
             PostgreSQL              Stripe API
           (volume persistant)
```

**Packages du monorepo :**
- `artifacts/api-server` — Express, Drizzle ORM, JWT, Stripe, bcrypt
- `artifacts/stockflow` — React, Vite, Tailwind, Stripe Elements
- `lib/db` — Schémas Drizzle (PostgreSQL)
- `lib/api-client-react` — Client généré (React Query)

---

## 🗄️ Accès direct à la base

```bash
docker compose exec db psql -U postgres -d inventory
```

## 🔑 Générer un JWT_SECRET sécurisé

```bash
openssl rand -base64 48
```
