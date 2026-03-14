import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { isLoggedIn } from '../lib/auth';
import { Hero } from '../components/figma/Hero';
import { Features } from '../components/figma/Features';
import { HowItWorks } from '../components/figma/HowItWorks';
import { Testimonials } from '../components/landing/Testimonials';
import { UseCases } from '../components/landing/UseCases';
import { FAQ } from '../components/landing/FAQ';
import { FinalCTA } from '../components/landing/FinalCTA';
import { CompetitorSection } from '../components/landing/CompetitorSection';

// Page flow (Descript-inspired conversion order):
// 1. Hero — hook + product demo
// 2. Features — what you get (tools showcase)
// 3. Use Cases — ICP targeting (YouTubers / Podcasters / Agencies)
// 4. How It Works — de-risk the signup (simple 3 steps)
// 5. Testimonials — social proof at the decision point
// 6. Pricing — friction-free plans
// 7. FAQ — objection handling
// 8. Final CTA — dark, bold closing section
// Footer rendered globally by App.tsx

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* 1 — Hero */}
      <Hero />

      {/* 2 — Features / toolkit */}
      <Features />

      {/* 3 — Use cases / ICP targeting */}
      <UseCases />

      {/* 4 — How it works */}
      <HowItWorks />

      {/* 5 — Testimonials */}
      <Testimonials />

      {/* 5.5 — Competitor comparison / speed piggybacking */}
      <CompetitorSection />

      {/* 6 — Pricing */}
      <section id="pricing" className="bg-gradient-to-br from-purple-700 via-violet-700 to-indigo-800 dark:from-violet-900 dark:via-purple-900 dark:to-indigo-950 py-20 transition-colors duration-500">
        <div className="max-w-5xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <p className="text-sm font-semibold text-white/60 uppercase tracking-widest mb-3">Pricing</p>
            <h2 className="text-3xl md:text-4xl font-bold text-white mb-3">
              Start free. Scale when you're ready.
            </h2>
            {!isLoggedIn() && (
              <p className="text-white/70 text-[15px]">No credit card required to try.</p>
            )}
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: 0.1 }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            {[
              { name: 'Free', price: '$0', detail: '3 free imports', cta: null, note: 'No card needed' },
              { name: 'Basic', price: '$19', detail: '450 min / mo', cta: 'Choose', note: null },
              { name: 'Pro', price: '$49', detail: '1,200 min / mo', cta: 'Choose', popular: true, note: 'Best value' },
              { name: 'Agency', price: '$129', detail: '3,000 min / mo', cta: 'Choose', note: null },
            ].map((plan) => (
              <Link
                key={plan.name}
                to="/pricing"
                className={`group rounded-2xl p-5 text-left transition-all duration-200 ${
                  plan.popular
                    ? 'bg-white text-violet-900 shadow-2xl shadow-white/10 ring-2 ring-white/40 hover:ring-white/60'
                    : 'bg-white/10 text-white hover:bg-white/[0.18] backdrop-blur-sm border border-white/10'
                }`}
              >
                {plan.popular && (
                  <span className="text-[10px] font-bold text-violet-500 uppercase tracking-widest block mb-1">{plan.note}</span>
                )}
                <p className="font-bold text-lg">{plan.name}</p>
                <p className="text-2xl font-extrabold mt-1">
                  {plan.price}
                  <span className="text-sm font-normal opacity-60">/mo</span>
                </p>
                <p className="text-[13px] opacity-80 mt-1">{plan.detail}</p>
                {plan.cta && (
                  <span className={`inline-flex items-center gap-1 mt-4 text-sm font-semibold group-hover:gap-2 transition-all ${plan.popular ? 'text-violet-600' : 'text-white/80'}`}>
                    {plan.cta} <span className="text-base">→</span>
                  </span>
                )}
                {!plan.cta && plan.note && !plan.popular && (
                  <p className="text-[11px] mt-3 opacity-50">{plan.note}</p>
                )}
              </Link>
            ))}
          </motion.div>

          <p className="text-center mt-8">
            <Link
              to="/pricing"
              className="text-white/75 hover:text-white font-medium underline underline-offset-2 text-sm transition-colors"
            >
              See full pricing & feature comparison →
            </Link>
          </p>
        </div>
      </section>

      {/* 7 — FAQ */}
      <FAQ />

      {/* 8 — Final CTA */}
      <FinalCTA />
    </div>
  );
}
