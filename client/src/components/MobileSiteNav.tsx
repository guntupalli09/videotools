import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { prefetchRoute } from '../lib/prefetch'
import { trackEvent } from '../lib/analytics'
import { CORE_AI_TOOLS, FREE_TOOLS_NAV } from '../config/siteNavLinks'
import { getBlogOutboundUrl } from '../lib/blogOutbound'

function NavLink({
  to,
  children,
  onNavigate,
  highlight,
}: {
  to: string
  children: React.ReactNode
  onNavigate: () => void
  highlight?: boolean
}) {
  return (
    <Link
      to={to}
      onClick={onNavigate}
      onMouseEnter={() => prefetchRoute(to)}
      onFocus={() => prefetchRoute(to)}
      className={`block rounded-lg px-3 py-2.5 text-sm transition-colors ${
        highlight
          ? 'font-semibold text-blue-300 hover:bg-white/[0.06]'
          : 'text-white/70 hover:bg-white/[0.05] hover:text-white'
      }`}
    >
      {children}
    </Link>
  )
}

export default function MobileSiteNav() {
  const [open, setOpen] = useState(false)

  const close = () => setOpen(false)

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded-lg p-2 text-white/70 transition-colors hover:bg-white/[0.08] hover:text-white"
        aria-label="Open site navigation"
      >
        <Menu className="h-6 w-6" />
      </button>

      {open && (
        <>
          <button
            type="button"
            className="fixed inset-0 z-[70] bg-black/60"
            aria-label="Close site navigation"
            onClick={close}
          />
          <aside
            className="fixed top-0 right-0 bottom-0 z-[71] flex w-full max-w-sm flex-col border-l border-white/[0.08] bg-gray-950 shadow-2xl"
            aria-label="Site navigation"
          >
            <div className="flex shrink-0 items-center justify-between border-b border-white/[0.08] px-4 py-3">
              <span className="font-display text-base font-semibold text-white">Tools &amp; links</span>
              <button
                type="button"
                onClick={close}
                className="rounded-lg p-2 text-white/60 transition-colors hover:bg-white/[0.08] hover:text-white"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <p className="mb-2 px-1 text-[10px] font-bold uppercase tracking-widest text-blue-400">
                Core AI tools
              </p>
              <div className="space-y-0.5">
                {CORE_AI_TOOLS.map((t) => (
                  <NavLink
                    key={t.path}
                    to={t.path}
                    onNavigate={() => {
                      close()
                      try {
                        trackEvent('tool_nav_clicked', {
                          tool: t.name,
                          path: t.path,
                          category: 'ai',
                          mobile: true,
                        })
                      } catch {
                        /* non-blocking */
                      }
                    }}
                  >
                    {t.name}
                  </NavLink>
                ))}
              </div>

              <p className="mb-2 mt-5 px-1 text-[10px] font-bold uppercase tracking-widest text-blue-400/80">
                Free tools
              </p>
              <div className="space-y-0.5">
                {FREE_TOOLS_NAV.map((t) => (
                  <NavLink
                    key={t.path}
                    to={t.path}
                    highlight={t.path === '/tools'}
                    onNavigate={() => {
                      close()
                      try {
                        trackEvent('tool_nav_clicked', {
                          tool: t.name,
                          path: t.path,
                          category: 'free',
                          mobile: true,
                        })
                      } catch {
                        /* non-blocking */
                      }
                    }}
                  >
                    {t.name}
                  </NavLink>
                ))}
              </div>

              <div className="mt-6 space-y-2 border-t border-white/[0.08] pt-5">
                <Link
                  to="/pricing"
                  onClick={close}
                  onMouseEnter={() => prefetchRoute('/pricing')}
                  className="flex w-full items-center justify-center rounded-xl bg-blue-600 px-4 py-3 text-sm font-bold text-white transition-colors hover:bg-blue-700"
                >
                  Pricing
                </Link>
                <a
                  href={getBlogOutboundUrl('/blog')}
                  onClick={close}
                  className="flex w-full items-center justify-center rounded-xl border border-white/[0.12] bg-white/[0.04] px-4 py-3 text-sm font-semibold text-white/85 transition-colors hover:bg-white/[0.08]"
                >
                  Blog
                </a>
              </div>
            </div>
          </aside>
        </>
      )}
    </>
  )
}
