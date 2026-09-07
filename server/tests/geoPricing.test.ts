import test from 'node:test'
import assert from 'node:assert/strict'

process.env.STRIPE_SECRET_KEY = process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder'
process.env.STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET || 'whsec_placeholder'
process.env.STRIPE_PRO_MONTHLY_PRICE_ID = 'price_pro_monthly_799'
process.env.STRIPE_PRO_ANNUAL_PRICE_ID = 'price_pro_annual_6999'

test('resolvePricingTier maps target countries when enabled', async () => {
  process.env.PPP_PRICING_ENABLED = 'true'
  const { resolvePricingTier } = await import('../src/utils/geoPricing')

  assert.equal(resolvePricingTier('IN'), 'ppp')
  assert.equal(resolvePricingTier('PH'), 'ppp')
  assert.equal(resolvePricingTier('GB'), 'gbp')
  assert.equal(resolvePricingTier('DE'), 'eur')
  assert.equal(resolvePricingTier('US'), 'standard')
  assert.equal(resolvePricingTier(null), 'standard')

  process.env.PPP_PRICING_ENABLED = 'false'
  assert.equal(resolvePricingTier('IN', false), 'standard')
})

test('buildProPriceDisplay formats PPP tier', async () => {
  const { buildProPriceDisplay } = await import('../src/utils/geoPricing')
  const display = buildProPriceDisplay('IN', 'ppp', true)

  assert.equal(display.monthly.amount, 3.99)
  assert.equal(display.monthly.label, '$3.99/mo')
  assert.equal(display.annual.amount, 34.99)
  assert.equal(display.tier, 'ppp')
})

test('resolveEffectivePricingTier falls back when regional Stripe IDs missing', async () => {
  process.env.PPP_PRICING_ENABLED = 'true'
  delete process.env.STRIPE_PRO_PPP_MONTHLY_PRICE_ID
  delete process.env.STRIPE_PRO_PPP_ANNUAL_PRICE_ID

  const { resolveEffectivePricingTier } = await import('../src/services/stripePricingTiers')
  assert.equal(resolveEffectivePricingTier('ppp'), 'standard')
  assert.equal(resolveEffectivePricingTier('standard'), 'standard')
})

test('selectProPriceIdForTier uses PPP env when configured', async () => {
  process.env.PPP_PRICING_ENABLED = 'true'
  process.env.STRIPE_PRO_PPP_MONTHLY_PRICE_ID = 'price_ppp_monthly_399'
  process.env.STRIPE_PRO_PPP_ANNUAL_PRICE_ID = 'price_ppp_annual_3499'

  const { selectProPriceIdForTier } = await import('../src/services/stripePricingTiers')
  assert.equal(selectProPriceIdForTier('ppp', 'monthly'), 'price_ppp_monthly_399')
  assert.equal(selectProPriceIdForTier('ppp', 'annual'), 'price_ppp_annual_3499')
  assert.equal(selectProPriceIdForTier('standard', 'monthly'), 'price_pro_monthly_799')

  delete process.env.STRIPE_PRO_PPP_MONTHLY_PRICE_ID
  delete process.env.STRIPE_PRO_PPP_ANNUAL_PRICE_ID
})

test('getPlanFromPriceId recognizes regional Pro price IDs', async () => {
  process.env.PPP_PRICING_ENABLED = 'true'
  process.env.STRIPE_PRO_PPP_MONTHLY_PRICE_ID = 'price_ppp_monthly_399'
  process.env.STRIPE_PRO_PPP_ANNUAL_PRICE_ID = 'price_ppp_annual_3499'

  const { getPlanFromPriceId } = await import('../src/services/stripe')
  assert.equal(getPlanFromPriceId('price_ppp_monthly_399'), 'pro')
  assert.equal(getPlanFromPriceId('price_ppp_annual_3499'), 'pro')

  delete process.env.STRIPE_PRO_PPP_MONTHLY_PRICE_ID
  delete process.env.STRIPE_PRO_PPP_ANNUAL_PRICE_ID
})
