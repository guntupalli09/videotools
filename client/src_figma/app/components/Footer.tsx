export function Footer() {
  return (
    <footer className="relative py-12 px-6 bg-gray-50 dark:bg-gray-950 border-t border-gray-200 dark:border-white/5 transition-colors duration-500">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-2">
            <img src="/logo.svg" alt="" className="w-5 h-5" />
            <span className="font-semibold text-gray-900 dark:text-white">VideoText</span>
          </div>

          {/* Links */}
          <div className="flex flex-wrap items-center justify-center gap-6 text-sm text-gray-600 dark:text-gray-400">
            <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Privacy</a>
            <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Terms</a>
            <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">Support</a>
            <a href="#" className="hover:text-gray-900 dark:hover:text-white transition-colors">API</a>
          </div>

          {/* Copyright */}
          <div className="text-sm text-gray-500 dark:text-gray-500">
            © 2026 VideoText. All rights reserved.
          </div>
        </div>
      </div>
    </footer>
  );
}