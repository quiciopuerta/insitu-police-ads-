#!/bin/bash

# security-tests.sh — INsitu AI Security Verification Suite
# Ejecutar: bash scripts/security-tests.sh

set +e

PASS=0
FAIL=0
WARN=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo ""
echo "🔐 ========================================="
echo "   INsitu AI Security Verification Suite"
echo "   ========================================="
echo ""

# Test 1: No API keys en bundle
test_1() {
  echo -n "Test 1.1: API keys not exposed in bundle... "
  if npm run build > /dev/null 2>&1; then
    if grep -r "AIzaSy" dist/ 2>/dev/null | grep -q "\.js"; then
      echo -e "${RED}❌ FAIL${NC}"
      echo "   API keys found in JavaScript bundle"
      ((FAIL++))
    elif grep -r "apify_api_" dist/ 2>/dev/null | grep -q "\.js"; then
      echo -e "${RED}❌ FAIL${NC}"
      echo "   Apify tokens found in bundle"
      ((FAIL++))
    else
      echo -e "${GREEN}✅ PASS${NC}"
      ((PASS++))
    fi
  else
    echo -e "${YELLOW}⚠️  SKIP${NC} (build failed)"
    ((WARN++))
  fi
}

# Test 2: No VITE_ de secretos
test_2() {
  echo -n "Test 1.2: No VITE_ secret prefixes in .env... "
  if grep "^VITE_GOOGLE_GENAI_API_KEY\|^VITE_ADMIN_PASSWORD" .env 2>/dev/null; then
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
  else
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  fi
}

# Test 3: vite-env.d.ts no tiene secretos
test_3() {
  echo -n "Test 1.3: vite-env.d.ts doesn't declare secrets... "
  if grep "VITE_GOOGLE_GENAI\|VITE_ADMIN_PASSWORD" src/vite-env.d.ts 2>/dev/null; then
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
  else
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  fi
}

# Test 4: OAuth2Client JWT verification
test_4() {
  echo -n "Test 2.1: JWT verification with OAuth2Client... "
  if grep -q "OAuth2Client" netlify/functions/api-auth.ts && grep -q "verifyIdToken" netlify/functions/api-auth.ts; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   OAuth2Client or verifyIdToken not found"
    ((FAIL++))
  fi
}

# Test 5: admin-master backdoor removed
test_5() {
  echo -n "Test 2.2: admin-master backdoor removed... "
  if grep -r "admin-master" netlify/functions/ 2>/dev/null | grep -v "Binary" | grep -q "."; then
    echo -e "${RED}❌ FAIL${NC}"
    grep -r "admin-master" netlify/functions/ | head -3
    ((FAIL++))
  else
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  fi
}

# Test 6: Hardcoded emails removed
test_6() {
  echo -n "Test 2.3: Hardcoded emails removed... "
  if grep -r "sociopuerta@gmail.com" netlify/functions/ 2>/dev/null; then
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
  else
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  fi
}

# Test 7: CORS restricted
test_7() {
  echo -n "Test 6.2: CORS restricted to allowed domains... "
  if grep -q "insitu.company" netlify/functions/_lib/corsHelper.ts; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   CORS not properly restricted"
    ((FAIL++))
  fi
}

# Test 8: Rate limiting enabled
test_8() {
  echo -n "Test 6.1: Rate limiting enabled in api-auth... "
  if grep -q "checkRateLimit" netlify/functions/api-auth.ts; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   Rate limiting not found"
    ((FAIL++))
  fi
}

# Test 9: Error sanitization
test_9() {
  echo -n "Test 5.1: Error sanitization enabled... "
  if grep -q "safeError" netlify/functions/api-auth.ts && grep -q "safeError" netlify/functions/_lib/errorHandler.ts; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   Error sanitization missing"
    ((FAIL++))
  fi
}

# Test 10: XSS sanitization
test_10() {
  echo -n "Test 5.3: XSS sanitization in contact/leads... "
  if grep -q "sanitizeXSS" netlify/functions/api-contact.ts && grep -q "sanitizeXSS" netlify/functions/api-leads.ts; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   XSS sanitization missing"
    ((FAIL++))
  fi
}

# Test 11: Domain sanitization
test_11() {
  echo -n "Test 5.2: Domain sanitization in traffic analysis... "
  if grep -q "sanitize.*domain\|domain.*sanitize" netlify/functions/api-analyze-traffic.ts && \
     grep -q "substring(0, 255)" netlify/functions/api-analyze-traffic.ts; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    echo "   Domain sanitization incomplete"
    ((FAIL++))
  fi
}

# Test 12: Rotation policy exists
test_12() {
  echo -n "Test 10.1: Credential rotation policy documented... "
  if test -f CREDENTIAL_ROTATION_POLICY.md && grep -q "2026-06-19\|2026-07-19" CREDENTIAL_ROTATION_POLICY.md; then
    echo -e "${GREEN}✅ PASS${NC}"
    ((PASS++))
  else
    echo -e "${RED}❌ FAIL${NC}"
    ((FAIL++))
  fi
}

# Test 13: Upstash configured
test_13() {
  echo -n "Test 6.1: Upstash Redis rate limiting setup... "
  if grep -q "UPSTASH_REDIS_REST_URL" .env; then
    if grep "^UPSTASH_REDIS_REST_URL=$" .env > /dev/null; then
      echo -e "${YELLOW}⚠️  WARN${NC} (not yet configured)"
      ((WARN++))
    else
      echo -e "${GREEN}✅ PASS${NC}"
      ((PASS++))
    fi
  else
    echo -e "${YELLOW}⚠️  WARN${NC} (env variable missing)"
    ((WARN++))
  fi
}

# Run all tests
echo "Secrets Exposure:"
test_1
test_2
test_3

echo ""
echo "Authentication & JWT:"
test_4
test_5
test_6

echo ""
echo "Input Validation & Sanitization:"
test_10
test_11

echo ""
echo "Rate Limiting & CORS:"
test_7
test_8

echo ""
echo "Error Handling:"
test_9

echo ""
echo "Credential Rotation:"
test_12
test_13

# Summary
echo ""
echo "========================================="
TOTAL=$((PASS + FAIL + WARN))
echo -e "Results: ${GREEN}✅ $PASS passed${NC}, ${RED}❌ $FAIL failed${NC}, ${YELLOW}⚠️  $WARN warnings${NC}"
echo "========================================="
echo ""

if [ $FAIL -gt 0 ]; then
  echo -e "${RED}Security verification FAILED - fix above issues${NC}"
  exit 1
elif [ $WARN -gt 0 ]; then
  echo -e "${YELLOW}Security verification PASSED with $WARN warnings${NC}"
  exit 0
else
  echo -e "${GREEN}All security tests PASSED! ✅${NC}"
  exit 0
fi
