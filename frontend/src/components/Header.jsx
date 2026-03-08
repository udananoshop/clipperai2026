import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Bell, 
  Moon, 
  Sun, 
  CreditCard, 
  Zap,
  Settings,
  User,
  ChevronDown
} from 'lucide-react';

const Header = ({ 
  creditProfile, 
  onThemeToggle, 
  isDarkMode = true,
  user 
}) => {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  
  const notifications = [
    { id: 1, title: 'Video processed', message: 'Your clip is ready!', time: '2m ago', unread: true },
    { id: 2, title: 'Credit low', message: '5 credits remaining', time: '1h ago', unread: true },
    { id: 3, title: 'Job completed', message: 'Export finished', time: '3h ago', unread: false },
  ];
  
  const unreadCount = notifications.filter(n => n.unread).length;
  const creditUsage = creditProfile ? 
    Math.round(((creditProfile.credits_used || 0) / ((creditProfile.credits || 1) + (creditProfile.credits_used || 0))) * 100) 
    : 0;
  const isLowCredits = creditUsage > 80;

  return (
    <header className="sticky top-0 z-30 backdrop-blur-xl bg-[#0b0f1a]/80 border-b border-gray-800">
      <div className="flex items-center justify-between px-6 py-4">
        <div className="flex-1" />
        
        <div className="flex items-center gap-4">
          {/* Credit Meter */}
          <div className="hidden md:flex items-center gap-3 px-4 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <CreditCard className={`w-4 h-4 ${isLowCredits ? 'text-red-400' : 'text-purple-400'}`} />
            <div className="flex items-center gap-2">
              <div className="w-24 h-2 bg-gray-700 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: `${creditUsage}%` }}
                  className={`h-full ${isLowCredits ? 'bg-gradient-to-r from-red-500 to-orange-500' : 'bg-gradient-to-r from-purple-500 to-pink-500'}`}
                />
              </div>
              <span className={`text-xs font-medium ${isLowCredits ? 'text-red-400' : 'text-gray-400'}`}>
                {creditProfile?.credits ?? 0}
              </span>
            </div>
            {isLowCredits && (
              <motion.span 
                initial={{ opacity: 0, scale: 0 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-xs text-red-400 flex items-center gap-1"
              >
                <Zap className="w-3 h-3" /> Low
              </motion.span>
            )}
          </div>

          {/* Theme Toggle */}
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={onThemeToggle}
            className="p-2.5 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-purple-500/30 transition-colors"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5 text-yellow-400" />
            ) : (
              <Moon className="w-5 h-5 text-gray-400" />
            )}
          </motion.button>

          {/* Notifications */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setShowNotifications(!showNotifications)}
              className="relative p-2.5 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-purple-500/30 transition-colors"
            >
              <Bell className="w-5 h-5 text-gray-400" />
              {unreadCount > 0 && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center text-white font-medium"
                >
                  {unreadCount}
                </motion.span>
              )}
            </motion.button>

            <AnimatePresence>
              {showNotifications && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-80 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-800">
                    <h3 className="font-semibold text-white">Notifications</h3>
                  </div>
                  <div className="max-h-80 overflow-y-auto">
                    {notifications.map((notif) => (
                      <div 
                        key={notif.id}
                        className={`p-4 border-b border-gray-800/50 hover:bg-gray-800/50 cursor-pointer transition-colors ${notif.unread ? 'bg-purple-500/5' : ''}`}
                      >
                        <div className="flex items-start gap-3">
                          {notif.unread && (
                            <span className="w-2 h-2 mt-2 bg-purple-500 rounded-full flex-shrink-0" />
                          )}
                          <div className={notif.unread ? '' : 'ml-5'}>
                            <p className="text-sm font-medium text-white">{notif.title}</p>
                            <p className="text-xs text-gray-400 mt-0.5">{notif.message}</p>
                            <p className="text-xs text-gray-500 mt-1">{notif.time}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="p-3 text-center">
                    <button className="text-sm text-purple-400 hover:text-purple-300 transition-colors">
                      View all notifications
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* User Menu */}
          <div className="relative">
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-3 px-3 py-2 bg-gray-800/50 rounded-xl border border-gray-700/50 hover:border-purple-500/30 transition-colors"
            >
              <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <User className="w-4 h-4 text-white" />
              </div>
              <span className="hidden md:block text-sm font-medium text-white">
                {user?.username || 'User'}
              </span>
              <ChevronDown className="w-4 h-4 text-gray-400" />
            </motion.button>

            <AnimatePresence>
              {showUserMenu && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  className="absolute right-0 mt-3 w-56 bg-gray-900/95 backdrop-blur-xl rounded-2xl border border-gray-700/50 shadow-2xl overflow-hidden"
                >
                  <div className="p-4 border-b border-gray-800">
                    <p className="font-medium text-white">{user?.username || 'User'}</p>
                    <p className="text-xs text-gray-400 mt-0.5 capitalize">{creditProfile?.plan_name || 'Free'} Plan</p>
                  </div>
                  <div className="p-2">
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800/50 rounded-xl transition-colors">
                      <User className="w-4 h-4" />
                      <span className="text-sm">Profile</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800/50 rounded-xl transition-colors">
                      <Settings className="w-4 h-4" />
                      <span className="text-sm">Settings</span>
                    </button>
                    <button className="w-full flex items-center gap-3 px-3 py-2.5 text-gray-300 hover:bg-gray-800/50 rounded-xl transition-colors">
                      <CreditCard className="w-4 h-4" />
                      <span className="text-sm">Upgrade Plan</span>
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
