#!/usr/bin/env node
/**
 * Create Stripe coupons and promotion codes for early tester discounts (30%, 50%, 70%, 100% off).
 * Run from repo root:  node server/scripts/create-promo-codes.js
 * Or from server dir: node scripts/create-promo-codes.js
 * Requires: STRIPE_SECRET_KEY in server/.env (or current env).
 *
 * After running, add the printed env vars to server/.env so the API can apply codes at checkout.
 */
const path = require('path')
const fs = require('fs')

// Load server .env
const envPath = fs.existsSync(path.join(process.cwd(), 'server', '.env'))
  ? path.join(process.cwd(), 'server', '.env')
  : path.join(process.cwd(), '.env')
if (fs.existsSync(envPath)) {
  require('dotenv').config({ path: envPath })
  console.log('Loaded env from:', envPath)
}

const Stripe = require('stripe')
const key = process.env.STRIPE_SECRET_KEY
if (!key || !key.startsWith('sk_')) {
  console.error('Set STRIPE_SECRET_KEY in server/.env (e.g. sk_test_...) and run again.')
  process.exit(1)
}

const stripe = new Stripe(key, { apiVersion: '2026-01-28.clover' })

const DISCOUNTS = [
  { code: 'EARLY30', percentOff: 30 },
  { code: 'EARLY50', percentOff: 50 },
  { code: 'EARLY70', percentOff: 70 },
  { code: 'EARLY100', percentOff: 100 },
]

async function main() {
  console.log('Creating coupons and promotion codes in Stripe...\n')
  const envLines = []

  for (const { code, percentOff } of DISCOUNTS) {
    const coupon = await stripe.coupons.create({
      percent_off: percentOff,
      duration: 'once', // discount on first invoice only (first month)
      name: `Early tester ${percentOff}% off`,
      metadata: { source: 'create-promo-codes.js' },
    })
    const promo = await stripe.promotionCodes.create({
      promotion: { type: 'coupon', coupon: coupon.id },
      code,
      metadata: { source: 'create-promo-codes.js' },
    })
    envLines.push(`STRIPE_PROMO_${code}=${promo.id}`)
    console.log(`  ${code} → ${percentOff}% off (first payment) → ${promo.id}`)
  }

  console.log('\n--- Add these to server/.env ---\n')
  envLines.forEach((line) => console.log(line))
  console.log('\n--- End ---')
}

main().catch((err) => {
  console.error(err.message || err)
  process.exit(1)
})
