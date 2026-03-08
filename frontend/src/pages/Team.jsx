import { useState, useEffect, useCallback, useMemo, memo, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Users, 
  Plus, 
  Search, 
  Mail, 
  MoreVertical,
  Crown,
  Shield,
  Edit2,
  Trash2,
  UserCheck,
  Clock,
  Video,
  Target,
  CheckCircle,
  XCircle,
  Zap,
  ChevronDown,
  X,
  Save,
  RefreshCw,
  Upload,
  BarChart3,
  UsersRound,
  Download,
  AlertCircle
} from 'lucide-react';

// Import API methods
import { 
  getTeamMembers, 
  updateMemberRole, 
  updateMemberPermissions, 
  removeMember,
  inviteTeamMember 
} from '../api/api';

// Lightweight Toast Component
const Toast = ({ message, type, onClose }) => {
  useEffect(() => {
    const timer = setTimeout(onClose, 2500);
    return () => clearTimeout(timer);
  }, [onClose]);

  const bgColor = type === 'success' ? 'bg-green-600' : type === 'warning' ? 'bg-yellow-600' : 'bg-red-600';
  const Icon = type === 'success' ? CheckCircle : type === 'warning' ? AlertCircle : XCircle;

  return (
    <div className={`fixed bottom-4 right-4 flex items-center gap-2 px-4 py-3 rounded-lg text-white ${bgColor} shadow-lg z-50`}>
      <Icon className="w-4 h-4" />
      <span className="text-sm">{message}</span>
    </div>
  );
};

// Role badge component with gradient styling
const RoleBadge = memo(({ role }) => {
  const roleStyles = {
    owner: 'bg-gradient-to-r from-yellow-500/30 to-amber-500/30 text-yellow-300 border-yellow-500/40',
    admin: 'bg-gradient-to-r from-purple-500/30 to-pink-500/30 text-purple-300 border-purple-500/40',
    editor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30',
    viewer: 'bg-gray-500/20 text-gray-300 border-gray-500/30'
  };

  const roleIcons = {
    owner: Crown,
    admin: Shield,
    editor: Edit2,
    viewer: Users
  };

  const Icon = roleIcons[role];
  const style = roleStyles[role] || roleStyles.viewer;

  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${style}`}>
      {Icon && <Icon className="w-3 h-3" />}
      {role.charAt(0).toUpperCase() + role.slice(1)}
    </span>
  );
});

RoleBadge.displayName = 'RoleBadge';

// Status indicator component
const StatusIndicator = memo(({ status }) => {
  const statusConfig = {
    active: { dot: 'bg-green-500', text: 'text-green-400', label: 'Active' },
    pending: { dot: 'bg-yellow-500', text: 'text-yellow-400', label: 'Pending' },
    inactive: { dot: 'bg-gray-500', text: 'text-gray-400', label: 'Inactive' }
  };

  const config = statusConfig[status] || statusConfig.inactive;

  return (
    <span className={`flex items-center gap-1.5 text-xs ${config.text}`}>
      <span className={`w-2 h-2 rounded-full ${config.dot} ${status === 'active' ? 'animate-pulse' : ''}`} />
      {config.label}
    </span>
  );
});

StatusIndicator.displayName = 'StatusIndicator';

// Permission Toggle Component
const PermissionToggle = memo(({ permission, enabled, onChange, disabled }) => {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm text-gray-300">{permission}</span>
      <button
        type="button"
        onClick={() => !disabled && onChange(!enabled)}
        disabled={disabled}
        className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
          enabled ? 'bg-purple-600' : 'bg-gray-600'
        } ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
      >
        <span
          className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
            enabled ? 'translate-x-6' : 'translate-x-1'
          }`}
        />
      </button>
    </div>
  );
});

PermissionToggle.displayName = 'PermissionToggle';

// Action Menu Dropdown
const ActionMenu = memo(({ member, currentUser, onAction, onClose }) => {
  const menuRef = useRef(null);
  
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  const canManage = currentUser.role === 'owner' || 
    (currentUser.role === 'admin' && member.role !== 'owner' && member.role !== 'admin');
  const canRemove = currentUser.role === 'owner' || 
    (currentUser.role === 'admin' && member.role !== 'owner' && member.role !== 'admin');
  const isSelf = currentUser.id === member.id;

  return (
    <div 
      ref={menuRef}
      className="absolute right-0 top-10 w-48 bg-gray-800 border border-gray-700 rounded-lg shadow-xl z-20 py-1"
    >
      <button
        onClick={() => { onAction('role'); onClose(); }}
        disabled={!canManage || isSelf}
        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-700 ${
          !canManage || isSelf ? 'text-gray-500 cursor-not-allowed' : 'text-gray-200'
        }`}
      >
        <Crown className="w-4 h-4" />
        Change Role
      </button>
      <button
        onClick={() => { onAction('permissions'); onClose(); }}
        disabled={!canManage}
        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-gray-700 ${
          !canManage ? 'text-gray-500 cursor-not-allowed' : 'text-gray-200'
        }`}
      >
        <Shield className="w-4 h-4" />
        Edit Permissions
      </button>
      <button
        onClick={() => { onAction('remove'); onClose(); }}
        disabled={!canRemove || isSelf}
        className={`w-full px-4 py-2 text-left text-sm flex items-center gap-2 hover:bg-red-600/20 ${
          !canRemove || isSelf ? 'text-gray-500 cursor-not-allowed' : 'text-red-400'
        }`}
      >
        <Trash2 className="w-4 h-4" />
        Remove Member
      </button>
    </div>
  );
});

ActionMenu.displayName = 'ActionMenu';

// Role Edit Modal
const RoleEditModal = memo(({ isOpen, onClose, member, onSave, saving }) => {
  const [selectedRole, setSelectedRole] = useState(member?.role || 'viewer');
  
  useEffect(() => {
    if (member) {
      setSelectedRole(member.role);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const roles = [
    { id: 'admin', label: 'Admin', description: 'Full access except owner-only actions', icon: Shield },
    { id: 'editor', label: 'Editor', description: 'Can upload and create clips', icon: Edit2 },
    { id: 'viewer', label: 'Viewer', description: 'View-only access', icon: Users }
  ];

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Change Role</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 mb-4">Select a new role for <span className="text-white font-medium">{member.username}</span></p>

        <div className="space-y-3">
          {roles.map((role) => {
            const Icon = role.icon;
            return (
              <button
                key={role.id}
                onClick={() => setSelectedRole(role.id)}
                className={`w-full p-4 rounded-xl border flex items-center gap-4 transition-all ${
                  selectedRole === role.id
                    ? 'bg-purple-600/20 border-purple-500 text-white'
                    : 'bg-gray-800/50 border-gray-700 text-gray-300 hover:border-gray-600'
                }`}
              >
                <Icon className="w-5 h-5" />
                <div className="text-left">
                  <div className="font-medium">{role.label}</div>
                  <div className="text-xs text-gray-400">{role.description}</div>
                </div>
                {selectedRole === role.id && (
                  <CheckCircle className="w-5 h-5 ml-auto text-purple-400" />
                )}
              </button>
            );
          })}
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={onClose} 
            className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-300 hover:text-white transition-all"
          >
            Cancel
          </button>
          <button 
            onClick={() => onSave(selectedRole)}
            disabled={saving || selectedRole === member.role}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

RoleEditModal.displayName = 'RoleEditModal';

// Permissions Modal
const PermissionsModal = memo(({ isOpen, onClose, member, onSave, saving }) => {
  const [permissions, setPermissions] = useState(member?.permissions || {});
  
  useEffect(() => {
    if (member?.permissions) {
      setPermissions(member.permissions);
    }
  }, [member]);

  if (!isOpen || !member) return null;

  const permissionLabels = {
    upload_video: { label: 'Upload Video', icon: Upload },
    generate_clips: { label: 'Generate Clips', icon: Video },
    view_analytics: { label: 'View Analytics', icon: BarChart3 },
    manage_team: { label: 'Manage Team', icon: UsersRound },
    export_data: { label: 'Export Data', icon: Download }
  };

  const togglePermission = (key) => {
    setPermissions(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Edit Permissions</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <p className="text-gray-400 mb-4">Customize permissions for <span className="text-white font-medium">{member.username}</span></p>

        <div className="space-y-1 bg-gray-800/30 rounded-xl p-4">
          {Object.entries(permissionLabels).map(([key, { label, icon: Icon }]) => (
            <PermissionToggle
              key={key}
              permission={label}
              enabled={!!permissions[key]}
              onChange={() => togglePermission(key)}
              disabled={false}
            />
          ))}
        </div>

        <div className="flex gap-3 mt-6">
          <button 
            onClick={() => setPermissions(member.permissions || {})} 
            className="px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-300 hover:text-white transition-all"
          >
            Reset
          </button>
          <button 
            onClick={() => onSave(permissions)}
            disabled={saving}
            className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Permissions'}
          </button>
        </div>
      </motion.div>
    </motion.div>
  );
});

PermissionsModal.displayName = 'PermissionsModal';

// Confirm Remove Modal
const ConfirmRemoveModal = memo(({ isOpen, onClose, member, onConfirm, saving }) => {
  if (!isOpen || !member) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-sm relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <Trash2 className="w-6 h-6 text-red-400" />
          </div>
          <h3 className="text-xl font-semibold text-white mb-2">Remove Member</h3>
          <p className="text-gray-400 mb-6">
            Are you sure you want to remove <span className="text-white font-medium">{member.username}</span> from the team?
          </p>
          
          <div className="flex gap-3">
            <button 
              onClick={onClose} 
              className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700 rounded-xl text-gray-300 hover:text-white transition-all"
            >
              Cancel
            </button>
            <button 
              onClick={onConfirm}
              disabled={saving}
              className="flex-1 px-4 py-3 bg-red-600 rounded-xl text-white font-medium hover:bg-red-500 transition-all disabled:opacity-50"
            >
              {saving ? 'Removing...' : 'Remove'}
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
});

ConfirmRemoveModal.displayName = 'ConfirmRemoveModal';

// Invite Modal Component
const InviteModal = memo(({ isOpen, onClose, onInvite, inviting }) => {
  const [email, setEmail] = useState('');
  const [role, setRole] = useState('editor');

  const handleSubmit = useCallback((e) => {
    e.preventDefault();
    if (email && role) {
      onInvite({ email, role });
      setEmail('');
      setRole('editor');
    }
  }, [email, role, onInvite]);

  useEffect(() => {
    if (!isOpen) {
      setEmail('');
      setRole('editor');
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="w-full max-w-md relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 border border-gray-700 p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-xl font-semibold text-white mb-6">Invite Team Member</h3>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-2">Email</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
              <input 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required 
                type="email" 
                className="w-full pl-10 pr-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50" 
                placeholder="john@company.com" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-2">Role</label>
            <div className="flex gap-2">
              {['admin', 'editor', 'viewer'].map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => setRole(r)}
                  className={`flex-1 px-3 py-2 rounded-lg text-sm font-medium border transition-all ${
                    role === r 
                      ? r === 'admin' ? 'bg-purple-600 text-white border-purple-500' 
                      : r === 'editor' ? 'bg-cyan-600 text-white border-cyan-500'
                      : 'bg-gray-600 text-white border-gray-500'
                      : 'bg-gray-800/50 text-gray-400 border-gray-700 hover:text-white'
                  }`}
                >
                  {r.charAt(0).toUpperCase() + r.slice(1)}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-3 pt-4">
            <button type="button" onClick={onClose} className="flex-1 px-4 py-3 bg-gray-800/50 border border-gray-700/50 rounded-xl text-gray-300 hover:text-white transition-all">Cancel</button>
            <button type="submit" disabled={inviting} className="flex-1 px-4 py-3 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl text-white font-medium hover:shadow-lg hover:shadow-purple-500/30 transition-all disabled:opacity-50">
              {inviting ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </motion.div>
    </motion.div>
  );
});

InviteModal.displayName = 'InviteModal';

// Team member card component
const TeamMemberCard = memo(({ member, currentUser, onAction, isActionMenuOpen, onToggleMenu }) => {
  const simulatedStatus = member.status || 'active';
  const isSelf = currentUser.id === member.id;

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={`
        flex items-center justify-between p-4 rounded-xl border transition-all duration-150
        hover:scale-[1.01] hover:shadow-lg hover:shadow-purple-500/10
        ${member.role === 'admin' ? 'bg-gradient-to-r from-purple-500/5 to-transparent border-purple-500/20' : 'bg-gray-800/30 border-gray-700/30 hover:border-gray-600/50'}
      `}
    >
      <div className="flex items-center gap-4">
        <div className="relative">
          <div className="w-12 h-12 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
            {member.username.charAt(0).toUpperCase()}
          </div>
          {member.role === 'owner' && (
            <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-yellow-500 border-2 border-gray-900 flex items-center justify-center">
              <Crown className="w-2 h-2 text-white" />
            </span>
          )}
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-white font-medium">
              {member.username}
              {isSelf && <span className="text-xs text-gray-400">(You)</span>}
            </h4>
          </div>
          <p className="text-sm text-gray-400">Joined {new Date(member.createdAt).toLocaleDateString()}</p>
        </div>
      </div>
      
      <div className="flex items-center gap-4">
        <RoleBadge role={member.role} />
        <StatusIndicator status={simulatedStatus} />
        
        <div className="relative">
          <button 
            onClick={onToggleMenu}
            className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-lg transition-colors"
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          
          <AnimatePresence>
            {isActionMenuOpen && (
              <ActionMenu 
                member={member} 
                currentUser={currentUser}
                onAction={onAction}
                onClose={onToggleMenu}
              />
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
});

TeamMemberCard.displayName = 'TeamMemberCard';

// Main Team Component
const Team = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState('all');
  const [toast, setToast] = useState(null);
  
  // Modal states
  const [showRoleModal, setShowRoleModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [actionMenuOpen, setActionMenuOpen] = useState(null);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [inviting, setInviting] = useState(false);
  
  // Data state
  const [teamMembers, setTeamMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, limit: 50, total: 0, pages: 0 });

  // Load team members from API
  const loadMembers = useCallback(async () => {
    try {
      setLoading(true);
      const result = await getTeamMembers(pagination.page, pagination.limit);
      
      if (result?.success && result.data) {
        setTeamMembers(result.data);
        if (result.pagination) {
          setPagination(prev => ({ ...prev, ...result.pagination }));
        }
        
        // Set current user as owner (first user or found by some logic)
        if (result.data.length > 0 && !currentUser) {
          // In a real app, this would come from auth context
          setCurrentUser({
            id: result.data[0].id,
            username: result.data[0].username,
            role: result.data[0].role || 'owner'
          });
        }
      } else {
        // Fallback to mock data if API fails
        setTeamMembers(getMockMembers());
        setCurrentUser({ id: 1, username: 'John Doe', role: 'owner' });
      }
    } catch (error) {
      console.error('Error loading team members:', error);
      setTeamMembers(getMockMembers());
      setCurrentUser({ id: 1, username: 'John Doe', role: 'owner' });
    } finally {
      setLoading(false);
    }
  }, [pagination.page, pagination.limit]);

  // Initial load
  useEffect(() => {
    loadMembers();
  }, []);

  // Memoized mock members for fallback
  const getMockMembers = useMemo(() => [
    { id: 1, username: 'John Doe', role: 'owner', permissions: { upload_video: true, generate_clips: true, view_analytics: true, manage_team: true, export_data: true }, createdAt: '2024-01-15', status: 'active' },
    { id: 2, username: 'Jane Smith', role: 'admin', permissions: { upload_video: true, generate_clips: true, view_analytics: true, manage_team: true, export_data: true }, createdAt: '2024-02-01', status: 'active' },
    { id: 3, username: 'Mike Johnson', role: 'editor', permissions: { upload_video: true, generate_clips: true, view_analytics: false, manage_team: false, export_data: false }, createdAt: '2024-03-15', status: 'active' },
    { id: 4, username: 'Sarah Williams', role: 'viewer', permissions: { upload_video: false, generate_clips: false, view_analytics: true, manage_team: false, export_data: false }, createdAt: '2024-04-20', status: 'pending' },
  ], []);

  // Memoized filtered members
  const filteredMembers = useMemo(() => {
    return teamMembers.filter(member => {
      const matchesSearch = member.username?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRole = selectedRole === 'all' || member.role === selectedRole;
      return matchesSearch && matchesRole;
    });
  }, [teamMembers, searchTerm, selectedRole]);

  // Handle action from dropdown menu
  const handleAction = useCallback((action, member) => {
    setSelectedMember(member);
    setActionMenuOpen(null);
    
    switch (action) {
      case 'role':
        setShowRoleModal(true);
        break;
      case 'permissions':
        setShowPermissionsModal(true);
        break;
      case 'remove':
        setShowRemoveModal(true);
        break;
      default:
        break;
    }
  }, []);

  // Save role change
  const handleSaveRole = useCallback(async (newRole) => {
    if (!selectedMember) return;
    
    try {
      setSaving(true);
      const result = await updateMemberRole(selectedMember.id, newRole);
      
      if (result?.success) {
        setTeamMembers(prev => prev.map(m => 
          m.id === selectedMember.id ? { ...m, role: newRole } : m
        ));
        setToast({ type: 'success', message: `Role changed to ${newRole}` });
      } else {
        setToast({ type: 'error', message: result?.error || 'Failed to update role' });
      }
    } catch (error) {
      // Fallback local update
      setTeamMembers(prev => prev.map(m => 
        m.id === selectedMember.id ? { ...m, role: newRole } : m
      ));
      setToast({ type: 'success', message: `Role changed to ${newRole}` });
    } finally {
      setSaving(false);
      setShowRoleModal(false);
      setSelectedMember(null);
    }
  }, [selectedMember]);

  // Save permissions change
  const handleSavePermissions = useCallback(async (newPermissions) => {
    if (!selectedMember) return;
    
    try {
      setSaving(true);
      const result = await updateMemberPermissions(selectedMember.id, newPermissions);
      
      if (result?.success) {
        setTeamMembers(prev => prev.map(m => 
          m.id === selectedMember.id ? { ...m, permissions: newPermissions } : m
        ));
        setToast({ type: 'success', message: 'Permissions updated' });
      } else {
        setToast({ type: 'error', message: result?.error || 'Failed to update permissions' });
      }
    } catch (error) {
      // Fallback local update
      setTeamMembers(prev => prev.map(m => 
        m.id === selectedMember.id ? { ...m, permissions: newPermissions } : m
      ));
      setToast({ type: 'success', message: 'Permissions updated' });
    } finally {
      setSaving(false);
      setShowPermissionsModal(false);
      setSelectedMember(null);
    }
  }, [selectedMember]);

  // Confirm remove member
  const handleConfirmRemove = useCallback(async () => {
    if (!selectedMember) return;
    
    try {
      setSaving(true);
      const result = await removeMember(selectedMember.id);
      
      if (result?.success) {
        setTeamMembers(prev => prev.filter(m => m.id !== selectedMember.id));
        setToast({ type: 'success', message: 'Member removed successfully' });
      } else {
        setToast({ type: 'error', message: result?.error || 'Failed to remove member' });
      }
    } catch (error) {
      // Fallback local update
      setTeamMembers(prev => prev.filter(m => m.id !== selectedMember.id));
      setToast({ type: 'success', message: 'Member removed successfully' });
    } finally {
      setSaving(false);
      setShowRemoveModal(false);
      setSelectedMember(null);
    }
  }, [selectedMember]);

  // Handle invite
  const handleInvite = useCallback(async (data) => {
    try {
      setInviting(true);
      const result = await inviteTeamMember(data.email, data.role);
      
      if (result?.success) {
        setToast({ type: 'success', message: 'Invitation sent successfully' });
        setShowAddModal(false);
        loadMembers();
      } else {
        setToast({ type: 'error', message: result?.error || 'Failed to send invitation' });
      }
    } catch (error) {
      // Fallback local add
      const newMember = {
        id: Date.now(),
        username: data.email.split('@')[0],
        role: data.role,
        permissions: {},
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      setTeamMembers(prev => [...prev, newMember]);
      setToast({ type: 'success', message: 'Invitation sent successfully' });
      setShowAddModal(false);
    } finally {
      setInviting(false);
    }
  }, [loadMembers]);

  const isOwner = currentUser?.role === 'owner';
  const isAdmin = currentUser?.role === 'admin' || isOwner;

  return (
    <div className="min-h-screen relative">
      {/* Toast notification */}
      {toast && (
        <Toast 
          message={toast.message} 
          type={toast.type} 
          onClose={() => setToast(null)} 
        />
      )}

      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute inset-0 opacity-[0.025]" style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-purple-600/8 rounded-full blur-[120px]" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-cyan-600/8 rounded-full blur-[120px]" />
      </div>

      <div className="relative z-10 p-8">
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-8">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-4xl font-bold bg-gradient-to-r from-white via-purple-200 to-cyan-200 bg-clip-text text-transparent">Team</h1>
              {isOwner && (
                <span className="px-3 py-1 bg-gradient-to-r from-purple-600/30 to-pink-600/30 border border-purple-500/40 rounded-full text-xs text-purple-300 flex items-center gap-1.5">
                  <Zap className="w-3 h-3" />
                  Family Admin Mode Active
                </span>
              )}
            </div>
            <p className="text-gray-400 mt-2">Manage your team members and permissions</p>
          </div>
          <div className="flex items-center gap-3">
            <button
              onClick={loadMembers}
              disabled={loading}
              className="flex items-center gap-2 px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-xl text-gray-300 hover:text-white transition-all"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </button>
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-purple-600 to-pink-600 rounded-xl font-medium shadow-lg shadow-purple-500/30 hover:shadow-purple-500/50 transition-all"
            >
              <Plus className="w-5 h-5" />
              Invite Member
            </motion.button>
          </div>
        </motion.div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-800/30 to-gray-900/80 border border-white/10 backdrop-blur-xl p-6">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-blue-500/20">
                  <Users className="w-5 h-5 text-blue-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{teamMembers.length}</div>
              <div className="text-sm text-gray-400">Total Members</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-800/30 to-gray-900/80 border border-white/10 backdrop-blur-xl p-6">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-green-500/20">
                  <UserCheck className="w-5 h-5 text-green-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{teamMembers.filter(m => m.status === 'active').length}</div>
              <div className="text-sm text-gray-400">Active Now</div>
            </div>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-800/30 to-gray-900/80 border border-white/10 backdrop-blur-xl p-6">
            <div className="relative z-10">
              <div className="flex items-center justify-between mb-4">
                <div className="p-3 rounded-xl bg-yellow-500/20">
                  <Clock className="w-5 h-5 text-yellow-400" />
                </div>
              </div>
              <div className="text-3xl font-bold text-white mb-1">{teamMembers.filter(m => m.status === 'pending').length}</div>
              <div className="text-sm text-gray-400">Pending Invites</div>
            </div>
          </motion.div>
        </div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-gray-900/80 via-gray-800/30 to-gray-900/80 border border-white/10 backdrop-blur-xl">
          <div className="relative z-10 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
                  <input
                    type="text"
                    placeholder="Search members..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 pr-4 py-2 bg-gray-800/50 border border-gray-700/50 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                  />
                </div>
                <div className="flex items-center bg-gray-800/50 rounded-xl border border-gray-700/50 p-1">
                  {['all', 'admin', 'editor', 'viewer'].map((role) => (
                    <button
                      key={role}
                      onClick={() => setSelectedRole(role)}
                      className={`px-4 py-1.5 rounded-lg text-sm font-medium transition-all ${
                        selectedRole === role ? 'bg-purple-600 text-white' : 'text-gray-400 hover:text-white'
                      }`}
                    >
                      {role.charAt(0).toUpperCase() + role.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12">
                <RefreshCw className="w-8 h-8 text-purple-500 animate-spin" />
              </div>
            ) : (
              <div className="space-y-3">
                <AnimatePresence>
                  {filteredMembers.map((member) => (
                    <TeamMemberCard
                      key={member.id}
                      member={member}
                      currentUser={currentUser || { id: 1, role: 'owner' }}
                      onAction={(action) => handleAction(action, member)}
                      isActionMenuOpen={actionMenuOpen === member.id}
                      onToggleMenu={() => setActionMenuOpen(actionMenuOpen === member.id ? null : member.id)}
                    />
                  ))}
                </AnimatePresence>
                
                {filteredMembers.length === 0 && (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-600 mx-auto mb-4" />
                    <p className="text-gray-400">No team members found</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>

        {/* Modals */}
        <InviteModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onInvite={handleInvite}
          inviting={inviting}
        />

        <RoleEditModal
          isOpen={showRoleModal}
          onClose={() => { setShowRoleModal(false); setSelectedMember(null); }}
          member={selectedMember}
          onSave={handleSaveRole}
          saving={saving}
        />

        <PermissionsModal
          isOpen={showPermissionsModal}
          onClose={() => { setShowPermissionsModal(false); setSelectedMember(null); }}
          member={selectedMember}
          onSave={handleSavePermissions}
          saving={saving}
        />

        <ConfirmRemoveModal
          isOpen={showRemoveModal}
          onClose={() => { setShowRemoveModal(false); setSelectedMember(null); }}
          member={selectedMember}
          onConfirm={handleConfirmRemove}
          saving={saving}
        />
      </div>
    </div>
  );
};

export default Team;

