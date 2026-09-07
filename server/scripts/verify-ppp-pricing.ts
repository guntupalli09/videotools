#!/usr/bin/env npx tsx
/**
 * Verify PPP / geo pricing env + Stripe Price objects.
 *
 * Usage (from repo root):
 *   cd server && npx tsx scripts/verify-ppp-pricing.ts
 *
 * Loads server/.env.development or server/.env.production (same as the API).
 * Set PPP_PRICING_DEBUG=true to test tiers locally via simulated country headers
 * on GET /api/billing/prices after the API is running.
 */
import '../src/env'
import { getRegionalStripePriceConfig } from '../src/services/stripePricingTiers'
import { PPP_PRICING_ENABLED, resolvePricingTier, buildProPriceDisplay } from '../src/utils/geoPricing'

async function main() {
  const { stripe, verifyProPrice } = await import('../src/services/stripe')
  console.log('=== PPP pricing verification ===\n')

  console.log('PPP_PRICING_ENABLED:', PPP_PRICING_ENABLED)
  if (!PPP_PRICING_ENABLED) {
    console.warn('⚠️  PPP_PRICING_ENABLED is not true — geo tiers will not apply at checkout.')
  }

  let config
  try {
    config = getRegionalStripePriceConfig()
  } catch (e) {
    console.error('❌ Stripe config error:', (e as Error).message)
    console.error('\nEnsure STRIPE_PRO_MONTHLY_PRICE_ID and STRIPE_PRO_ANNUAL_PRICE_ID are set.')
    process.exit(1)
  }

  const tiers = [
    { name: 'standard', ids: config.standard, tier: 'standard' as const },
    ...(config.ppp ? [{ name: 'ppp', ids: config.ppp, tier: 'ppp' as const }] : []),
    ...(config.gbp ? [{ name: 'gbp', ids: config.gbp, tier: 'gbp' as const }] : []),
    ...(config.eur ? [{ name: 'eur', ids: config.eur, tier: 'eur' as const }] : []),
  ]

  console.log('\nConfigured tiers:')
  for (const t of tiers) {
    console.log(`  ${t.name}: monthly=${t.ids.monthlyPriceId}, annual=${t.ids.annualPriceId}`)
  }
  if (!config.ppp) console.log('  (ppp: not configured — set STRIPE_PRO_PPP_* env vars)')
  if (!config.gbp) console.log('  (gbp: not configured)')
  if (!config.eur) console.log('  (eur: not configured)')

  console.log('\nValidating Stripe Price objects…')
  let failed = false
  for (const t of tiers) {
    for (const interval of ['monthly', 'annual'] as const) {
      const priceId = interval === 'monthly' ? t.ids.monthlyPriceId : t.ids.annualPriceId
      try {
        await verifyProPrice(priceId, interval, t.tier)
        console.log(`  ✓ ${t.name} ${interval}: ${priceId}`)
      } catch (e) {
        failed = true
        console.error(`  ✗ ${t.name} ${interval}: ${priceId}`)
        console.error(`    ${(e as Error).message}`)
      }
    }
  }

  console.log('\nSample display by country (when PPP enabled):')
  for (const [country, label] of [
    ['US', 'United States'],
    ['IN', 'India → PPP'],
    ['GB', 'UK → GBP'],
    ['DE', 'Germany → EUR'],
  ] as const) {
    const requested = resolvePricingTier(country)
    const display = buildProPriceDisplay(country, requested, PPP_PRICING_ENABLED)
    console.log(`  ${label}: tier=${display.tier}, ${display.priceLabel}`)
  }

  if (process.env.STRIPE_SECRET_KEY?.startsWith('sk_live')) {
    console.log('\n⚠️  Using LIVE Stripe key — validation hit production Stripe.')
  }

  console.log('\nLive API check (optional):')
  console.log('  curl -s "$API_URL/api/billing/prices" -H "x-vercel-ip-country: IN" | jq')
  console.log('  Or with debug override: PPP_PRICING_DEBUG=true + header x-pricing-country: IN')

  if (failed) {
    console.error('\n❌ One or more Price IDs failed validation. Fix amounts/currency in Stripe or env vars.')
    process.exit(1)
  }
  console.log('\n✅ All configured Price IDs validated against Stripe.')
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
