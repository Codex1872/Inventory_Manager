#!/bin/sh
set -e

: "${API_ORIGIN:?API_ORIGIN is required (ex: https://inventory-api-xxxx.onrender.com)}"

API_ORIGIN="${API_ORIGIN%/}"
export API_ORIGIN

envsubst '${API_ORIGIN}' \
  < /etc/nginx/templates/default.conf.template \
  > /etc/nginx/conf.d/default.conf

echo "── API_ORIGIN=[$API_ORIGIN]"
grep -n "proxy_pass" /etc/nginx/conf.d/default.conf

nginx -t
exec "$@"