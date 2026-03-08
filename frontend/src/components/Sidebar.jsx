import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  Upload,
  Search,
  TrendingUp,
  Target,
  Zap,
  UploadCloud,
  Settings,
  LogOut,
  Globe,
  Users,
  CreditCard,
  BarChart3,
  X,
  MessageCircle,
  FolderOpen,
  Download,
  Play,
  Instagram,
  Facebook,
  Youtube
} from 'lucide-react';

const Sidebar = ({ onLogout, language = 'en', setLanguage, isOpen = true, toggleSidebar }) => {
  const location = useLocation();

// Main menu items
const menuItems = [
    { path: '/dashboard', icon: Home, label: language === 'en' ? 'Dashboard' : 'Dasbor' },
    { path: '/upload', icon: Upload, label: language === 'en' ? 'Upload' : 'Unggah' },
    { path: '/research', icon: Search, label: language === 'en' ? 'Research' : 'Riset' },
    { path: '/trending', icon: TrendingUp, label: language === 'en' ? 'Trending' : 'Trending' },
    { path: '/prediction', icon: Target, label: language === 'en' ? 'Prediction' : 'Prediksi' },
    { path: '/viral-hunter', icon: Zap, label: language === 'en' ? 'Viral Hunter' : 'Viral Hunter' },
    { path: '/upload-center', icon: UploadCloud, label: language === 'en' ? 'Upload Center' : 'Pusat Unggah' },
    { path: '/analytics', icon: BarChart3, label: language === 'en' ? 'Analytics' : 'Analitik' },
    { path: '/team', icon: Users, label: language === 'en' ? 'Team' : 'Tim' },
    { path: '/chat', icon: MessageCircle, label: language === 'en' ? 'Chat' : 'Obrolan' },
    { path: '/billing', icon: CreditCard, label: language === 'en' ? 'Billing' : 'Tagihan' },
    { path: '/settings', icon: Settings, label: language === 'en' ? 'Settings' : 'Pengaturan' },
  ];

// Video Library menu items
const libraryItems = [
    { path: '/library/uploads', icon: FolderOpen, label: language === 'en' ? 'Uploads' : 'Unggahan' },
    { path: '/library/downloads', icon: Download, label: language === 'en' ? 'Downloads' : 'Unduhan' },
  ];

 // Clip Studio menu items
const clipStudioItems = [
    { path: '/library/clips/tiktok', icon: Play, label: language === 'en' ? 'TikTok Clips' : 'Klip TikTok', color: 'text-cyan-400' },
    { path: '/library/clips/youtube', icon: Youtube, label: language === 'en' ? 'YouTube Shorts' : 'YouTube Shorts', color: 'text-red-400' },
    { path: '/library/clips/instagram', icon: Instagram, label: language === 'en' ? 'Instagram Reels' : 'Reels Instagram', color: 'text-pink-400' },
    { path: '/library/clips/facebook', icon: Facebook, label: language === 'en' ? 'Facebook Clips' : 'Klip Facebook', color: 'text-blue-400' },
  ];

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  // Handle link click to close sidebar on mobile
  const handleLinkClick = () => {
    if (toggleSidebar && window.innerWidth < 768) {
      toggleSidebar();
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && toggleSidebar && (
        <div 
          className="fixed inset-0 bg-black/50 z-30 md:hidden"
          onClick={toggleSidebar}
        />
      )}
      
      {/* Sidebar - hidden on mobile by default, visible when toggled */}
      <aside className={`
        fixed md:relative z-40 h-screen bg-[#111827] border-r border-gray-800 flex flex-col justify-between
        transition-transform duration-300 ease-in-out
        w-64
        ${isOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        {/* Logo */}
        <div className="p-6 border-b border-gray-800 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">
              Clipper<span className="text-purple-500">Ai</span>2026
            </h1>
            <p className="text-xs text-gray-500 mt-1">AI Video Platform</p>
          </div>
          {/* Mobile close button */}
          {toggleSidebar && (
            <button 
              onClick={toggleSidebar}
              className="md:hidden p-1 text-gray-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-3 py-4 overflow-y-auto">
          {/* Main Section */}
          <div className="mb-4">
            <p className="text-xs text-gray-600 uppercase tracking-wider px-4 mb-2">Main</p>
            <ul className="space-y-1">
              {menuItems.slice(0, 6).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`
                        flex items-center px-4 py-3 rounded-lg transition-all duration-200
                        ${active 
                          ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-4 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                          : 'text-gray-400 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                        }
                      `}
                    >
                      <Icon 
                        className={`
                          w-5 h-5 mr-3 transition-transform duration-200
                          ${active ? 'text-purple-400 scale-110' : 'hover:scale-110'}
                        `} 
                      />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Management Section */}
          <div className="mb-4">
            <p className="text-xs text-gray-600 uppercase tracking-wider px-4 mb-2">Management</p>
            <ul className="space-y-1">
              {menuItems.slice(6).map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`
                        flex items-center px-4 py-3 rounded-lg transition-all duration-200
                        ${active 
                          ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-4 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                          : 'text-gray-400 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                        }
                      `}
                    >
                      <Icon 
                        className={`
                          w-5 h-5 mr-3 transition-transform duration-200
                          ${active ? 'text-purple-400 scale-110' : 'hover:scale-110'}
                        `} 
                      />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Video Library Section */}
          <div className="mb-4">
            <p className="text-xs text-gray-600 uppercase tracking-wider px-4 mb-2">Video Library</p>
            <ul className="space-y-1">
              {libraryItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`
                        flex items-center px-4 py-3 rounded-lg transition-all duration-200
                        ${active 
                          ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-4 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                          : 'text-gray-400 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                        }
                      `}
                    >
                      <Icon 
                        className={`
                          w-5 h-5 mr-3 transition-transform duration-200
                          ${active ? 'text-purple-400 scale-110' : 'hover:scale-110'}
                        `} 
                      />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>

          {/* Clip Studio Section */}
          <div className="mb-4">
            <p className="text-xs text-gray-600 uppercase tracking-wider px-4 mb-2">Clip Studio</p>
            <ul className="space-y-1">
              {clipStudioItems.map((item) => {
                const Icon = item.icon;
                const active = isActive(item.path);
                
                return (
                  <li key={item.path}>
                    <Link
                      to={item.path}
                      onClick={handleLinkClick}
                      className={`
                        flex items-center px-4 py-3 rounded-lg transition-all duration-200
                        ${active 
                          ? 'bg-gradient-to-r from-purple-500/20 to-transparent border-l-4 border-purple-500 text-white shadow-[0_0_20px_rgba(168,85,247,0.3)]' 
                          : 'text-gray-400 hover:bg-gray-800/50 hover:text-white hover:translate-x-1'
                        }
                      `}
                    >
                      <Icon 
                        className={`
                          w-5 h-5 mr-3 transition-transform duration-200
                          ${active ? 'text-purple-400 scale-110' : item.color || 'hover:scale-110'}
                        `} 
                      />
                      <span className="font-medium">{item.label}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        </nav>

        {/* Footer */}
        <div className="p-4 border-t border-gray-800">
          <div className="flex items-center justify-between mb-4">
            <span className="text-sm text-gray-500">
              {language === 'en' ? 'Language' : 'Bahasa'}
            </span>
            <button
              onClick={() => setLanguage(language === 'en' ? 'id' : 'en')}
              className="flex items-center text-gray-400 hover:text-white transition-colors duration-200"
            >
              <Globe className="w-4 h-4 mr-2" />
              <span className="text-sm font-medium">{(language || 'en').toUpperCase()}</span>
            </button>
          </div>

          <button
            onClick={onLogout}
            className="flex items-center w-full px-4 py-2.5 text-gray-400 hover:bg-red-500/10 hover:text-red-400 rounded-lg transition-all duration-200"
          >
            <LogOut className="w-4 h-4 mr-3" />
            <span className="font-medium">{language === 'en' ? 'Logout' : 'Keluar'}</span>
          </button>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;

