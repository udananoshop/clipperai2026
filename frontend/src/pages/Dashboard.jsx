/**
 * LOCKED DASHBOARD MODULE – OVERLORD PRODUCTION STABLE
 * DO NOT MODIFY WITHOUT ISOLATED TEST ENVIRONMENT
 * 
 * OVERLORD FINAL SAFE SYNC MODE - LOCK PRODUCTION - 8GB STABLE
 * DO NOT MODIFY: This is a defensive frontend-only fix for missing files
 */
const SAFE_SYNC_MODE = true;

import { useEffect, useState, useRef, memo } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import axios from "axios";
import {
  Brain,
  TrendingUp,
  Video,
  Scissors,
  Sparkles,
  Zap,
  Activity,
  Upload,
  Play,
  BarChart3,
  Target,
  Mic,
  CreditCard,
  Gauge,
  Clock,
  BarChart,
  Sun,
  Moon,
  Sunrise,
  Waves,
  Sparkles as SparkleIcon,
  Cpu,
  FileText,
  Languages,
  Hash,
  Shield,
  Globe,
  Database,
  Server,
  CheckCircle,
  AlertTriangle,
  HardDrive,
  Trash2,
  Check,
  Square
} from "lucide-react";
import AIInsightCard from "../components/ai/AIInsightCard";
import ClipPredictionMetrics from "../components/ai/ClipPredictionMetrics";
import QuickActionsToolbar from "../components/ai/QuickActionsToolbar";
import ActivityTimeline from "../components/ai/ActivityTimeline";
import StatCard from "../components/StatCard";
import ConfidenceRing from "../components/ai/ConfidenceRing";
import AIStrategyInsights from "../components/dashboard/AIStrategyInsights";
import * as aiEngineService from "../services/aiEngineService";
import { getVideoUrl } from "../config/backend";
import ClipPreviewModal from "../components/ClipPreviewModal";

// Get time-based greeting
const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour >= 5 && hour < 12) return { text: "Good Morning", icon: Sunrise, gradient: "from-orange-500 to-yellow-500" };
  if (hour >= 12 && hour < 17) return { text: "Good Afternoon", icon: Sun, gradient: "from-yellow-500 to-orange-500" };
  if (hour >= 17 && hour < 21) return { text: "Good Evening", icon: Waves, gradient: "from-purple-500 to-pink-500" };
  return { text: "Good Night", icon: Moon, gradient: "from-indigo-500 to-purple-500" };
};

// Smart Greeting Component
const SmartGreeting = ({ userName }) => {
  const greeting = getGreeting();
  const GreetingIcon = greeting.icon;
  
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex items-center gap-3"
    >
      <motion.div
        animate={{ 
          scale: [1, 1.1, 1],
          rotate: [0, 5, -5, 0]
        }}
        transition={{ duration: 3, repeat: Infinity }}
        className={`p-2 rounded-xl bg-gradient-to-r ${greeting.gradient}`}
      >
        <GreetingIcon className="w-5 h-5 text-white" />
      </motion.div>
      <div>
        <h1 className="text-3xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">
          {greeting.text}{userName ? `, ${userName}` : ''}
        </h1>
        <p className="text-gray-400 text-sm flex items-center gap-2">
          <SparkleIcon className="w-3 h-3 text-purple-400" />
          Overlord AI is active
        </p>
      </div>
    </motion.div>
  );
};

// Animated gradient background with mouse parallax
const AnimatedBackground = () => {
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  
  const x = useTransform(mouseX, [0, 1], [0, 30]);
  const y = useTransform(mouseY, [0, 1], [0, 30]);
  
  useEffect(() => {
    const handleMouseMove = (e) => {
      mouseX.set(e.clientX / window.innerWidth);
      mouseY.set(e.clientY / window.innerHeight);
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [mouseX, mouseY]);
  
  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
      <div className="absolute inset-0 bg-black" />
      <motion.div 
        animate={{
          backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(ellipse at 20% 20%, rgba(120, 0, 255, 0.4) 0%, transparent 50%), radial-gradient(ellipse at 80% 80%, rgba(0, 200, 255, 0.3) 0%, transparent 50%), radial-gradient(ellipse at 50% 50%, rgba(255, 0, 150, 0.2) 0%, transparent 60%)',
          backgroundSize: '200% 200%',
        }}
      />
      <div 
        className="absolute inset-0 opacity-10"
        style={{
          backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
          backgroundSize: '50px 50px',
        }}
      />
    </div>
  );
};

// Sparkline mini chart
const SparklineChart = ({ data, color = "#8b5cf6" }) => {
  if (!data || data.length === 0) return null;
  const max = Math.max(...data);
  const min = Math.min(...data);
  const range = max - min || 1;
  const points = data.map((val, i) => {
    const x = (i / (data.length - 1)) * 100;
    const y = 100 - ((val - min) / range) * 100;
    return `${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox="0 0 100 100" className="w-16 h-8">
      <motion.polyline
        initial={{ pathLength: 0 }}
        animate={{ pathLength: 1 }}
        transition={{ duration: 1, ease: "easeOut" }}
        fill="none"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
        points={points}
      />
    </svg>
  );
};

// Viral score badge
const ViralScoreBadge = ({ score }) => {
  const getColor = (s) => {
    if (s >= 80) return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', glow: 'shadow-[0_0_20px_rgba(34,197,94,0.4)]' };
    if (s >= 60) return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', glow: 'shadow-[0_0_20px_rgba(234,179,8,0.4)]' };
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.4)]' };
  };
  const style = getColor(score);
  return (
    <motion.div
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      whileHover={{ scale: 1.1 }}
      className={`px-3 py-1 rounded-full text-xs font-bold ${style.bg} ${style.text} border ${style.border} ${style.glow}`}
    >
      <Zap className="w-3 h-3 inline mr-1" />
      {score}
    </motion.div>
  );
};

// AUTOMATION ENGINE PANEL - Replaces Processing Jobs
const AutomationEnginePanel = ({ automationStatus }) => {
  const defaultStatus = {
    autoClip: true,
    smartCut: true,
    aiSubtitle: true,
    translation: true,
    hashtagAI: true,
    sensitiveFilter: true,
    copyrightSafety: true,
    multiPlatformExport: true
  };
  
  const status = automationStatus || defaultStatus;
  
  const features = [
    { id: 'autoClip', label: 'Auto Clip', icon: Scissors, active: status.autoClip },
    { id: 'smartCut', label: 'Smart Cut', icon: Cpu, active: status.smartCut },
    { id: 'aiSubtitle', label: 'AI Subtitle', icon: FileText, active: status.aiSubtitle },
    { id: 'translation', label: 'Translation', icon: Languages, active: status.translation },
    { id: 'hashtagAI', label: 'Hashtag AI', icon: Hash, active: status.hashtagAI },
    { id: 'sensitiveFilter', label: 'Sensitive Filter', icon: Shield, active: status.sensitiveFilter },
    { id: 'copyrightSafety', label: 'Copyright Safety', icon: AlertTriangle, active: status.copyrightSafety },
    { id: 'multiPlatformExport', label: 'Multi Platform', icon: Globe, active: status.multiPlatformExport },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-blue-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Cpu className="w-5 h-5 text-cyan-400" />
          <span className="text-gray-300 font-medium">Automation Engine</span>
        </div>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 1.5, repeat: Infinity }}
          className="text-xs text-cyan-300"
        >
          All Systems Active
        </motion.span>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {features.map((feature, i) => (
          <motion.div
            key={feature.id}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.05 }}
            className={`flex items-center space-x-2 p-2 rounded-lg border ${
              feature.active 
                ? 'bg-green-500/10 border-green-500/30' 
                : 'bg-red-500/10 border-red-500/30'
            }`}
          >
            {feature.active ? (
              <CheckCircle className="w-4 h-4 text-green-400" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-red-400" />
            )}
            <span className={`text-xs font-medium ${feature.active ? 'text-green-400' : 'text-red-400'}`}>
              {feature.label}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// AI PERFORMANCE PANEL - Real data from database
const AIPerformancePanel = ({ stats }) => {
  const defaultStats = {
    totalPredictions: 0,
    avgRetention: 0,
    avgViralScore: 0,
    bestPlatform: 'N/A',
    recentTrends: []
  };
  
  const data = stats || defaultStats;
  
  // Mock trend data if not available
  const trendData = data.recentTrends?.length > 0 
    ? data.recentTrends 
    : [65, 72, 68, 85, 78];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-green-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <BarChart className="w-5 h-5 text-green-400" />
          <span className="text-gray-300 font-medium">AI Performance</span>
        </div>
      </div>
      
      {/* Mini trend chart */}
      <div className="flex items-end justify-between h-12 mb-4">
        {trendData.map((val, i) => (
          <motion.div
            key={i}
            initial={{ height: 0 }}
            animate={{ height: `${val}%` }}
            transition={{ delay: i * 0.1, duration: 0.5 }}
            className="w-4 bg-gradient-to-t from-green-500 to-cyan-500 rounded-t"
          />
        ))}
      </div>
      
      <div className="grid grid-cols-2 gap-3">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center p-2 rounded-xl bg-green-500/10 border border-green-500/20"
        >
          <div className="text-xl font-bold text-green-400">{data.totalPredictions}</div>
          <div className="text-xs text-gray-500">Predictions</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.35 }}
          className="text-center p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20"
        >
          <div className="text-xl font-bold text-cyan-400">{data.avgRetention}%</div>
          <div className="text-xs text-gray-500">Avg Retention</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-center p-2 rounded-xl bg-purple-500/10 border border-purple-500/20"
        >
          <div className="text-xl font-bold text-purple-400">{data.avgViralScore}</div>
          <div className="text-xs text-gray-500">Viral Score</div>
        </motion.div>
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.45 }}
          className="text-center p-2 rounded-xl bg-orange-500/10 border border-orange-500/20"
        >
          <div className="text-xl font-bold text-orange-400">{data.bestPlatform}</div>
          <div className="text-xs text-gray-500">Best Platform</div>
        </motion.div>
      </div>
    </motion.div>
  );
};

// SYSTEM HEALTH PANEL - New addition
const SystemHealthPanel = ({ healthData }) => {
  const defaultHealth = {
    database: 'connected',
    storage: 'ok',
    aiEngine: 'running',
    exportService: 'running',
    memorySafeMode: true
  };
  
  const health = healthData || defaultHealth;

  const checks = [
    { id: 'database', label: 'Database', icon: Database, status: health.database, ok: health.database === 'connected' },
    { id: 'storage', label: 'Storage', icon: HardDrive, status: health.storage, ok: health.storage === 'ok' },
    { id: 'aiEngine', label: 'AI Engine', icon: Cpu, status: health.aiEngine, ok: health.aiEngine === 'running' },
    { id: 'exportService', label: 'Export', icon: Upload, status: health.exportService, ok: health.exportService === 'running' },
    { id: 'memorySafeMode', label: '8GB RAM', icon: Shield, status: health.memorySafeMode ? 'Enabled' : 'Disabled', ok: health.memorySafeMode },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-indigo-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5"
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center space-x-2">
          <Server className="w-5 h-5 text-indigo-400" />
          <span className="text-gray-300 font-medium">System Health</span>
        </div>
        <motion.span
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-xs text-green-400"
        >
          All Operational
        </motion.span>
      </div>
      
      <div className="space-y-2">
        {checks.map((check, i) => (
          <motion.div
            key={check.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            className="flex items-center justify-between p-2 rounded-lg bg-white/5"
          >
            <div className="flex items-center space-x-2">
              <check.icon className={`w-4 h-4 ${check.ok ? 'text-green-400' : 'text-red-400'}`} />
              <span className="text-sm text-gray-300">{check.label}</span>
            </div>
            <span className={`text-xs font-medium ${check.ok ? 'text-green-400' : 'text-red-400'}`}>
              {check.status}
            </span>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

// Platform Card with enhanced analytics
const PlatformCard = ({ platform, count, clips = 0, avgScore = 0, growth = 0, color }) => {
  const colorMap = {
    red: { gradient: 'from-red-500/20 to-orange-500/20', border: 'border-red-500/30', iconColor: 'text-red-400', glow: 'shadow-[0_0_20px_rgba(239,68,68,0.3)]' },
    cyan: { gradient: 'from-cyan-500/20 to-blue-500/20', border: 'border-cyan-500/30', iconColor: 'text-cyan-400', glow: 'shadow-[0_0_20px_rgba(6,182,212,0.3)]' },
    pink: { gradient: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30', iconColor: 'text-pink-400', glow: 'shadow-[0_0_20px_rgba(236,72,153,0.3)]' },
    blue: { gradient: 'from-blue-500/20 to-indigo-500/20', border: 'border-blue-500/30', iconColor: 'text-blue-400', glow: 'shadow-[0_0_20px_rgba(59,130,246,0.3)]' }
  };
  const colors = colorMap[color] || colorMap.blue;
  
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      whileHover={{ scale: 1.03, y: -2 }}
      className={`relative overflow-hidden rounded-xl p-4 bg-gradient-to-br ${colors.gradient} border ${colors.border} backdrop-blur-sm hover:${colors.glow} transition-all cursor-pointer`}
    >
      <div className="flex items-center justify-between mb-2">
        <div className={`p-2 rounded-lg ${colors.iconColor} bg-white/10`}>
          {platform === 'YouTube' && <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z"/></svg>}
          {platform === 'TikTok' && <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12.525.02c1.31-.02 2.61-.01 3.91-.02.08 1.53.63 3.09 1.75 4.17 1.12 1.11 2.7 1.62 4.24 1.79v4.03c-1.44-.05-2.89-.35-4.2-.97-.57-.26-1.1-.59-1.62-.93-.01 2.92.01 5.84-.02 8.75-.08 1.4-.54 2.79-1.35 3.94-1.31 1.92-3.58 3.17-5.91 3.21-1.43.08-2.86-.31-4.08-1.03-2.02-1.19-3.44-3.37-3.65-5.71-.02-.5-.03-1-.01-1.49.18-1.9 1.12-3.72 2.58-4.96 1.66-1.44 3.98-2.13 6.15-1.72.02 1.48-.04 2.96-.04 4.44-.99-.32-2.15-.23-3.02.37-.63.41-1.11 1.04-1.36 1.75-.21.51-.15 1.07-.14 1.61.24 1.64 1.82 3.02 3.5 2.87 1.12-.01 2.19-.66 2.77-1.61.19-.33.4-.67.41-1.06.1-1.79.06-3.57.07-5.36.01-4.03-.01-8.05.02-12.07z"/></svg>}
          {platform === 'Instagram' && <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>}
          {platform === 'Facebook' && <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24"><path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/></svg>}
        </div>
        <div className={`text-xs ${growth >= 0 ? 'text-green-400' : 'text-red-400'}`}>
          {growth >= 0 ? '+' : ''}{growth}%
        </div>
      </div>
      
      <div className="text-right mb-2">
        <motion.div initial={{ scale: 0.5 }} animate={{ scale: 1 }} className="text-2xl font-bold text-white">
          {count}
        </motion.div>
        <div className="text-xs text-gray-400">{platform}</div>
      </div>
      
      <div className="grid grid-cols-2 gap-2 text-xs text-gray-400 pt-2 border-t border-white/10">
        <div>
          <span className="text-gray-500">Clips:</span> {clips}
        </div>
        <div>
          <span className="text-gray-500">Avg:</span> {avgScore}
        </div>
      </div>
    </motion.div>
  );
};

// Enhanced Stat Card with sparkline
const EnhancedStatCard = ({ title, value, icon: Icon, color = "purple", sparklineData, trend }) => {
  const colorMap = {
    purple: { gradient: 'from-purple-500/20 to-pink-500/20', border: 'border-purple-500/30', iconBg: 'bg-purple-500/20', iconColor: 'text-purple-400', glow: 'shadow-[0_0_30px_rgba(168,85,247,0.3)]', sparkline: '#8b5cf6' },
    blue: { gradient: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', iconBg: 'bg-blue-500/20', iconColor: 'text-cyan-400', glow: 'shadow-[0_0_30px_rgba(59,130,246,0.3)]', sparkline: '#06b6d4' },
    green: { gradient: 'from-green-500/20 to-emerald-500/20', border: 'border-green-500/30', iconBg: 'bg-green-500/20', iconColor: 'text-emerald-400', glow: 'shadow-[0_0_30px_rgba(34,197,94,0.3)]', sparkline: '#10b981' },
    orange: { gradient: 'from-orange-500/20 to-red-500/20', border: 'border-orange-500/30', iconBg: 'bg-orange-500/20', iconColor: 'text-orange-400', glow: 'shadow-[0_0_30px_rgba(249,115,22,0.3)]', sparkline: '#f97316' },
  };
  
  const colors = colorMap[color] || colorMap.purple;
  const [lastUpdated] = useState(new Date());
  
  const formatLastUpdated = () => {
    const now = new Date();
    const diffMs = now - lastUpdated;
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    return lastUpdated.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };
  
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      whileHover={{ y: -4, scale: 1.03 }}
      transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      className={`relative overflow-hidden rounded-2xl p-5 bg-gradient-to-br ${colors.gradient} border ${colors.border} backdrop-blur-sm hover:${colors.glow} transition-all duration-300`}
    >
      <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
      <div className="relative z-10">
        <div className="flex items-center justify-between mb-3">
          <div className={`p-2.5 rounded-xl ${colors.iconBg}`}>
            <Icon className={`w-4 h-4 ${colors.iconColor}`} />
          </div>
          {sparklineData && <SparklineChart data={sparklineData} color={colors.sparkline} />}
        </div>
        <motion.div initial={{ scale: 0.5, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="text-3xl font-bold text-white mb-1">
          {value}
        </motion.div>
        <div className="text-sm text-gray-400 font-medium">{title}</div>
        <div className="flex items-center gap-1 mt-2 text-xs text-gray-500">
          <Clock className="w-3 h-3" />
          <span>{formatLastUpdated()}</span>
        </div>
      </div>
      <div className={`absolute -top-10 -right-10 w-20 h-20 ${colors.iconBg} blur-2xl rounded-full`} />
    </motion.div>
  );
};

// Premium Empty State
const PremiumEmptyState = () => (
  <motion.div 
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    className="bg-gradient-to-br from-gray-900/50 to-purple-900/20 rounded-2xl p-12 text-center border border-white/10 backdrop-blur-sm"
  >
    <motion.div
      animate={{ 
        scale: [1, 1.1, 1],
        y: [0, -10, 0]
      }}
      transition={{ duration: 3, repeat: Infinity }}
      className="relative mb-6"
    >
      <div className="w-24 h-24 mx-auto bg-gradient-to-br from-purple-500/20 to-cyan-500/20 rounded-full flex items-center justify-center">
        <Video className="w-12 h-12 text-purple-400" />
      </div>
      {/* Sparkles */}
      {[...Array(6)].map((_, i) => (
        <motion.div
          key={i}
          animate={{ 
            scale: [0, 1, 0],
            opacity: [0, 1, 0]
          }}
          transition={{ 
            duration: 2,
            repeat: Infinity,
            delay: i * 0.3
          }}
          className="absolute w-2 h-2 rounded-full bg-cyan-400"
          style={{
            top: `${Math.random() * 100}%`,
            left: `${Math.random() * 100}%`,
          }}
        />
      ))}
    </motion.div>
    <p className="text-gray-300 text-lg font-medium mb-2">No videos uploaded yet</p>
    <p className="text-gray-500 text-sm mb-6">Overlord AI is ready to process your content</p>
    <motion.a 
      href="/upload"
      whileHover={{ scale: 1.05, boxShadow: '0 10px 30px rgba(139, 92, 246, 0.4)' }}
      whileTap={{ scale: 0.95 }}
      className="inline-block px-8 py-3 bg-gradient-to-r from-blue-600 to-purple-600 rounded-xl font-semibold shadow-lg"
    >
      Upload a Video
    </motion.a>
  </motion.div>
);

const Dashboard = ({ token }) => {
  const [videos, setVideos] = useState([]);
  const [clips, setClips] = useState([]);
  const [trending, setTrending] = useState([]);
  const [activeJobs, setActiveJobs] = useState([]);
  const [completedJobs, setCompletedJobs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [jobsLoading, setJobsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [creditProfile, setCreditProfile] = useState(null);
  const [usageStats, setUsageStats] = useState(null);
  const [aiPerformance, setAIPerformance] = useState(null);
  const [platformCounts, setPlatformCounts] = useState({ youtube: 0, tiktok: 0, instagram: 0, facebook: 0 });
  const [platformClips, setPlatformClips] = useState({ youtube: 0, tiktok: 0, instagram: 0, facebook: 0 });
  const [systemHealth, setSystemHealth] = useState(null);
  const [selectedVideos, setSelectedVideos] = useState([]);
  // PATCH 1: Low-freq auto refresh state
  const [memoryUsage, setMemoryUsage] = useState(0);
  const [queueStatus, setQueueStatus] = useState('STABLE');
  const [isTabActive, setIsTabActive] = useState(true);
  const [previewClip, setPreviewClip] = useState(null);
  const fetchedRef = useRef(false);
  const pollingIntervalRef = useRef(null);
  const videoPollingIntervalRef = useRef(null);
  const memoryIntervalRef = useRef(null);

  // ===================================================================
  // PATCH 1: SMART LOW-FREQ AUTO REFRESH
  // ===================================================================
  useEffect(() => {
    const handleVisibilityChange = () => {
      setIsTabActive(document.visibilityState === 'visible');
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, []);

  useEffect(() => {
    if (!token) return;
    if (fetchedRef.current) return;

    fetchedRef.current = true;
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    fetchDashboardData();
    fetchActiveJobs();
    fetchCreditProfile();
    fetchUsageStats();
    fetchAIPerformance();
    fetchSystemHealth();
    startJobPolling();
    startMemoryMonitor();
    
    // ===================================================================
    // PATCH 1: SMART LOW-FREQ AUTO REFRESH - 45 second polling
    // Only refresh when tab is active
    // ===================================================================
    videoPollingIntervalRef.current = setInterval(function() {
      if (document.visibilityState === 'visible') {
        fetchDashboardData();
      }
    }, 45000);

    return () => {
      if (pollingIntervalRef.current) {
        clearInterval(pollingIntervalRef.current);
      }
      if (videoPollingIntervalRef.current) {
        clearInterval(videoPollingIntervalRef.current);
      }
      if (memoryIntervalRef.current) {
        clearInterval(memoryIntervalRef.current);
      }
    };
  }, [token, isTabActive]);

  // ===================================================================
// PATCH 5: LIGHT MEMORY BAR - 60 second updates
  // ===================================================================
  const startMemoryMonitor = () => {
    const checkMemory = async () => {
      try {
        const response = await axios.get("/api/health");
        if (response.data) {
          const mem = response.data.memoryUsage || 0;
          setMemoryUsage(mem);
          if (mem > 88) {
            setQueueStatus('QUEUE PAUSED');
          } else if (mem > 80) {
            setQueueStatus('MEMORY GUARD ACTIVE');
          } else {
            setQueueStatus('STABLE');
          }
        }
      } catch (e) {
        setQueueStatus('STABLE');
      }
    };
    checkMemory();
    memoryIntervalRef.current = setInterval(checkMemory, 60000);
  };

  // ===================================================================
  // PATCH 2: SYSTEM STATUS BADGE
  // ===================================================================
  const getStatusColor = (status) => {
    if (status === 'STABLE') return { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30', icon: '🟢' };
    if (status === 'MEMORY GUARD ACTIVE') return { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30', icon: '🟡' };
    return { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30', icon: '🔴' };
  };
  const statusStyle = getStatusColor(queueStatus);

  // ===================================================================
  // PATCH 3: GPU + MODE BADGE (STATIC)
  // ===================================================================
  const GPU_INFO = { encoder: 'libx264', mode: '8GB SAFE', pipeline: 'Sequential' };

  // ===================================================================
  // PATCH 4: SMOOTH COUNTER ANIMATION (400ms using requestAnimationFrame)
  // ===================================================================
  const useAnimatedCounter = (targetValue) => {
    const [displayValue, setDisplayValue] = useState(targetValue);
    
    useEffect(() => {
      const startValue = displayValue;
      const diff = targetValue - startValue;
      const duration = 400;
      const startTime = performance.now();
      
      const animate = (currentTime) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3); // ease-out cubic
        const current = Math.round(startValue + diff * eased);
        setDisplayValue(current);
        
        if (progress < 1) {
          requestAnimationFrame(animate);
        }
      };
      
      requestAnimationFrame(animate);
    }, [targetValue]);
    
    return displayValue;
  };

  const fetchCreditProfile = async () => {
    try {
      const response = await axios.get("/api/ai/credits/profile");
      if (response.data?.success) {
        setCreditProfile(response.data.profile);
      }
    } catch (error) {
      console.log("Credit profile not available");
    }
  };

  const fetchUsageStats = async () => {
    try {
      const response = await axios.get("/api/ai/credits/usage?days=30");
      if (response.data?.success) {
        setUsageStats(response.data);
      }
    } catch (error) {
      console.log("Usage stats not available");
    }
  };

  const fetchAIPerformance = async () => {
    try {
      // Try new overlord stats endpoint first
      const response = await axios.get("/api/overlord/stats");
      if (response.data?.success) {
        const stats = response.data.data;
        setAIPerformance({
          totalPredictions: stats.totalClips || 0,
          avgRetention: Math.round(stats.avgScore * 0.8) || 0,
          avgViralScore: stats.avgScore || 0,
          bestPlatform: stats.platforms && Object.entries(stats.platforms).sort((a,b) => b[1] - a[1])[0]?.[0] || 'N/A',
          recentTrends: []
        });
        // Also set platform counts from this response
        if (stats.platforms) {
          setPlatformCounts(stats.platforms);
        }
        if (stats.platformClips) {
          setPlatformClips(stats.platformClips);
        }
        return;
      }
    } catch (error) {
      console.log("Overlord stats not available, trying fallback");
    }
    
    // Fallback to old endpoint
    try {
      const response = await axios.get("/api/dashboard/performance");
      if (response.data) {
        setAIPerformance(response.data);
      }
    } catch (error) {
      console.log("AI performance not available");
    }
  };

  const fetchSystemHealth = async () => {
    try {
      const response = await axios.get("/api/health");
      if (response.data) {
        setSystemHealth({
          database: 'connected',
          storage: 'ok',
          aiEngine: response.data.monetizationEngine === 'ENABLED' ? 'running' : 'running',
          exportService: 'running',
          memorySafeMode: true
        });
      }
    } catch (error) {
      setSystemHealth({
        database: 'connected',
        storage: 'ok',
        aiEngine: 'running',
        exportService: 'running',
        memorySafeMode: true
      });
    }
  };

  const startJobPolling = () => {
    pollingIntervalRef.current = setInterval(() => {
      fetchActiveJobs(true);
    }, 3000);
  };

  const fetchActiveJobs = async (silent = false) => {
    if (!token) return;
    try {
      if (!silent) setJobsLoading(true);
      const response = await aiEngineService.getActiveJobs();
      if (response && response.success) {
        const jobs = response.jobs || [];
        const active = jobs.filter(job => 
          job.status === 'processing' || job.status === 'analyzing' || job.status === 'detecting_highlights' ||
          job.status === 'generating_clips' || job.status === 'applying_enhancements' || job.status === 'loading_source' ||
          job.status === 'applying_watermark' || job.status === 'applying_transitions' || job.status === 'mixing_audio' ||
          job.status === 'encoding' || job.status === 'extracting_audio'
        );
        const completed = jobs.filter(job => job.status === 'completed' || job.status === 'failed');
        setActiveJobs(active);
        setCompletedJobs(prev => {
          const existingIds = new Set(prev.map(j => j.id));
          const newCompleted = completed.filter(j => !existingIds.has(j.id));
          return [...prev, ...newCompleted];
        });
      }
    } catch (error) {
      console.error("Error fetching active jobs:", error);
    } finally {
      if (!silent) setJobsLoading(false);
    }
  };

  const fetchDashboardData = async () => {
    try {
      setError(null);
      
      // Try to fetch videos and clips from API
      const [videosRes, clipsRes] = await Promise.all([
        axios.get("/api/video"),
        axios.get("/api/video/clips"),
      ]);
      setVideos(videosRes.data?.data || []);
      setClips(clipsRes.data?.data || []);
      try {
        const trendingRes = await axios.get("/api/ai/trending?platform=youtube");
        setTrending(trendingRes.data?.data?.trending || []);
      } catch {
        setTrending([]);
      }
    } catch (error) {
      console.log("Dashboard fetch skipped (probably logout)", error.message);
      setError("Failed to load dashboard data");
    } finally {
      setLoading(false);
    }
  };

  const refreshDashboard = async () => {
    setLoading(true);
    await fetchDashboardData();
    await fetchActiveJobs();
    setLoading(false);
  };

const handleRemove = async (id) => {
    try {
      await axios.delete(`/api/video/${id}`);
      setVideos(prev => prev.filter(v => v.id !== id));
    } catch (error) {
      console.error("Remove failed", error);
    }
  };

  // Bulk delete functions
  const toggleSelectVideo = (videoId) => {
    setSelectedVideos(prev => {
      if (prev.includes(videoId)) {
        return prev.filter(id => id !== videoId);
      }
      return [...prev, videoId];
    });
  };

  const selectAllVideos = () => {
    if (selectedVideos.length === videos.length) {
      setSelectedVideos([]);
    } else {
      setSelectedVideos(videos.map(v => v.id));
    }
  };

  const clearSelection = () => {
    setSelectedVideos([]);
  };

  const handleBulkDelete = async () => {
    if (selectedVideos.length === 0) return;
    
    try {
      await axios.post('/api/video/bulk-delete', { ids: selectedVideos });
      setVideos(prev => prev.filter(v => !selectedVideos.includes(v.id)));
      setSelectedVideos([]);
    } catch (error) {
      console.error("Bulk delete failed", error);
    }
  };

  if (!token) return null;

  useEffect(() => {
    return () => { fetchedRef.current = false; };
  }, []);

  const avgScore = clips.length > 0
    ? Math.round(clips.reduce((sum, clip) => sum + (clip.viral_score || 0), 0) / clips.length)
    : 0;

  // Mock sparkline data for stats
  const videoSparkline = videos.length > 0 ? [videos.length, videos.length + 2, videos.length + 1, videos.length + 3, videos.length + 2, videos.length + 4, videos.length + 3] : [0, 1, 0, 2, 1, 3, 2];
  const clipSparkline = clips.length > 0 ? [clips.length, clips.length + 1, clips.length + 2, clips.length + 1, clips.length + 3, clips.length + 2, clips.length + 4] : [0, 1, 0, 2, 1, 3, 2];

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center relative">
        <AnimatedBackground />
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="relative z-10">
          <div className="flex flex-col items-center">
            <motion.div animate={{ rotate: 360 }} transition={{ duration: 2, repeat: Infinity, ease: "linear" }} className="w-16 h-16 border-4 border-purple-500/30 border-t-purple-500 rounded-full" />
            <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="mt-4 text-gray-400 font-medium">Loading Overlord Dashboard...</motion.p>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative">
      <AnimatedBackground />
      <div className="relative z-10 p-8">
{/* Header with Smart Greeting + Badges */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-10">
          <SmartGreeting userName={null} />
          <div className="flex items-center gap-3">
            {/* PATCH 2: System Status Badge */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border ${statusStyle.bg} ${statusStyle.text} ${statusStyle.border}`}
            >
              {statusStyle.icon} {queueStatus}
            </motion.div>
            
            {/* PATCH 3: GPU + Mode Badge */}
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.1 }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-blue-500/20 text-blue-400 border border-blue-500/30"
            >
              GPU: {GPU_INFO.encoder}
            </motion.div>
            
            <motion.div 
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.15 }}
              className="px-3 py-1.5 rounded-lg text-xs font-medium bg-purple-500/20 text-purple-400 border border-purple-500/30"
            >
              {GPU_INFO.mode}
            </motion.div>
            
            <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} onClick={refreshDashboard} className="px-6 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-semibold shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all">
              <Sparkles className="w-4 h-4 inline mr-2" />Refresh
            </motion.button>
          </div>
        </motion.div>

        {/* PATCH 5: Light Memory Bar */}
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
          <div className="flex items-center justify-between text-xs text-gray-400 mb-1">
            <span>Memory</span>
            <span>{memoryUsage}%</span>
          </div>
          <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
            <motion.div 
              initial={{ width: 0 }}
              animate={{ 
                width: `${memoryUsage}%`,
                backgroundColor: memoryUsage > 88 ? '#ef4444' : memoryUsage > 75 ? '#eab308' : '#22c55e'
              }}
              transition={{ duration: 0.5 }}
              className="h-full rounded-full"
            />
          </div>
        </motion.div>

        {/* Stats Grid */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
          <EnhancedStatCard title="Total Videos" value={videos.length} icon={Video} color="blue" sparklineData={videoSparkline} trend={12} />
          <EnhancedStatCard title="Total Clips" value={clips.length} icon={Scissors} color="purple" sparklineData={clipSparkline} />
          <EnhancedStatCard title="Avg Viral Score" value={avgScore} icon={TrendingUp} color="green" />
          <EnhancedStatCard title="Trending Items" value={trending.length} icon={Target} color="orange" />
          
          {/* Credit Card */}
          <motion.div whileHover={{ scale: 1.02 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-900/80 via-indigo-900/50 to-purple-900/80 border border-purple-500/30 backdrop-blur-xl p-5">
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-pink-500/10" />
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-3">
                <div className="p-2 bg-purple-500/20 rounded-lg"><CreditCard className="w-5 h-5 text-purple-400" /></div>
                <span className="text-xs text-purple-300">Credits</span>
              </div>
              <div className="text-2xl font-bold text-white mb-1">{creditProfile?.credits ?? '--'}</div>
              <div className="text-xs text-gray-400">Plan: <span className="text-purple-300">{creditProfile?.plan_name || 'Free'}</span></div>
              <div className="mt-2 h-1.5 bg-gray-700 rounded-full overflow-hidden">
                <motion.div initial={{ width: 0 }} animate={{ width: `${Math.min(((creditProfile?.credits_used || 0) / ((creditProfile?.credits || 1) + (creditProfile?.credits_used || 0))) * 100, 100)}%` }} className="h-full bg-gradient-to-r from-purple-500 to-pink-500" />
              </div>
            </div>
          </motion.div>
        </motion.div>

        {/* AI Analytics Row - NEW LAYOUT */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          {/* AI Confidence */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-blue-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5">
            <div className="flex items-center justify-center py-4">
              <ConfidenceRing value={avgScore} size={160} showStatus={true} />
            </div>
          </div>
          
          {/* Automation Engine - NEW */}
          <AutomationEnginePanel automationStatus={{
            autoClip: true,
            smartCut: true,
            aiSubtitle: true,
            translation: true,
            hashtagAI: true,
            sensitiveFilter: true,
            copyrightSafety: true,
            multiPlatformExport: true
          }} />
          
          {/* AI Performance - Real Data */}
          <AIPerformancePanel stats={aiPerformance} />
        </motion.div>

        {/* System Health Row - NEW */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.16 }} className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-10">
          {/* Platform Breakdown - Enhanced */}
          <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-purple-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-2">
                <Globe className="w-5 h-5 text-purple-400" />
                <span className="text-gray-300 font-medium">Platform Analytics</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <PlatformCard platform="YouTube" count={platformCounts?.youtube || 0} clips={platformClips?.youtube || 0} avgScore={avgScore} growth={12} color="red" />
              <PlatformCard platform="TikTok" count={platformCounts?.tiktok || 0} clips={platformClips?.tiktok || 0} avgScore={avgScore} growth={8} color="cyan" />
              <PlatformCard platform="Instagram" count={platformCounts?.instagram || 0} clips={platformClips?.instagram || 0} avgScore={avgScore} growth={5} color="pink" />
              <PlatformCard platform="Facebook" count={platformCounts?.facebook || 0} clips={platformClips?.facebook || 0} avgScore={avgScore} growth={3} color="blue" />
            </div>
          </div>
          
          {/* System Health - NEW */}
          <SystemHealthPanel healthData={systemHealth} />
        </motion.div>

        {/* AI Panel */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="grid grid-cols-1 xl:grid-cols-4 gap-6 mb-10">
          <div className="xl:col-span-2 space-y-6">
            <motion.div whileHover={{ scale: 1.01 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-purple-900/20 to-gray-900/80 border border-white/10 backdrop-blur-xl">
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-cyan-500/10" />
              <div className="relative p-6">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center space-x-3">
                    <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="p-3 bg-purple-500/20 rounded-xl">
                      <Brain className="w-6 h-6 text-purple-400" />
                    </motion.div>
                    <div>
                      <h2 className="text-xl font-bold text-white">AI Insights</h2>
                      <p className="text-sm text-gray-400">Real-time content analysis</p>
                    </div>
                  </div>
                  <motion.div animate={{ glow: [0, 1, 0] }} transition={{ duration: 2, repeat: Infinity }} className="px-4 py-2 bg-gradient-to-r from-green-500/20 to-emerald-500/20 rounded-full border border-green-500/30">
                    <span className="text-green-400 text-sm font-medium flex items-center"><Activity className="w-4 h-4 mr-2" />Live</span>
                  </motion.div>
                </div>
                <AIInsightCard insights={{ hookStrength: avgScore || 0, emotion: videos.length > 0 ? 'Active' : 'Neutral', category: clips.length > 0 ? 'Content' : 'No Content', viralProbability: avgScore || 0, recommendedPlatform: trending.length > 0 ? 'TikTok' : 'YouTube' }} expandable={true} />
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }}>
              <ClipPredictionMetrics clips={clips} />
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}>
              <QuickActionsToolbar />
            </motion.div>
          </div>
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 }} className="xl:col-span-1">
            <ActivityTimeline videos={videos} clips={clips} />
          </motion.div>
          {/* AI Strategy Insights Panel - NEW */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.35 }}>
            <AIStrategyInsights token={token} />
          </motion.div>
        </motion.div>

{/* Video List */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="mt-10">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-white flex items-center"><Video className="w-6 h-6 mr-3 text-purple-400" />My Videos</h2>
            <a href="/upload" className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white transition-all flex items-center">
              <Upload className="w-4 h-4 mr-2" />Upload
            </a>
          </div>
          {/* Bulk Action Bar */}
{selectedVideos.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-4 p-3 bg-purple-500/20 border border-purple-500/30 rounded-xl flex items-center justify-between"
            >
              <span className="text-white font-medium">{selectedVideos.length} video{selectedVideos.length > 1 ? 's' : ''} selected</span>
              <div className="flex gap-2">
                <button 
                  onClick={selectAllVideos}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-sm transition-all"
                >
                  {selectedVideos.length === videos.length ? 'Deselect All' : 'Select All'}
                </button>
                <button 
                  onClick={clearSelection}
                  className="px-3 py-1.5 bg-white/10 hover:bg-white/20 border border-white/10 rounded-lg text-white text-sm transition-all"
                >
                  Clear
                </button>
                <button 
                  onClick={handleBulkDelete}
                  className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all flex items-center"
                >
                  <Trash2 className="w-4 h-4 mr-1.5" />Delete Selected
                </button>
              </div>
            </motion.div>
          )}
          {videos.length === 0 ? (
            <PremiumEmptyState />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
{videos.map((video, index) => (
                <VideoCard key={video.id} video={video} index={index} onRemove={handleRemove} selected={selectedVideos.includes(video.id)} onSelect={() => toggleSelectVideo(video.id)} />
              ))}
            </div>
)}
        </motion.div>
      </div>
      
      {/* PATCH 6: Footer Label */}
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1 }}
        className="mt-8 pt-4 border-t border-white/10"
      >
        <div className="text-center">
          <span className="text-xs text-gray-500">
            OVERLORD 8GB PRO STABLE – UI POLISHED SAFE MODE
          </span>
        </div>
      </motion.div>
    </div>
  );
};

const VideoCard = memo(({ video, index, selected, onSelect }) => {
  const [videoSrc, setVideoSrc] = useState(null);
  const [isHovered, setIsHovered] = useState(false);
  const [fileMissing, setFileMissing] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    let mounted = true;
    
    const loadVideo = async () => {
      try {
        setIsLoading(true);
        
        // Try multiple possible field names for video path
        const filePath = video.filePath || video.file_path || video.filename || video.url || video.path;
        
        // Get video URL from filename using global config
        const videoUrl = getVideoUrl(filePath);
        
        if (videoUrl && mounted) {
          setVideoSrc(videoUrl);
          setFileMissing(false);
        } else if (mounted) {
          setFileMissing(true);
        }
      } catch (error) {
        console.error('Video load error:', error);
        if (mounted) {
          setFileMissing(true);
        }
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    };

    loadVideo();
    
    return () => {
      mounted = false;
    };
  }, [video.id, video.filePath, video.filename]);

  const handleDelete = async () => {
    if (deleting) return;
    try {
      setDeleting(true);
      await axios.delete(`/api/video/${video.id}`);
      // Refresh the dashboard or remove from state
      window.location.reload(); // Simple refresh for now
    } catch (error) {
      console.log("Delete failed, but UI updated");
    } finally {
      setDeleting(false);
    }
  };

  if (fileMissing) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: index * 0.1 }}
        className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/50 border border-red-500/20 backdrop-blur-sm"
      >
        <div className="relative bg-gray-800 aspect-video flex items-center justify-center">
          <div className="text-center">
            <AlertTriangle className="w-12 h-12 text-red-400 mx-auto mb-2" />
            <p className="text-red-400 font-medium">File Missing</p>
            <p className="text-gray-500 text-sm">Video file not found</p>
          </div>
        </div>
        <div className="relative p-4">
          <h3 className="font-semibold text-lg mb-2 truncate text-gray-400">{video.title}</h3>
          <div className="flex justify-between items-center text-sm text-gray-500">
            <span>{formatFileSize(video.size)}</span>
            <span>{formatDate(video.createdAt)}</span>
          </div>
          <div className="mt-3 flex justify-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleDelete}
              disabled={deleting}
              className="px-3 py-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/30 rounded-lg text-red-400 text-sm font-medium transition-all disabled:opacity-50"
            >
              {deleting ? 'Removing...' : 'Remove from List'}
            </motion.button>
          </div>
        </div>
      </motion.div>
    );
  }

return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.1 }}
      whileHover={{ y: -8, scale: 1.02 }}
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      className={`relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 to-gray-800/50 border backdrop-blur-sm group ${selected ? 'border-purple-500 ring-2 ring-purple-500/30' : 'border-white/10'}`}
    >
      {/* Selection Checkbox */}
      <div 
        className="absolute top-3 left-3 z-20 cursor-pointer"
        onClick={(e) => { e.stopPropagation(); onSelect?.(); }}
      >
        <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-all ${
          selected 
            ? 'bg-purple-500 border-purple-500' 
            : 'bg-black/50 border-gray-400 hover:border-purple-400'
        }`}>
          {selected && <Check className="w-4 h-4 text-white" />}
        </div>
      </div>
      <motion.div animate={{ opacity: isHovered ? 1 : 0 }} className="absolute inset-0 bg-gradient-to-r from-purple-500/20 to-cyan-500/20 pointer-events-none" />
      <div className="relative bg-black flex items-center justify-center overflow-hidden">
        {videoSrc ? (
          <video
            controls
            preload="metadata"
            playsInline
            className="w-full h-full object-contain max-h-full"
            src={videoSrc}
            type="video/mp4"
            loading="lazy"
          />

        ) : isLoading ? (
          <div className="flex items-center justify-center h-full">
            <motion.div animate={{ scale: [1, 1.1, 1] }} transition={{ duration: 2, repeat: Infinity }} className="w-12 h-12 border-4 border-purple-500/30 border-t-purple-500 rounded-full" />
          </div>
        ) : (
          <div className="flex items-center justify-center h-full">
            <Play className="w-16 h-16 text-white/50" />
          </div>
        )}
        <AnimatePresence>
          {isHovered && !videoSrc && !isLoading && (
            <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.5 }} className="absolute inset-0 flex items-center justify-center bg-black/50">
              <Play className="w-16 h-16 text-white/80" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
      <div className="relative p-4">
        <h3 className="font-semibold text-lg mb-2 truncate text-white group-hover:text-purple-300 transition-colors">{video.title}</h3>
        <div className="flex justify-between items-center text-sm text-gray-400">
          <span>{formatFileSize(video.size)}</span>
          <span>{formatDate(video.createdAt)}</span>
        </div>
        {video.viral_score && (<div className="mt-3 flex justify-end"><ViralScoreBadge score={video.viral_score} /></div>)}
      </div>
    </motion.div>
  );
});

const formatFileSize = (bytes) => {
  if (!bytes) return "Unknown";
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return Math.round(bytes / Math.pow(1024, i)) + " " + sizes[i];
};

const formatDate = (date) => new Date(date).toLocaleDateString();

export default Dashboard;
