#!/usr/bin/env bash
# =============================================================================
#  launch.sh — Script de démarrage de l'Inventory Manager Hub
#
#  Usage :
#    ./launch.sh          → démarre tous les services (build si nécessaire)
#    ./launch.sh --build  → force le rebuild des images Docker
#    ./launch.sh --stop   → arrête tous les services
#    ./launch.sh --clean  → arrête et supprime les containers + volumes
#    ./launch.sh --logs   → affiche les logs en temps réel
#    ./launch.sh --status → affiche l'état des services
# =============================================================================

set -euo pipefail

# ─── Couleurs ────────────────────────────────────────────────────────────────
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
RESET='\033[0m'

# ─── Helpers ─────────────────────────────────────────────────────────────────
info()    { echo -e "${BLUE}ℹ${RESET}  $*"; }
success() { echo -e "${GREEN}✔${RESET}  $*"; }
warn()    { echo -e "${YELLOW}⚠${RESET}  $*"; }
error()   { echo -e "${RED}✖${RESET}  $*" >&2; }
header()  { echo -e "\n${BOLD}${CYAN}▸ $*${RESET}"; }

# ─── Vérification des prérequis ──────────────────────────────────────────────
check_prerequisites() {
  header "Vérification des prérequis"

  local missing=0

  if ! command -v docker &>/dev/null; then
    error "Docker n'est pas installé. → https://docs.docker.com/get-docker/"
    missing=1
  else
    success "Docker $(docker --version | awk '{print $3}' | tr -d ',')"
  fi

  # Vérifier docker compose (v2 plugin ou standalone)
  if docker compose version &>/dev/null 2>&1; then
    success "Docker Compose $(docker compose version --short 2>/dev/null || echo 'v2')"
    COMPOSE_CMD="docker compose"
  elif command -v docker-compose &>/dev/null; then
    warn "Utilisation de docker-compose v1 (recommandé : Docker Compose v2)"
    COMPOSE_CMD="docker-compose"
  else
    error "Docker Compose n'est pas installé. → https://docs.docker.com/compose/install/"
    missing=1
  fi

  if [[ $missing -eq 1 ]]; then
    echo ""
    error "Des prérequis manquent. Installez-les et relancez le script."
    exit 1
  fi
}

# ─── Initialisation du fichier .env ──────────────────────────────────────────
init_env() {
  if [[ ! -f ".env" ]]; then
    if [[ -f ".env.example" ]]; then
      cp .env.example .env
      warn "Fichier .env créé depuis .env.example."
      warn "Pensez à modifier le mot de passe POSTGRES_PASSWORD avant de déployer en production !"
    else
      error "Aucun fichier .env ni .env.example trouvé dans le répertoire courant."
      exit 1
    fi
  else
    info "Fichier .env existant trouvé."
  fi
}

# ─── Lecture des ports depuis .env ───────────────────────────────────────────
read_ports() {
  # Valeurs par défaut
  FRONTEND_PORT=80
  API_PORT=8080

  if [[ -f ".env" ]]; then
    # shellcheck disable=SC2155
    local val
    val=$(grep -E '^FRONTEND_PORT=' .env | cut -d= -f2 | tr -d ' ')
    [[ -n "$val" ]] && FRONTEND_PORT="$val"

    val=$(grep -E '^API_PORT=' .env | cut -d= -f2 | tr -d ' ')
    [[ -n "$val" ]] && API_PORT="$val"
  fi
}

# ─── Affichage des URLs d'accès ──────────────────────────────────────────────
show_urls() {
  read_ports

  local fe_port="$FRONTEND_PORT"
  local api_port="$API_PORT"

  # Calculer l'URL proprement (port 80 → pas de :port dans l'URL)
  local fe_url
  if [[ "$fe_port" == "80" ]]; then
    fe_url="http://localhost"
  else
    fe_url="http://localhost:${fe_port}"
  fi

  echo ""
  echo -e "${BOLD}${GREEN}╔══════════════════════════════════════════════════╗${RESET}"
  echo -e "${BOLD}${GREEN}║       Inventory Manager Hub — En ligne !         ║${RESET}"
  echo -e "${BOLD}${GREEN}╚══════════════════════════════════════════════════╝${RESET}"
  echo ""
  echo -e "  ${BOLD}🌐 Application web   ${RESET} ${CYAN}${fe_url}${RESET}"
  echo -e "  ${BOLD}📦 Admin             ${RESET} ${CYAN}${fe_url}/app${RESET}"
  echo -e "  ${BOLD}🛍️  Vitrine           ${RESET} ${CYAN}${fe_url}${RESET}"
  echo -e "  ${BOLD}🔌 API REST          ${RESET} ${CYAN}http://localhost:${api_port}/api/health${RESET}"
  echo ""
  echo -e "  ${YELLOW}Arrêter :${RESET}  ./launch.sh --stop"
  echo -e "  ${YELLOW}Logs    :${RESET}  ./launch.sh --logs"
  echo -e "  ${YELLOW}Statut  :${RESET}  ./launch.sh --status"
  echo ""
}

# ─── Attendre que le frontend soit prêt ──────────────────────────────────────
wait_for_frontend() {
  read_ports
  local url="http://localhost:${FRONTEND_PORT}"
  local max_attempts=30
  local attempt=0

  info "En attente du démarrage des services..."

  while [[ $attempt -lt $max_attempts ]]; do
    if curl -sf "$url" -o /dev/null 2>/dev/null; then
      return 0
    fi
    attempt=$((attempt + 1))
    sleep 3
    echo -n "."
  done

  echo ""
  warn "Le frontend n'a pas répondu dans les délais. Vérifiez les logs : ./launch.sh --logs"
  return 1
}

# ─── Commandes ───────────────────────────────────────────────────────────────
cmd_start() {
  local force_build="${1:-}"

  check_prerequisites
  init_env

  header "Démarrage des services"

  local build_flag=""
  [[ "$force_build" == "--build" ]] && build_flag="--build"

  # Lance tous les services en arrière-plan
  # --remove-orphans : supprime les containers d'anciens services
  $COMPOSE_CMD up -d --remove-orphans $build_flag

  # Attendre que tout soit prêt
  wait_for_frontend && show_urls
}

cmd_stop() {
  check_prerequisites
  header "Arrêt des services"
  $COMPOSE_CMD stop
  success "Services arrêtés."
}

cmd_clean() {
  check_prerequisites
  header "Suppression des containers et volumes"
  warn "Ceci va supprimer TOUTES les données de la base de données !"
  read -r -p "Confirmer ? [y/N] " confirm
  if [[ "$confirm" =~ ^[Yy]$ ]]; then
    $COMPOSE_CMD down --volumes --remove-orphans
    success "Containers et volumes supprimés."
  else
    info "Annulé."
  fi
}

cmd_logs() {
  check_prerequisites
  header "Logs en temps réel (Ctrl+C pour quitter)"
  $COMPOSE_CMD logs -f --tail=50
}

cmd_status() {
  check_prerequisites
  header "État des services"
  $COMPOSE_CMD ps
}

# ─── Point d'entrée ──────────────────────────────────────────────────────────

# S'assurer qu'on est dans le bon répertoire (celui contenant docker-compose.yml)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

case "${1:-}" in
  --stop)   cmd_stop   ;;
  --clean)  cmd_clean  ;;
  --logs)   cmd_logs   ;;
  --status) cmd_status ;;
  --build)  cmd_start "--build" ;;
  "")       cmd_start "" ;;
  *)
    echo "Usage: $0 [--build|--stop|--clean|--logs|--status]"
    exit 1
    ;;
esac
