import PlanBadge from '../PlanBadge';

interface ToolSidebarProps {
  /** When status changes (e.g. after job complete), usage is refetched. */
  refreshTrigger?: string | number;
  /** When true, show "What you get" block (e.g. when idle). */
  showWhatYouGet?: boolean;
  /** Page-specific "What you get" content. Each tool page passes its own description. */
  whatYouGetContent?: React.ReactNode;
  /** Optional extra content that appears after plan (e.g. branch tabs). */
  extra?: React.ReactNode;
}

/** Tool sidebar: plan badge and optional content. Minutes/reset are shown only in the menu bar and manage subscription. */
export function ToolSidebar({ refreshTrigger: _refreshTrigger, showWhatYouGet = true, whatYouGetContent, extra }: ToolSidebarProps) {
  return (
    <div className="space-y-6">
      <PlanBadge />
      {extra}
      {showWhatYouGet && whatYouGetContent != null && (
        <div className="bg-white dark:bg-gray-900 rounded-xl sm:rounded-2xl p-4 sm:p-6 border border-gray-200 dark:border-gray-800 shadow-sm min-w-0">
          <h4 className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2 sm:mb-3">
            What you get
          </h4>
          <div className="text-xs sm:text-sm text-gray-700 dark:text-gray-300">
            {whatYouGetContent}
          </div>
        </div>
      )}
    </div>
  );
}
