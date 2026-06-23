#!/bin/bash
# Convierte tu archivo JSON de GCP a base64 listo para pegar en Netlify

JSON_FILE="${1:-$HOME/Downloads/*.json}"
JSON_FILE=$(ls $JSON_FILE 2>/dev/null | head -1)

if [ -z "$JSON_FILE" ]; then
  echo "❌ No encontré el archivo JSON. Uso: ./scripts/gcp-to-netlify.sh /ruta/credenciales.json"
  exit 1
fi

echo ""
echo "✅ Archivo: $JSON_FILE"
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo "  Copia este valor en Netlify como GOOGLE_CREDENTIALS_B64:"
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
base64 -i "$JSON_FILE" | tr -d '\n'
echo ""
echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
PROJECT=$(python3 -c "import json,sys; print(json.load(open('$JSON_FILE')).get('project_id',''))" 2>/dev/null)
if [ -n "$PROJECT" ]; then
  echo "  GCP_PROJECT_ID = $PROJECT"
fi
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
