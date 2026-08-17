#!/usr/bin/env bash
# Configura las claves de Stripe en Vercel (producción) y redeploya.
# Uso:  bash scripts/set-stripe.sh
# Te pedirá pegar la SECRET KEY (sk_test_… / sk_live_…) y el WEBHOOK SECRET (whsec_…).
# Las claves NUNCA salen de tu máquina: van directas de aquí a Vercel.
set -euo pipefail
cd "$(dirname "$0")/.."

echo "→ Pega tu Stripe SECRET KEY (sk_test_… o sk_live_…) y pulsa Enter:"
read -r -s SK
echo "   (recibida, ${#SK} caracteres)"
echo "→ Pega tu Stripe WEBHOOK SECRET (whsec_…) y pulsa Enter:"
read -r -s WH
echo "   (recibida, ${#WH} caracteres)"

if [ "${#SK}" -lt 20 ]; then
  echo "⚠️  La secret key parece demasiado corta — ¿seguro que es la 'Secret key' de Developers → API keys? Abortando."
  exit 1
fi

echo "→ Actualizando STRIPE_SECRET_KEY…"
npx vercel env rm STRIPE_SECRET_KEY production -y >/dev/null 2>&1 || true
printf '%s' "$SK" | npx vercel env add STRIPE_SECRET_KEY production

echo "→ Actualizando STRIPE_WEBHOOK_SECRET…"
npx vercel env rm STRIPE_WEBHOOK_SECRET production -y >/dev/null 2>&1 || true
printf '%s' "$WH" | npx vercel env add STRIPE_WEBHOOK_SECRET production

echo "→ Redeploy a producción…"
npx vercel --prod --yes

echo "✅ Listo. Avisa a Claude para que verifique el checkout."
