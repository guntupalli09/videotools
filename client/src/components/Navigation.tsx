import { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import UserMenu from "./UserMenu";
import MobileSiteNav from "./MobileSiteNav";
import { prefetchRoute } from "../lib/prefetch";
import { isLoggedIn } from "../lib/auth";
import { useFounderStatus } from "../hooks/useFounderStatus";
import { trackEvent } from "../lib/analytics";
import { CORE_AI_TOOLS, FREE_TOOLS_NAV } from "../config/siteNavLinks";
import { getBlogOutboundUrl } from "../lib/blogOutbound";

const AI_TOOLS = CORE_AI_TOOLS;
const FREE_TOOLS = FREE_TOOLS_NAV;

export default function Navigation() {
  const { isFounder, loading } = useFounderStatus();
  const location = useLocation();
  if (location.pathname.startsWith('/embed/')) return null;
  const toolMode = location.pathname !== "/";
  const toolLabel =
    location.pathname === "/guideline-format"
      ? "Format tool"
      : location.pathname === "/video-to-transcript"
        ? "Video to Transcript"
        : location.pathname
            .split("/")
            .filter(Boolean)
            .map((part) => part.replace(/-/g, " "))
            .join(" / ");
  const [toolsOpen, setToolsOpen] = useState(false);
  const [showAuthLinks, setShowAuthLinks] = useState(() => !isLoggedIn());

  useEffect(() => {
    setShowAuthLinks(!isLoggedIn());
  }, []);

  useEffect(() => {
    const sync = () => setShowAuthLinks(!isLoggedIn());
    window.addEventListener("videotext:plan-updated", sync);
    window.addEventListener("videotext:logout", sync);
    return () => {
      window.removeEventListener("videotext:plan-updated", sync);
      window.removeEventListener("videotext:logout", sync);
    };
  }, []);

  return (
    <nav className="sticky top-0 z-[60] bg-gray-950 border-b border-white/[0.08] shadow-[0_1px_0_rgba(255,255,255,0.03)]">
      <div className="w-full px-4 sm:px-6 lg:px-8">
        <div
          className={`flex items-center justify-between w-full ${toolMode ? "h-11" : "h-14"}`}
        >
          {/* Logo (+ tool name on mobile tool pages) */}
          <Link
            to="/"
            className="flex min-w-0 max-w-[58%] items-center gap-2 shrink md:max-w-none"
            onMouseEnter={() => prefetchRoute("/")}
          >
            <img
              src="/logo.svg"
              alt="VideoText"
              width={28}
              height={28}
              className="h-6 w-6 shrink-0 md:h-7 md:w-7"
            />
            {!toolMode ? (
              <span className="text-[17px] font-display font-semibold text-white">
                VideoText
              </span>
            ) : (
              <span className="truncate text-sm font-medium text-white/80 md:hidden">
                {toolLabel || "Tool"}
              </span>
            )}
          </Link>

          {toolMode && (
            <div className="absolute left-1/2 -translate-x-1/2 hidden md:flex items-center gap-1.5 text-[13px] text-white/45">
              <span className="text-white/75">{toolLabel || "Tool"}</span>
              <span>/</span>
              <span>Current step</span>
            </div>
          )}

          {/* Desktop nav */}
          <div className="hidden md:flex items-center gap-6 shrink-0">
            {!toolMode && (
              <>
                {/* Tools dropdown — covers AI + Free */}
                <div
                  className="relative"
                  onMouseEnter={() => setToolsOpen(true)}
                  onMouseLeave={() => setToolsOpen(false)}
                >
                  <button className="flex items-center gap-1 text-sm font-medium text-white/70 hover:text-white transition-colors">
                    Tools
                    <svg
                      className="w-3.5 h-3.5 mt-px"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>

                  <AnimatePresence>
                    {toolsOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full right-0 mt-2 w-[480px] bg-gray-900 border border-white/[0.08] rounded-lg shadow-2xl py-4 grid grid-cols-2 gap-0"
                      >
                        {/* AI Tools column */}
                        <div className="px-4 border-r border-white/[0.06]">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400 mb-2 px-1">
                            Core AI tools
                          </p>
                          {AI_TOOLS.map((t) => (
                            <Link
                              key={t.path}
                              to={t.path}
                              className="block px-2 py-1.5 text-sm text-white/65 hover:text-white hover:bg-white/[0.05] rounded-lg transition-colors"
                              onMouseEnter={() => prefetchRoute(t.path)}
                              onClick={() => {
                                try {
                                  trackEvent("tool_nav_clicked", {
                                    tool: t.name,
                                    path: t.path,
                                    category: "ai",
                                  });
                                } catch {
                                  /* non-blocking */
                                }
                              }}
                            >
                              {t.name}
                            </Link>
                          ))}
                        </div>

                        {/* Free Tools column */}
                        <div className="px-4">
                          <p className="text-[10px] font-bold uppercase tracking-widest text-blue-400/80 mb-2 px-1">
                            Free Tools
                          </p>
                          {FREE_TOOLS.map((t) => (
                            <Link
                              key={t.path}
                              to={t.path}
                              className={`block px-2 py-1.5 text-sm rounded-lg transition-colors ${
                                t.path === "/tools"
                                  ? "text-blue-400 hover:text-blue-300 font-semibold mt-1 border-t border-white/[0.06] pt-2"
                                  : "text-white/65 hover:text-white hover:bg-white/[0.05]"
                              }`}
                              onMouseEnter={() => prefetchRoute(t.path)}
                              onClick={() => {
                                try {
                                  trackEvent("tool_nav_clicked", {
                                    tool: t.name,
                                    path: t.path,
                                    category: "free",
                                  });
                                } catch {
                                  /* non-blocking */
                                }
                              }}
                            >
                              {t.name}
                            </Link>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <Link
                  to="/pricing"
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                  onMouseEnter={() => prefetchRoute("/pricing")}
                >
                  Pricing
                </Link>

                <a
                  href={getBlogOutboundUrl("/blog")}
                  className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                >
                  Blog
                </a>

                {!loading && isFounder && (
                  <Link
                    to="/founder"
                    className="text-sm font-medium text-white/70 hover:text-white transition-colors"
                    onMouseEnter={() => prefetchRoute("/founder")}
                  >
                    Founder
                  </Link>
                )}
              </>
            )}

            {/* Auth buttons */}
            {showAuthLinks ? (
              <div className="flex items-center gap-3 ml-2">
                <Link
                  to="/signup"
                  className="text-sm font-bold text-white bg-blue-600 hover:bg-blue-600 rounded-lg px-4 py-1.5 transition-colors flex items-center gap-1"
                  onMouseEnter={() => prefetchRoute("/signup")}
                  onClick={() => {
                    try {
                      trackEvent("nav_cta_clicked", {
                        label: "Start free",
                        destination: "/signup",
                      });
                    } catch {
                      /* non-blocking */
                    }
                  }}
                >
                  Start free <span aria-hidden>→</span>
                </Link>
              </div>
            ) : (
              <UserMenu />
            )}
          </div>

          {/* Mobile: site nav (hamburger) + account, separate from billing drawer */}
          <div className="flex shrink-0 items-center gap-0.5 md:hidden">
            {showAuthLinks && (
              <Link
                to="/signup"
                className="mr-1 rounded-lg bg-blue-600 px-2.5 py-1.5 text-xs font-bold text-white transition-colors hover:bg-blue-700"
                onClick={() => {
                  try {
                    trackEvent("nav_cta_clicked", {
                      label: "Start free",
                      destination: "/signup",
                      mobile: true,
                    });
                  } catch {
                    /* non-blocking */
                  }
                }}
              >
                Start free →
              </Link>
            )}
            <MobileSiteNav />
            <UserMenu />
          </div>
        </div>
      </div>
    </nav>
  );
}
