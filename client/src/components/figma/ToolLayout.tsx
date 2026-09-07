import { ChevronRight, Home } from "lucide-react";
import { Link } from "react-router-dom";
import HeroTrustChips from "../HeroTrustChips";

interface Breadcrumb {
  label: string;
  href: string;
}

interface ToolLayoutProps {
  breadcrumbs: Breadcrumb[];
  title: string;
  subtitle: string;
  icon: React.ReactNode;
  tags?: string[];
  children: React.ReactNode;
  /** When null/undefined, layout is single full-width column (e.g. for result view). */
  sidebar?: React.ReactNode | null;
  compactToolHeader?: boolean;
  currentStepLabel?: string;
  /** When set, renders the compact answer-first block under the H1. */
  coreToolPath?: string;
}

export function ToolLayout({
  breadcrumbs,
  title,
  subtitle,
  icon,
  tags = [],
  children,
  sidebar = null,
  compactToolHeader = false,
  currentStepLabel = "Ready",
  coreToolPath,
}: ToolLayoutProps) {
  return (
    <div
      className={`min-h-screen w-full max-w-full ${compactToolHeader ? "pt-component-sm" : "pt-12 sm:pt-14"} pb-section px-4 sm:px-6 lg:px-12 xl:px-16 bg-white dark:bg-gray-950 transition-colors duration-500 flex flex-col box-border`}
    >
      <div className="w-full max-w-full flex-1 min-w-0 box-border">
        {!compactToolHeader && (
          <nav
            className="mb-component-sm flex min-w-0 flex-wrap items-center gap-1.5 text-xs sm:mb-component sm:gap-2 sm:text-sm"
            aria-label="Breadcrumb"
          >
            <Link
              to="/"
              className="flex shrink-0 items-center gap-1 text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
            >
              <Home className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
              <span>Home</span>
            </Link>
            {breadcrumbs.map((crumb, index) => (
              <div
                key={crumb.href}
                className="flex max-w-full min-w-0 shrink-0 items-center gap-1.5 sm:gap-2"
              >
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-gray-400 sm:h-4 sm:w-4" />
                <Link
                  to={crumb.href}
                  className={`max-w-[140px] truncate sm:max-w-none ${
                    index === breadcrumbs.length - 1
                      ? "font-medium text-blue-600 dark:text-blue-400"
                      : "text-gray-500 transition-colors hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"
                  }`}
                >
                  {crumb.label}
                </Link>
              </div>
            ))}
          </nav>
        )}

        <div className={compactToolHeader ? "mb-component-sm" : "mb-component sm:mb-section"}>
          {compactToolHeader ? (
            <div className="flex h-10 items-center justify-between gap-component-sm border-b border-gray-200/80 dark:border-white/[0.08]">
              <div className="flex min-w-0 items-center gap-2">
                <span className="inline-flex h-4 w-4 items-center justify-center [&>svg]:h-4 [&>svg]:w-4">
                  {icon}
                </span>
                <h1 className="tool-title-compact">{title}</h1>
                <span className="tool-meta text-gray-400">·</span>
                <span className="tool-meta truncate">{currentStepLabel}</span>
              </div>
              {coreToolPath ? (
                <a
                  href="#how-this-tool-works"
                  className="tool-meta shrink-0 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  How it works
                </a>
              ) : (
                <Link
                  to={breadcrumbs[0]?.href || "#"}
                  className="tool-meta shrink-0 hover:text-blue-600 dark:hover:text-blue-400"
                >
                  How it works
                </Link>
              )}
            </div>
          ) : (
            <>
              <div className="mb-component-sm flex items-center gap-3 sm:gap-component-sm">
                <div className="relative shrink-0">
                  <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-blue-200 bg-white dark:border-blue-800 dark:bg-gray-900 sm:h-12 sm:w-12 [&>svg]:h-5 [&>svg]:w-5 sm:[&>svg]:h-6 sm:[&>svg]:w-6">
                    {icon}
                  </div>
                </div>
                <h1 className="tool-title text-2xl leading-tight sm:text-3xl md:text-4xl">{title}</h1>
              </div>
              {!coreToolPath && (
                <p className="max-w-2xl text-sm leading-relaxed text-gray-500 dark:text-gray-400 sm:text-base">
                  {subtitle}
                </p>
              )}
              <HeroTrustChips />
              {tags.length > 0 && (
                <div className="mt-component-sm flex flex-wrap gap-1.5 sm:gap-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="cursor-default rounded-lg bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-700 transition-colors hover:bg-blue-100 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-blue-900/30 sm:px-3 sm:py-1 sm:text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </>
          )}
        </div>

        <div
          className={`grid w-full max-w-full gap-component-sm sm:gap-component ${sidebar ? "grid-cols-1 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1.3fr)]" : "grid-cols-1"}`}
        >
          <div className="min-w-0 w-full">{children}</div>
          {sidebar != null && <div className="min-w-0 w-full">{sidebar}</div>}
        </div>
      </div>
    </div>
  );
}
