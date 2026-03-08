/**
 * OVERLORD UPLOAD HISTORY COMPONENT
 * Frontend-only upload history display
 * Non-destructive - does not modify existing upload logic
 */

import React from 'react';
import { Clock, CheckCircle, AlertCircle } from 'lucide-react';

const UploadHistory = ({ history = [] }) => {
  const getStatusIcon = (status) => {
    if (status === 'Uploaded') {
      return <CheckCircle className="w-4 h-4 text-green-400" />;
    }
    return <AlertCircle className="w-4 h-4 text-orange-400" />;
  };

  const getStatusColor = (status) => {
    if (status === 'Uploaded') {
      return 'text-green-400';
    }
    return 'text-orange-400';
  };

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="mt-6 p-4 rounded-xl bg-gray-800/30 border border-white/10">
      <div className="flex items-center gap-2 mb-4">
        <Clock className="w-4 h-4 text-purple-400" />
        <h3 className="text-white font-medium">Upload History</h3>
      </div>
      
      <div className="space-y-2 max-h-48 overflow-y-auto">
        {history.map((item) => (
          <div 
            key={item.id} 
            className="flex items-center justify-between p-3 rounded-lg bg-gray-700/20 border border-white/5"
          >
            <div className="flex-1 min-w-0">
              <p className="text-white text-sm font-medium truncate">
                {item.clipName || item.title || 'Unknown'}
              </p>
              <p className="text-gray-400 text-xs capitalize">
                {item.platform}
              </p>
            </div>
            
            <div className="flex items-center gap-2">
              <span className={`text-xs font-medium ${getStatusColor(item.status)}`}>
                {item.status}
              </span>
              {getStatusIcon(item.status)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default UploadHistory;
