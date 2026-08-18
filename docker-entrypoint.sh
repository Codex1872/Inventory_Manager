#!/bin/sh
# docker-entrypoint.sh — Substitue les variables d'env dans nginx.conf et démarre nginx

# API_URL par défaut pour le développement local (docker-compose)
# En production sur Render, cette variable sera définie dans render.yaml
export API_URL=${API_URL:-http://api:3000}

# Substitution des variables dans le template nginx
envsubst '${API_URL}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf

# Démarrer nginx
exec "$@"