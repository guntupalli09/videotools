import { motion, AnimatePresence } from 'motion/react';
import { X, Clock, CreditCard, Mail, Gift, Moon, Sun } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

interface MenuProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Menu({ isOpen, onClose }: MenuProps) {
  const { theme, toggleTheme } = useTheme();

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
            onClick={onClose}
          />

          {/* Menu Panel */}
          <motion.div
            initial={{ x: '100%' }}
            animate={{ x: 0 }}
            exit={{ x: '100%' }}
            transition={{ type: 'spring', damping: 30, stiffness: 300 }}
            className="fixed top-0 right-0 bottom-0 w-full max-w-sm bg-white dark:bg-gray-900 shadow-2xl z-50 overflow-y-auto"
          >
            {/* Header */}
            <div className="sticky top-0 bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800 px-6 py-4 flex items-center justify-between z-10">
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">Menu</h2>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5 text-gray-600 dark:text-gray-400" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Account Section */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Account
                </p>
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                  <p className="text-sm text-gray-900 dark:text-white font-medium mb-1">
                    santhosh.guntupalli09@outlook.com
                  </p>
                  <p className="text-xs text-purple-600 dark:text-purple-400 font-medium">
                    Pro Plan
                  </p>
                </div>
              </div>

              {/* Minutes Left */}
              <motion.div
                whileHover={{ scale: 1.02 }}
                className="bg-gradient-to-br from-purple-50 to-blue-50 dark:from-purple-900/20 dark:to-blue-900/20 rounded-xl p-5 border border-purple-200 dark:border-purple-800"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 bg-purple-100 dark:bg-purple-900/50 rounded-lg">
                    <Clock className="w-5 h-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="flex-1">
                    <p className="text-xs text-purple-700 dark:text-purple-300 font-medium mb-1">
                      Minutes left
                    </p>
                    <p className="text-3xl font-bold text-purple-900 dark:text-purple-100 mb-1">
                      463
                    </p>
                    <p className="text-xs text-purple-600 dark:text-purple-400">
                      min remaining
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      pro plan · Resets 28/2/2026
                    </p>
                  </div>
                </div>
              </motion.div>

              {/* Menu Items */}
              <div className="space-y-1">
                <MenuItem
                  icon={CreditCard}
                  label="Manage subscription"
                  onClick={() => console.log('Manage subscription')}
                />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Actions */}
              <div className="space-y-1">
                <button
                  onClick={() => console.log('Log out')}
                  className="w-full text-left px-4 py-3 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                >
                  Log out
                </button>
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Support & Referral */}
              <div className="space-y-1">
                <MenuItem
                  icon={Mail}
                  label="Email support"
                  onClick={() => console.log('Email support')}
                />
                
                <MenuItem
                  icon={Gift}
                  label="Refer and earn: 45 min free"
                  sublabel="(Free, Basic, Pro)"
                  onClick={() => console.log('Refer and earn')}
                  highlight
                />
              </div>

              {/* Divider */}
              <div className="border-t border-gray-200 dark:border-gray-700" />

              {/* Theme Toggle */}
              <div>
                <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-3">
                  Theme
                </p>
                <button
                  onClick={toggleTheme}
                  className="w-full flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-all duration-200 group"
                >
                  <span className="text-sm text-gray-700 dark:text-gray-300 font-medium">
                    {theme === 'dark' ? 'Dark mode' : 'Light mode'}
                  </span>
                  <div className="flex items-center gap-2">
                    {theme === 'dark' ? (
                      <Moon className="w-4 h-4 text-purple-500" />
                    ) : (
                      <Sun className="w-4 h-4 text-amber-500" />
                    )}
                    <span className="text-xs text-gray-500 dark:text-gray-400 capitalize">
                      {theme}
                    </span>
                  </div>
                </button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

interface MenuItemProps {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  sublabel?: string;
  onClick: () => void;
  highlight?: boolean;
}

function MenuItem({ icon: Icon, label, sublabel, onClick, highlight }: MenuItemProps) {
  return (
    <motion.button
      whileHover={{ x: 4 }}
      onClick={onClick}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 ${
        highlight
          ? 'bg-purple-50 dark:bg-purple-900/20 hover:bg-purple-100 dark:hover:bg-purple-900/30'
          : 'hover:bg-gray-100 dark:hover:bg-gray-800'
      }`}
    >
      <Icon className={`w-5 h-5 ${
        highlight ? 'text-purple-600 dark:text-purple-400' : 'text-gray-600 dark:text-gray-400'
      }`} />
      <div className="flex-1 text-left">
        <p className={`text-sm font-medium ${
          highlight ? 'text-purple-900 dark:text-purple-100' : 'text-gray-900 dark:text-white'
        }`}>
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            {sublabel}
          </p>
        )}
      </div>
    </motion.button>
  );
}
