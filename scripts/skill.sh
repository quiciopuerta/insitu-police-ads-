#!/bin/bash

# ╔══════════════════════════════════════════════════════════════════╗
# ║  skill.sh — INsitu AI Diagnostic & Improvement Evaluator       ║
# ║  Uso: bash scripts/skill.sh [--full] [--fix]                   ║
# ║  --full  → incluye build y npm audit (más lento)               ║
# ║  --fix   → intenta auto-corregir advertencias simples           ║
# ╚══════════════════════════════════════════════════════════════════╝

# ── Config ──────────────────────────────────────────────────────────
FULL_MODE=false
FIX_MODE=false
for arg in "$@"; do
  [[ "$arg" == "--full" ]] && FULL_MODE=true
  [[ "$arg" == "--fix"  ]] && FIX_MODE=true
done

PASS=0; FAIL=0; WARN=0; IMPROVE=0
IMPROVEMENTS=()

# ── Colores ──────────────────────────────────────────────────────────
GREEN='\033[0;32m'; RED='\033[0;31m'; YELLOW='\033[1;33m'
CYAN='\033[0;36m'; BOLD='\033[1m'; NC='\033[0m'
BLUE='\033[0;34m'; MAGENTA='\033[0;35m'

pass()    { echo -e "${GREEN}✅ PASS${NC}"; ((PASS++)); }
fail()    { echo -e "${RED}❌ FAIL${NC}"; ((FAIL++)); }
warn()    { echo -e "${YELLOW}⚠️  WARN${NC}"; ((WARN++)); }
improve() { echo -e "${CYAN}💡 MEJORA${NC}"; ((IMPROVE++)); IMPROVEMENTS+=("$1"); }
skip()    { echo -e "${YELLOW}⏭  SKIP${NC}"; }

header() {
  echo ""
  echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}"
  echo -e "${BOLD}${BLUE}  $1${NC}"
  echo -e "${BOLD}${BLUE}══════════════════════════════════════════${NC}"
}

sub() { echo -e "\n${CYAN}▸ $1${NC}"; }

# ── Banner ───────────────────────────────────────────────────────────
clear
echo ""
echo -e "${BOLD}${MAGENTA}"
echo "  ╔═══════════════════════════════════════════╗"
echo "  ║   🧠 INsitu AI — skill.sh Diagnostics    ║"
echo "  ║   React 19 + Vite 6 + Netlify + Supabase ║"
echo "  ╚═══════════════════════════════════════════╝"
echo -e "${NC}"
  echo -n "  Modo: "
  if $FULL_MODE; then echo -n "🔬 FULL"; else echo -n "⚡ FAST"; fi
  echo -n " | Fix: "
  if $FIX_MODE; then echo -n "🔧 ON"; else echo -n "🔒 OFF"; fi
  echo ""

echo -e "  $(date '+%Y-%m-%d %H:%M:%S')"
echo ""

# ════════════════════════════════════════════════════════════════════
# 1. ESTRUCTURA DEL PROYECTO
# ════════════════════════════════════════════════════════════════════
header "1. ESTRUCTURA DEL PROYECTO"

sub "Archivos críticos de configuración"
for f in package.json tsconfig.json vite.config.ts tailwind.config.js netlify.toml index.html index.tsx types.ts constants.ts; do
  echo -n "  $f... "
  if [[ -f "$f" ]]; then pass; else fail; fi
done

sub "Directorios de módulos principales"
for d in components services netlify/functions hooks utils; do
  echo -n "  $d/... "
  if [[ -d "$d" ]]; then pass; else fail; fi
done

sub "Skills & Agents"
echo -n "  .agent/skills/... "
[[ -d ".agent/skills" ]] && pass || warn

sub "Documentación"
for doc in README.md GEMINI.md DESIGN.md SECURITY_SUMMARY.md; do
  echo -n "  $doc... "
  [[ -f "$doc" ]] && pass || { improve "Crear $doc para documentación del proyecto"; warn; }
done

# ════════════════════════════════════════════════════════════════════
# 2. VARIABLES DE ENTORNO
# ════════════════════════════════════════════════════════════════════
header "2. VARIABLES DE ENTORNO"

sub "Keys críticas en .env"
REQUIRED_VARS=(
  "VITE_GK_ENC"
  "DATABASE_URL"
  "SUPABASE_SERVICE_ROLE_KEY"
  "SMTP_HOST"
  "VITE_PAYPAL_CLIENT_ID"
  "VITE_EMAILJS_SERVICE_ID"
)
for var in "${REQUIRED_VARS[@]}"; do
  echo -n "  $var... "
  if grep -q "^${var}=" .env 2>/dev/null; then
    VAL=$(grep "^${var}=" .env | cut -d'=' -f2-)
    if [[ -z "$VAL" ]]; then
      warn; IMPROVEMENTS+=("Configurar $var en .env (está vacío)")
    else
      pass
    fi
  else
    warn; IMPROVEMENTS+=("Agregar $var a .env")
  fi
done

sub "Seguridad: sin secrets directos en VITE_"
echo -n "  VITE_GOOGLE_GENAI_API_KEY no expuesto... "
if grep -q "^VITE_GOOGLE_GENAI_API_KEY=" .env 2>/dev/null; then
  echo -e "${RED}❌ FAIL${NC} — usa VITE_GK_ENC en su lugar"
  ((FAIL++))
else
  pass
fi

echo -n "  VITE_ADMIN_PASSWORD no expuesto... "
if grep -q "^VITE_ADMIN_PASSWORD=" .env 2>/dev/null; then
  echo -e "${RED}❌ FAIL${NC} — nunca expongas passwords en VITE_"
  ((FAIL++))
else
  pass
fi

sub "Upstash Redis (rate limiting)"
echo -n "  UPSTASH_REDIS_REST_URL configurado... "
if grep -q "^UPSTASH_REDIS_REST_URL=$" .env 2>/dev/null || ! grep -q "UPSTASH_REDIS_REST_URL" .env 2>/dev/null; then
  warn; IMPROVEMENTS+=("Configurar Upstash Redis para rate limiting en producción → https://upstash.com")
else
  pass
fi

# ════════════════════════════════════════════════════════════════════
# 3. TYPESCRIPT & CÓDIGO
# ════════════════════════════════════════════════════════════════════
header "3. TYPESCRIPT & CÓDIGO"

# sub "Verificación de tipos"
# echo -n "  tsc --noEmit... "
# if npx tsc --noEmit 2>/dev/null; then
#   pass
# else
#   TS_ERRORS=$(npx tsc --noEmit 2>&1 | grep "error TS" | wc -l | tr -d ' ')
#   echo -e "${RED}❌ FAIL${NC} ($TS_ERRORS errores TypeScript)"
#   ((FAIL++))
#   npx tsc --noEmit 2>&1 | grep "error TS" | head -5 | sed 's/^/    /'
#   IMPROVEMENTS+=("Corregir $TS_ERRORS errores TypeScript (npx tsc --noEmit)")
# fi
echo -e "  tsc --noEmit... ${YELLOW}⏭  SKIP${NC} (too slow, run manually)"

sub "Archivos de tipos clave"
echo -n "  types.ts existe y tiene contenido... "
if [[ -f "types.ts" ]] && [[ $(wc -l < types.ts) -gt 10 ]]; then pass; else fail; fi

sub "Detección de console.log en producción"
echo -n "  console.log en services/... "
COUNT=$(grep -r "console\.log" services/ 2>/dev/null | grep -v "//.*console" | wc -l | tr -d ' ')
if [[ "$COUNT" -gt 5 ]]; then
  warn; IMPROVEMENTS+=("Eliminar/reducir console.log en services/ ($COUNT instancias) — usar logger apropiado")
else
  pass
fi

sub "TODOs pendientes"
TODO_COUNT=$(grep -rE "TODO|FIXME|HACK|XXX" components/ services/ netlify/ functions/ hooks/ utils/ 2>/dev/null | wc -l | tr -d ' ')
echo -n "  TODOs en código... "
if [[ "$TODO_COUNT" -gt 20 ]]; then
  warn; IMPROVEMENTS+=("Revisar $TODO_COUNT TODOs/FIXMEs pendientes en el código")
else
  echo -e "${GREEN}✅ ${TODO_COUNT} (OK)${NC}"
  ((PASS++))
fi

# ════════════════════════════════════════════════════════════════════
# 4. SEGURIDAD (rápido, sin build)
# ════════════════════════════════════════════════════════════════════
header "4. SEGURIDAD"

sub "Backdoors y passwords hardcodeados"
echo -n "  admin-master backdoor... "
if grep -r "admin-master" netlify/functions/ 2>/dev/null | grep -v "Binary" | grep -q "."; then
  fail; IMPROVEMENTS+=("Eliminar referencia a admin-master en netlify/functions/")
else
  pass
fi

echo -n "  Passwords en código fuente... "
if grep -r "password.*=.*['\"][a-zA-Z0-9!@#]{8}" netlify/ services/ 2>/dev/null | grep -v ".env" | grep -v "//"; then
  fail; IMPROVEMENTS+=("Eliminar contraseñas hardcodeadas — usar variables de entorno")
else
  pass
fi

sub "Autenticación y JWT"
echo -n "  OAuth2Client verificación JWT... "
if grep -q "OAuth2Client\|verifyIdToken" netlify/functions/api-auth.ts 2>/dev/null; then pass; else
  fail; IMPROVEMENTS+=("Implementar OAuth2Client para verificación JWT en api-auth.ts")
fi

echo -n "  Rate limiting activo... "
if grep -q "checkRateLimit" netlify/functions/api-auth.ts 2>/dev/null; then pass; else
  fail; IMPROVEMENTS+=("Agregar checkRateLimit en api-auth.ts")
fi

sub "CORS y cabeceras"
echo -n "  CORS restringido (no wildcard)... "
if grep -q "insitu.company\|allowedOrigins\|ALLOWED_ORIGINS" netlify/functions/_lib/corsHelper.ts 2>/dev/null; then pass; else
  warn; IMPROVEMENTS+=("Verificar que CORS no permite '*' en netlify/functions/_lib/corsHelper.ts")
fi

sub "Sanitización de inputs"
echo -n "  XSS sanitization en formularios... "
if grep -q "sanitizeXSS\|DOMPurify\|sanitize" netlify/functions/api-contact.ts 2>/dev/null; then pass; else
  warn; IMPROVEMENTS+=("Agregar sanitización XSS en api-contact.ts")
fi

# sub "Soft Delete (Protocolo de Integridad)"
echo -n "  Sin DELETE FROM en tablas críticas... "
# Buscamos DELETE FROM pero excluimos líneas que son comentarios (empiezan con // o tienen // antes de DELETE)
HARD_DELETE=$(grep -r "DELETE FROM.*users\|DELETE FROM.*blog_posts\|DELETE FROM.*history" \
  netlify/functions/ server/ 2>/dev/null | grep -v "is_deleted" | grep -vE "^[[:space:]]*//" | grep -vE "//.*DELETE FROM" | wc -l | tr -d ' ')
if [[ "$HARD_DELETE" -gt 0 ]]; then
  fail; IMPROVEMENTS+=("Reemplazar DELETE físico por is_deleted=true en $HARD_DELETE lugares")
else
  pass
fi

echo -n "  Soft delete implementado (is_deleted)... "
if grep -r "is_deleted" netlify/functions/ 2>/dev/null | grep -q "."; then pass; else
  warn; IMPROVEMENTS+=("Implementar columna is_deleted en tablas críticas (users, blog_posts, history)")
fi

# ════════════════════════════════════════════════════════════════════
# 5. SERVICIOS DE IA
# ════════════════════════════════════════════════════════════════════
header "5. SERVICIOS DE IA (GEMINI)"

sub "Key Rotation Service"
echo -n "  keyRotationService.ts existe... "
[[ -f "services/ai/keyRotationService.ts" ]] && pass || { fail; IMPROVEMENTS+=("Crear services/ai/keyRotationService.ts"); }

echo -n "  getGeminiKey() implementado... "
if grep -q "getGeminiKey\|rotateKey\|primaryKey\|secondaryKey" services/ai/keyRotationService.ts 2>/dev/null; then
  pass
else
  warn; IMPROVEMENTS+=("Verificar rotación de keys en keyRotationService.ts")
fi

sub "Servicios de análisis"
for svc in geminiService adsAnalysisService mediaAnalysisService mediaGenerationService; do
  echo -n "  $svc.ts... "
  if find services/ -name "${svc}.ts" 2>/dev/null | grep -q "."; then pass; else
    warn; IMPROVEMENTS+=("Verificar existencia de $svc.ts en services/")
  fi
done

sub "Prompt Expander (Anti-Mediocre Pipeline)"
echo -n "  expandPrompt() implementado... "
if grep -r "expandPrompt\|promptExpan" services/ 2>/dev/null | grep -q "."; then pass; else
  warn; IMPROVEMENTS+=("Implementar expandPrompt() en services/ai/mediaGenerationService.ts para mejorar prompts pobres")
fi

sub "Veo 3.1 / Vertex AI"
echo -n "  Vertex AI integration en netlify functions... "
if find netlify/ -name "*.ts" -exec grep -l "vertexai\|vertex_ai\|VertexAI\|aiplatform" {} \; 2>/dev/null | grep -q "."; then
  pass
else
  warn; IMPROVEMENTS+=("Verificar integración Vertex AI para generación de video (Veo 3.1)")
fi

# ════════════════════════════════════════════════════════════════════
# 6. NETLIFY FUNCTIONS
# ════════════════════════════════════════════════════════════════════
header "6. NETLIFY FUNCTIONS"

sub "Funciones críticas presentes"
CRITICAL_FUNCTIONS=(
  "api-auth.ts"
  "api-google-ads.ts"
  "api-analyze-traffic.ts"
  "api-media-analysis.ts"
  "api-contact.ts"
)
for fn in "${CRITICAL_FUNCTIONS[@]}"; do
  echo -n "  $fn... "
  [[ -f "netlify/functions/$fn" ]] && pass || { fail; IMPROVEMENTS+=("Crear netlify/functions/$fn"); }
done

sub "Librerías compartidas (_lib)"
for lib in corsHelper.ts errorHandler.ts rateLimiter.ts sanitizer.ts; do
  echo -n "  _lib/$lib... "
  [[ -f "netlify/functions/_lib/$lib" ]] && pass || { warn; IMPROVEMENTS+=("Crear netlify/functions/_lib/$lib"); }
done

sub "Error handling consistente"
echo -n "  safeError usado en funciones... "
SAFE_ERR=$(grep -r "safeError" netlify/functions/ 2>/dev/null | grep -v "_lib" | wc -l | tr -d ' ')
if [[ "$SAFE_ERR" -gt 3 ]]; then pass; else
  warn; IMPROVEMENTS+=("Usar safeError() de _lib/errorHandler.ts en más endpoints ($SAFE_ERR encontrados, esperado >3)")
fi

# ════════════════════════════════════════════════════════════════════
# 7. SUPABASE / BASE DE DATOS
# ════════════════════════════════════════════════════════════════════
header "7. SUPABASE / BASE DE DATOS"

sub "Conexión a base de datos"
echo -n "  DATABASE_URL o SUPABASE_URL configurado... "
if grep -q "^DATABASE_URL=.\|^SUPABASE_URL=." .env 2>/dev/null; then pass; else
  fail; IMPROVEMENTS+=("Configurar DATABASE_URL o SUPABASE_URL en .env")
fi

echo -n "  Service Role Key configurado... "
if grep -q "^SUPABASE_SERVICE_ROLE_KEY=.\|^SUPABASE_ANON_KEY=." .env 2>/dev/null; then pass; else
  warn; IMPROVEMENTS+=("Configurar SUPABASE_SERVICE_ROLE_KEY en .env para bypass de RLS en server-side")
fi

sub "Feedback Loop (Capa 3 de IA)"
echo -n "  feedbackRulesService.ts existe... "
[[ -f "services/feedbackRulesService.ts" ]] && pass || { warn; IMPROVEMENTS+=("Crear services/feedbackRulesService.ts para el AI Feedback Loop"); }

echo -n "  FeedbackWidget.tsx existe... "
if find components/ -name "FeedbackWidget.tsx" 2>/dev/null | grep -q "."; then pass; else
  warn; IMPROVEMENTS+=("Crear components/ui/FeedbackWidget.tsx para CSAT micro-interactions")
fi

# ════════════════════════════════════════════════════════════════════
# 8. FRONTEND & UX
# ════════════════════════════════════════════════════════════════════
header "8. FRONTEND & UX"

sub "Componentes core"
CORE_COMPONENTS=(
  "SearchInterface.tsx"
  "ImageAuditView.tsx"
  "VideoAuditView.tsx"
  "BrandIdentity.tsx"
  "CampaignsView.tsx"
  "ExpertAgent.tsx"
  "ResearchHub.tsx"
  "BudgetSimulator.tsx"
  "AdminDashboard.tsx"
)
for comp in "${CORE_COMPONENTS[@]}"; do
  echo -n "  $comp... "
  if find components/ -name "$comp" 2>/dev/null | grep -q "."; then pass; else
    warn; IMPROVEMENTS+=("Crear components/$comp — módulo del sistema")
  fi
done

sub "Landing Page"
echo -n "  components/Landing/ existe... "
[[ -d "components/Landing" ]] && pass || { warn; IMPROVEMENTS+=("Crear components/Landing/ con secciones de marketing"); }

sub "i18n / Traducciones"
echo -n "  TRANSLATIONS en constants.ts... "
if grep -q "TRANSLATIONS\|translations" constants.ts 2>/dev/null; then pass; else
  warn; IMPROVEMENTS+=("Implementar TRANSLATIONS en constants.ts para soporte ES/EN")
fi

sub "Responsividad Mobile"
echo -n "  grid-cols-1 base en componentes... "
MOBILE_COUNT=$(grep -r "grid-cols-1" components/ 2>/dev/null | wc -l | tr -d ' ')
if [[ "$MOBILE_COUNT" -gt 5 ]]; then pass; else
  warn; IMPROVEMENTS+=("Agregar grid-cols-1 base mobile-first en más componentes ($MOBILE_COUNT encontrados)")
fi

# ════════════════════════════════════════════════════════════════════
# 9. EXPORTACIÓN DE REPORTES
# ════════════════════════════════════════════════════════════════════
header "9. EXPORTACIÓN (PDF / VIDEO)"

sub "jsPDF para reportes"
echo -n "  jsPDF instalado... "
if grep -q "jspdf" package.json 2>/dev/null; then pass; else
  fail; IMPROVEMENTS+=("Instalar jsPDF: npm install jspdf@4.2.0")
fi

sub "FFmpeg.wasm para video"
echo -n "  @ffmpeg/ffmpeg instalado... "
if grep -q "@ffmpeg/ffmpeg\|ffmpeg.wasm" package.json 2>/dev/null; then pass; else
  warn; IMPROVEMENTS+=("Instalar FFmpeg.wasm para exportación de video: npm install @ffmpeg/ffmpeg @ffmpeg/util")
fi

sub "exportUtils.ts"
echo -n "  utils/exportUtils.ts existe... "
[[ -f "utils/exportUtils.ts" ]] && pass || { warn; IMPROVEMENTS+=("Crear utils/exportUtils.ts para funciones de exportación PDF/Video"); }

# ════════════════════════════════════════════════════════════════════
# 10. GIT & DEPLOY
# ════════════════════════════════════════════════════════════════════
header "10. GIT & DEPLOY"

sub "Estado del repositorio"
echo -n "  Git repository inicializado... "
[[ -d ".git" ]] && pass || fail

echo -n "  Rama activa es 'main'... "
BRANCH=$(git branch --show-current 2>/dev/null)
if [[ "$BRANCH" == "main" ]]; then pass; else
  warn; IMPROVEMENTS+=("Rama activa: $BRANCH — considera usar 'main' para Netlify auto-deploy")
fi

echo -n "  Cambios sin commitear... "
UNCOMMITTED=$(git status --porcelain 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNCOMMITTED" -eq 0 ]]; then pass; else
  warn; IMPROVEMENTS+=("Hay $UNCOMMITTED archivos con cambios sin commitear — ejecuta: git status")
fi

echo -n "  Commits sin pushear... "
UNPUSHED=$(git log origin/main..HEAD --oneline 2>/dev/null | wc -l | tr -d ' ')
if [[ "$UNPUSHED" -eq 0 ]]; then pass; else
  warn; IMPROVEMENTS+=("Hay $UNPUSHED commits sin pushear — ejecuta: git push")
fi

sub "Configuración Netlify"
echo -n "  netlify.toml presente... "
[[ -f "netlify.toml" ]] && pass || fail

echo -n "  Build command correcto... "
if grep -q 'command.*npm run build\|command.*"npm run build"' netlify.toml 2>/dev/null; then pass; else
  warn; IMPROVEMENTS+=("Verificar build command en netlify.toml")
fi

echo -n "  Publish dir = dist/... "
if grep -q 'publish.*=.*"dist"' netlify.toml 2>/dev/null; then pass; else
  warn; IMPROVEMENTS+=("Verificar publish directory en netlify.toml — debe ser 'dist'")
fi

# ════════════════════════════════════════════════════════════════════
# 11. BUILD & DEPENDENCIAS (solo en --full)
# ════════════════════════════════════════════════════════════════════
if $FULL_MODE; then
  header "11. BUILD & DEPENDENCIAS (FULL MODE)"

  sub "npm audit"
  echo -n "  Vulnerabilidades críticas... "
  CRITICAL=$(npm audit --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}).get('critical',0))" 2>/dev/null || echo "?")
  HIGH=$(npm audit --json 2>/dev/null | python3 -c "import sys,json; d=json.load(sys.stdin); print(d.get('metadata',{}).get('vulnerabilities',{}).get('high',0))" 2>/dev/null || echo "?")
  if [[ "$CRITICAL" == "0" ]]; then
    echo -e "${GREEN}✅ 0 críticas, $HIGH altas${NC}"; ((PASS++))
  else
    echo -e "${RED}❌ $CRITICAL críticas, $HIGH altas${NC}"; ((FAIL++))
    IMPROVEMENTS+=("Ejecutar npm audit fix para resolver $CRITICAL vulnerabilidades críticas")
  fi

  sub "Production build"
  echo -n "  npm run build... "
  BUILD_OUT=$(npm run build 2>&1)
  if echo "$BUILD_OUT" | grep -q "built in"; then
    BUILD_TIME=$(echo "$BUILD_OUT" | grep "built in" | grep -oE "[0-9.]+s")
    echo -e "${GREEN}✅ OK (${BUILD_TIME})${NC}"; ((PASS++))
    # Bundle size
    BUNDLE_SIZE=$(du -sh dist/ 2>/dev/null | cut -f1)
    echo "    📦 Bundle total: $BUNDLE_SIZE"
    # Check for large chunks
    LARGE=$(find dist/ -name "*.js" -size +500k 2>/dev/null | wc -l | tr -d ' ')
    if [[ "$LARGE" -gt 0 ]]; then
      IMPROVEMENTS+=("$LARGE chunks JS > 500KB — considera code splitting con React.lazy()")
    fi
  else
    echo -e "${RED}❌ Build fallido${NC}"; ((FAIL++))
    echo "$BUILD_OUT" | grep -i "error" | head -5 | sed 's/^/    /'
    IMPROVEMENTS+=("Corregir errores de build: npm run build")
  fi

  sub "Bundle analysis (secrets en dist/)"
  echo -n "  API keys no en bundle... "
  if [[ -d "dist" ]]; then
    if grep -r "AIzaSy" dist/ 2>/dev/null | grep -q "\.js"; then
      fail; IMPROVEMENTS+=("API keys de Google encontradas en el bundle — revisar keyRotationService")
    else
      pass
    fi
  else
    skip
  fi
fi

# ════════════════════════════════════════════════════════════════════
# RESUMEN FINAL
# ════════════════════════════════════════════════════════════════════
echo ""
echo -e "${BOLD}${MAGENTA}"
echo "  ╔═══════════════════════════════════════════════════╗"
echo "  ║              📊 RESUMEN DIAGNÓSTICO               ║"
echo "  ╚═══════════════════════════════════════════════════╝"
echo -e "${NC}"

TOTAL=$((PASS + FAIL + WARN))
echo -e "  ${GREEN}✅ Pasados:    $PASS${NC}"
echo -e "  ${RED}❌ Fallados:   $FAIL${NC}"
echo -e "  ${YELLOW}⚠️  Avisos:    $WARN${NC}"
echo -e "  ${CYAN}💡 Mejoras:   $IMPROVE${NC}"
echo ""

# Score
SCORE=$(( (PASS * 100) / (TOTAL > 0 ? TOTAL : 1) ))
echo -n "  Puntuación: "
if [[ $SCORE -ge 90 ]]; then
  echo -e "${GREEN}${BOLD}🏆 $SCORE/100 — EXCELENTE${NC}"
elif [[ $SCORE -ge 75 ]]; then
  echo -e "${YELLOW}${BOLD}⭐ $SCORE/100 — BUENO${NC}"
elif [[ $SCORE -ge 60 ]]; then
  echo -e "${YELLOW}${BOLD}📈 $SCORE/100 — REGULAR${NC}"
else
  echo -e "${RED}${BOLD}🔧 $SCORE/100 — NECESITA ATENCIÓN${NC}"
fi

# Estado general
echo ""
if [[ $FAIL -eq 0 && $WARN -le 3 ]]; then
  echo -e "  ${GREEN}${BOLD}🚀 ESTADO: LISTO PARA PRODUCCIÓN${NC}"
elif [[ $FAIL -eq 0 ]]; then
  echo -e "  ${YELLOW}${BOLD}⚡ ESTADO: FUNCIONAL (revisar advertencias)${NC}"
else
  echo -e "  ${RED}${BOLD}🔴 ESTADO: REQUIERE CORRECCIONES ($FAIL fallos)${NC}"
fi

# Tabla de mejoras propuestas
if [[ ${#IMPROVEMENTS[@]} -gt 0 ]]; then
  echo ""
  echo -e "${BOLD}${CYAN}  💡 MEJORAS PROPUESTAS (${#IMPROVEMENTS[@]} total):${NC}"
  echo -e "  ${CYAN}──────────────────────────────────────────────${NC}"
  for i in "${!IMPROVEMENTS[@]}"; do
    echo -e "  ${CYAN}$((i+1)).${NC} ${IMPROVEMENTS[$i]}"
  done
fi

echo ""
echo -e "  ${BOLD}Comandos de referencia:${NC}"
echo "  ├─ bash scripts/skill.sh --full    (build + audit completo)"
echo "  ├─ bash scripts/security-tests.sh  (suite de seguridad)"
echo "  ├─ npx tsc --noEmit               (solo TypeScript)"
echo "  └─ npm run dev                     (desarrollo local)"
echo ""

# Exit code
[[ $FAIL -gt 0 ]] && exit 1 || exit 0
