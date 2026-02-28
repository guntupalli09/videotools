import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Hero } from '../components/figma/Hero';
import { Features } from '../components/figma/Features';
import { HowItWorks } from '../components/figma/HowItWorks';
import { Footer } from '../components/figma/Footer';

export default function Home() {
  return (
    <div className="min-h-screen">
      <Hero />
      <Features />
      <HowItWorks />

      {/* Pricing strip — kept from original landing for conversion */}
      <section id="pricing" className="bg-gradient-to-br from-primary to-purple-700 dark:from-violet-800 dark:to-purple-900 py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5 }}
            className="text-center mb-12"
          >
            <h2 className="font-display text-3xl md:text-4xl font-bold text-white tracking-tight mb-2">
              Start free. Upgrade when you need more.
            </h2>
            <p className="text-lg text-white/90">
              Sign up to try free
            </p>
          </motion.div>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto"
          >
            {[
              { name: 'Free', price: '$0', min: '3 free imports', cta: null },
              { name: 'Basic', price: '$19', min: '450 min', cta: 'Choose' },
              { name: 'Pro', price: '$49', min: '1,200 min', cta: 'Choose', popular: true },
              { name: 'Agency', price: '$129', min: '3,000 min', cta: 'Choose' },
            ].map((plan) => (
              <Link
                key={plan.name}
                to="/pricing"
                className={`rounded-xl p-6 text-left transition-motion ${
                  plan.popular
                    ? 'bg-white text-violet-900 shadow-card-elevated ring-2 ring-white/50'
                    : 'bg-white/10 text-white hover:bg-white/20 backdrop-blur-sm'
                }`}
              >
                {plan.popular && (
                  <span className="text-xs font-semibold text-violet-600 uppercase tracking-wide">Most popular</span>
                )}
                <p className="font-semibold text-lg mt-0.5">{plan.name}</p>
                <p className="text-2xl font-bold mt-1">{plan.price}<span className="text-sm font-normal opacity-80">/mo</span></p>
                <p className="text-sm opacity-90 mt-1">{plan.name === 'Free' ? plan.min : `${plan.min} / month`}</p>
                {plan.cta && (
                  <span className={`inline-block mt-4 text-sm font-medium ${plan.popular ? 'text-violet-600' : 'text-white'}`}>
                    {plan.cta} →
                  </span>
                )}
              </Link>
            ))}
          </motion.div>
          <p className="text-center mt-6">
            <Link
              to="/pricing"
              className="text-white/90 hover:text-white font-medium underline underline-offset-2"
            >
              Full pricing & features →
            </Link>
          </p>
        </div>
      </section>

      <Footer />
    </div>
  );
}
