import { useState, useCallback, Suspense, lazy, useEffect, useMemo } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";

import ErrorBoundary from "./components/core/ErrorBoundary";
import Login from "./pages/Login";
import Sidebar from "./components/Sidebar";
import OverlordFloatingAI from "./components/ai/OverlordFloatingAI";
import PWAInstallPrompt from "./components/PWAInstallPrompt";

// Light mode performance flag - global constant (MUST be after imports)
export const LIGHT_MODE = true;

// Disable framer-motion in light mode for performance
const animationEnabled = !LIGHT_MODE;

// Lazy load pages for performance - reduces initial bundle size
const Dashboard = lazy(() => import("./pages/Dashboard"));
const Research = lazy(() => import("./pages/Research"));
const Prediction = lazy(() => import("./pages/Prediction"));
const Upload = lazy(() => import("./pages/Upload"));
const UploadCenter = lazy(() => import("./pages/UploadCenter"));
const Trending = lazy(() => import("./pages/Trending"));
const Settings = lazy(() => import("./pages/Settings"));
const Analytics = lazy(() => import("./pages/Analytics"));
const Team = lazy(() => import("./pages/Team"));
const Billing = lazy(() => import("./pages/Billing"));
const NotFound = lazy(() => import("./pages/NotFound"));
const AutoClipFactory = lazy(() => import("./pages/AutoClipFactory"));
const Chat = lazy(() => import("./pages/Chat"));
const Library = lazy(() => import("./pages/Library"));
const ViralHunter = lazy(() => import("./pages/ViralHunter"));

const pageVariants = animationEnabled ? {
  initial: {
    opacity: 0,
    y: 8,
  },
  animate: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.25,
      ease: [0.16, 1, 0.3, 1],
    },
  },
  exit: {
    opacity: 0,
    y: -8,
    transition: {
      duration: 0.15,
    },
  },
} : {};

const AnimatedRoute = ({ children }) => (
  <motion.div
    initial={animationEnabled ? "initial" : false}
    animate={animationEnabled ? "animate" : false}
    exit={animationEnabled ? "exit" : false}
    variants={pageVariants}
    className="min-h-screen"
  >
    {children}
  </motion.div>
);

// Loading fallback for Suspense - lightweight (no animation)
function PageLoader() {
  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <div 
        className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" 
        style={{ animation: animationEnabled ? 'spin 1s linear infinite' : 'none' }}
      />
    </div>
  );
}

// Dummy token for bypassing authentication - allows app to load without login
const DUMMY_TOKEN = "clipperai_bypass_token";

function App() {
  // Always use dummy token to bypass authentication
  const [token, setToken] = useState(DUMMY_TOKEN);
  
  // Mobile sidebar state
  const [sidebarOpen, setSidebarOpen] = useState(false);
  
  const [language, setLanguage] = useState(() => {
    try {
      return localStorage.getItem("clipperai_language") || 'en';
    } catch { return 'en'; }
  });
  
  // PHASE 6: Offline detection
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    
    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);
  
  const location = useLocation();

  const handleLogin = useCallback((newToken) => {
    try {
      localStorage.setItem("token", newToken);
      setToken(newToken);
    } catch (err) {
      console.error("Login error:", err);
    }
  }, []);

  // Bypassed logout - redirects to dashboard instead of requiring login
  const logout = useCallback(() => {
    // Keep using dummy token so user stays logged in
    window.location.href = "/dashboard";
  }, []);

  const handleLanguageChange = useCallback((newLang) => {
    setLanguage(newLang);
    try {
      localStorage.setItem("clipperai_language", newLang);
    } catch (err) {
      console.error("Language save error:", err);
    }
  }, []);

  // Toggle sidebar function for mobile
  const toggleSidebar = useCallback(() => {
    setSidebarOpen(prev => !prev);
  }, []);

  // Memoize sidebar props to prevent unnecessary re-renders
  const sidebarProps = useMemo(() => ({
    onLogout: logout,
    language,
    setLanguage: handleLanguageChange,
    isOnline,
    isOpen: sidebarOpen,
    toggleSidebar
  }), [logout, language, handleLanguageChange, isOnline, sidebarOpen, toggleSidebar]);

  // Show login if no token
  if (!token) {
    return (
      <ErrorBoundary>
        <Login onLogin={handleLogin} />
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen flex bg-[#0b0f1a]">
        {/* Sidebar - always rendered */}
        <Sidebar {...sidebarProps} />

        {/* Main content area - optimized scroll */}
        <main className="flex-1 overflow-y-auto" style={{ scrollBehavior: 'smooth' }}>
          {/* Mobile hamburger menu button */}
          <button
            onClick={toggleSidebar}
            className="md:hidden fixed top-4 left-4 z-50 p-2 bg-gray-800 rounded-lg text-white hover:bg-gray-700"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>

          {/* Offline badge */}
          {!isOnline && (
            <div className="fixed top-4 right-4 z-50 px-3 py-1.5 bg-yellow-500/20 border border-yellow-500/30 rounded-full">
              <span className="text-xs text-yellow-400 font-medium">Offline Mode Active</span>
            </div>
          )}
          
          {/* Background - lighter in light mode */}
          <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
            <div 
              className="absolute inset-0 opacity-[0.025]"
              style={{
                backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
                backgroundSize: '40px 40px',
              }}
            />
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[120px]" />
            <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[120px]" />
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-pink-600/5 rounded-full blur-[100px]" />
          </div>

          {/* Page content with Suspense */}
          <div className="relative z-10 p-6">
            <AnimatePresence mode="wait">
              <Suspense fallback={<PageLoader />}>
                <Routes location={location} key={location.pathname}>
                  <Route 
                    path="/" 
                    element={<AnimatedRoute><Dashboard token={token} /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/dashboard" 
                    element={<AnimatedRoute><Dashboard token={token} /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/research" 
                    element={<AnimatedRoute><Research isOnline={isOnline} /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/prediction" 
                    element={<AnimatedRoute><Prediction isOnline={isOnline} /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/upload" 
                    element={<AnimatedRoute><Upload isOnline={isOnline} /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/upload-center" 
                    element={<AnimatedRoute><UploadCenter isOnline={isOnline} /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/trending" 
                    element={<AnimatedRoute><Trending isOnline={isOnline} /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/settings" 
                    element={<AnimatedRoute><Settings /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/analytics" 
                    element={<AnimatedRoute><Analytics /></AnimatedRoute>} 
                  />
<Route 
                    path="/team" 
                    element={<AnimatedRoute><Team /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/chat" 
                    element={<AnimatedRoute><Chat /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/billing" 
                    element={<AnimatedRoute><Billing /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/auto-clip-factory" 
                    element={<AnimatedRoute><AutoClipFactory /></AnimatedRoute>} 
                  />
{/* Video Library Routes */}
                  <Route 
                    path="/library/uploads" 
                    element={<AnimatedRoute><Library /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/library/downloads" 
                    element={<AnimatedRoute><Library /></AnimatedRoute>} 
                  />
                  <Route 
                    path="/library/clips/:platform" 
                    element={<AnimatedRoute><Library /></AnimatedRoute>} 
                  />
                  {/* Viral Hunter Route */}
                  <Route 
                    path="/viral-hunter" 
                    element={<AnimatedRoute><ViralHunter /></AnimatedRoute>} 
                  />
                  <Route 
                    path="*"
                    element={<AnimatedRoute><NotFound /></AnimatedRoute>}
                  />
                </Routes>
              </Suspense>
            </AnimatePresence>
          </div>
        </main>
      </div>
      
      {/* Overlord AI Floating Assistant */}
      <OverlordFloatingAI />
      
      {/* PWA Install Prompt */}
      <PWAInstallPrompt />
    </ErrorBoundary>
  );
}

export default App;
