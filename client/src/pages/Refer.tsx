import { useCallback, useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { Check, Copy, Gift, Loader2, Users } from 'lucide-react'
import toast from 'react-hot-toast'
import Seo from '../components/Seo'
import { fetchReferralStats, type ReferralStatsResponse } from '../lib/api'
import { isLoggedIn } from '../lib/auth'
import { REFERRAL_BONUS_COPY } from '../lib/referralConstants'

export default function Refer() {
  const [stats, setStats] = useState<ReferralStatsResponse | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = useCallback(async () => {
    if (!isLoggedIn()) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const data = await fetchReferralStats()
      setStats(data)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Could not load referral info.')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    load()
  }, [load])

  async function copyLink() {
    if (!stats?.referralLink) return
    try {
      await navigator.clipboard.writeText(stats.referralLink)
      setCopied(true)
      toast.success('Referral link copied')
      setTimeout(() => setCopied(false), 2500)
    } catch {
      toast.error('Could not copy link')
    }
  }

  return (
    <div className="min-h-screen py-12 sm:py-20 bg-gray-50 dark:bg-gray-900 px-4">
      <Seo
        title="Refer and earn bonus uploads"
        description="Share VideoText with creators. You and your friend each get 3 bonus uploads when they sign up."
        canonicalPath="/refer"
      />
      <div className="max-w-xl mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-400 mb-5">
            <Gift className="w-8 h-8" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-medium text-gray-900 dark:text-white">Refer and earn</h1>
          <p className="mt-3 text-gray-600 dark:text-gray-300 text-sm sm:text-base">
            Share your link with creator friends. When they sign up, you both get{' '}
            <strong>{REFERRAL_BONUS_COPY}</strong> added to your account.
          </p>
        </div>

        {!isLoggedIn() && (
          <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-8 text-center shadow-sm">
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-4">Log in to get your personal referral link.</p>
            <Link
              to="/login?returnTo=/refer"
              className="inline-flex rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-6 py-3 text-sm font-semibold transition-colors"
            >
              Log in →
            </Link>
          </div>
        )}

        {isLoggedIn() && loading && (
          <div className="flex justify-center py-16 text-gray-500">
            <Loader2 className="w-6 h-6 animate-spin" />
          </div>
        )}

        {isLoggedIn() && error && (
          <div className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-950/20 p-4 text-sm text-red-700 dark:text-red-300">
            {error}
          </div>
        )}

        {isLoggedIn() && stats && !loading && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-6 shadow-sm space-y-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 dark:text-gray-500">Your link</p>
                <p className="mt-2 text-sm text-gray-800 dark:text-gray-100 break-all font-mono bg-gray-50 dark:bg-gray-900/60 rounded-lg px-3 py-2 border border-gray-100 dark:border-gray-700">
                  {stats.referralLink}
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-2.5">
                <button
                  type="button"
                  onClick={copyLink}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-4 py-3 text-sm font-semibold transition-colors"
                >
                  {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                  {copied ? 'Link copied' : 'Copy referral link'}
                </button>
              </div>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Code: <span className="font-mono font-semibold text-gray-700 dark:text-gray-200">{stats.referralCode}</span>
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">
                  <Users className="w-3.5 h-3.5" />
                  Signups
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{stats.referralSignupCount}</p>
              </div>
              <div className="rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800/60 p-4">
                <div className="flex items-center gap-2 text-gray-500 dark:text-gray-400 text-xs font-medium uppercase tracking-wide">
                  <Gift className="w-3.5 h-3.5" />
                  Bonus uploads
                </div>
                <p className="mt-2 text-2xl font-semibold text-gray-900 dark:text-white">{stats.bonusImportCredits}</p>
                <p className="text-[11px] text-gray-400 mt-1">Used after daily free limit</p>
              </div>
            </div>

            <div className="rounded-xl border border-blue-100 dark:border-blue-900/40 bg-blue-50/60 dark:bg-blue-950/20 p-4 text-sm text-blue-900 dark:text-blue-200">
              <p className="font-medium">How it works</p>
              <ol className="mt-2 list-decimal list-inside space-y-1 text-blue-800/90 dark:text-blue-300/90 text-xs sm:text-sm">
                <li>Share your link with a creator friend.</li>
                <li>They sign up with your code (auto-applied from the link).</li>
                <li>You both receive {stats.bonusPerSignup} bonus uploads instantly.</li>
              </ol>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
