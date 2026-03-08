import React from 'react';
import { 
  Upload, 
  AudioWaveform, 
  Target, 
  Scissors, 
  TrendingUp, 
  CheckCircle,
  Loader2
} from 'lucide-react';

// Processing pipeline stages
const STAGES = [
  { id: 'upload', label: 'Upload', icon: Upload },
  { id: 'audio_analysis', label: 'Audio Analysis', icon: AudioWaveform },
  { id: 'hook_detection', label: 'Hook Detection', icon: Target },
  { id: 'clip_selection', label: 'Clip Selection', icon: Scissors },
  { id: 'viral_scoring', label: 'Viral Scoring', icon: TrendingUp },
  { id: 'completed', label: 'Completed', icon: CheckCircle },
];

// Default mock state for when backend is not available
const DEFAULT_STATE = {
  currentStage: 'completed',
  progress: 100,
  processedCount: 5,
  totalCount: 5,
  lastProcessed: '2 mins ago',
};

const AIProcessingStatus = ({ status }) => {
  // Fallback to mock state if no status provided
  const processingStatus = status || DEFAULT_STATE;

  const getStageStatus = (stageId) => {
    const stageOrder = STAGES.map(s => s.id);
    const currentIndex = stageOrder.indexOf(processingStatus.currentStage);
    const stageIndex = stageOrder.indexOf(stageId);

    if (stageIndex < currentIndex) return 'completed';
    if (stageIndex === currentIndex) return 'active';
    return 'pending';
  };

  const getProgressPercentage = () => {
    if (!processingStatus.totalCount) return 0;
    return Math.round((processingStatus.processedCount / processingStatus.totalCount) * 100);
  };

  return (
    <div className="bg-gray-800 rounded-xl p-6 mb-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-white">AI Processing Pipeline</h2>
          <p className="text-gray-400 text-sm mt-1">
            {processingStatus.currentStage === 'completed' 
              ? `All done! ${processingStatus.processedCount} videos processed`
              : `Processing ${processingStatus.processedCount || 0} of ${processingStatus.totalCount || 0} videos`
            }
          </p>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-white">{getProgressPercentage()}%</div>
          <div className="text-xs text-gray-400">Complete</div>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full bg-gray-700 rounded-full h-2 mb-6">
        <div 
          className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full transition-all duration-500"
          style={{ width: `${getProgressPercentage()}%` }}
        />
      </div>

      {/* Pipeline Stages */}
      <div className="flex items-center justify-between">
        {STAGES.map((stage, index) => {
          const status = getStageStatus(stage.id);
          const Icon = stage.icon;
          const isLast = index === STAGES.length - 1;

          return (
            <React.Fragment key={stage.id}>
              <div className="flex flex-col items-center">
                <div 
                  className={`
                    w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300
                    ${status === 'completed' ? 'bg-green-500/20 text-green-400' : ''}
                    ${status === 'active' ? 'bg-blue-500/20 text-blue-400 animate-pulse' : ''}
                    ${status === 'pending' ? 'bg-gray-700 text-gray-500' : ''}
                  `}
                >
                  {status === 'active' ? (
                    <Loader2 className="w-6 h-6 animate-spin" />
                  ) : (
                    <Icon className="w-6 h-6" />
                  )}
                </div>
                <span className={`
                  text-xs mt-2 text-center
                  ${status === 'completed' ? 'text-green-400' : ''}
                  ${status === 'active' ? 'text-blue-400' : ''}
                  ${status === 'pending' ? 'text-gray-500' : ''}
                `}>
                  {stage.label}
                </span>
              </div>
              
              {/* Connector Line */}
              {!isLast && (
                <div className={`
                  flex-1 h-0.5 mx-2 mb-6 transition-all duration-300
                  ${status === 'completed' ? 'bg-green-500' : 'bg-gray-700'}
                `} />
              )}
            </React.Fragment>
          );
        })}
      </div>

      {/* Status Footer */}
      {processingStatus.currentStage !== 'completed' && (
        <div className="mt-4 pt-4 border-t border-gray-700 flex items-center justify-between text-sm">
          <span className="text-gray-400">
            Current: <span className="text-blue-400 capitalize">{processingStatus.currentStage.replace('_', ' ')}</span>
          </span>
          <span className="text-gray-500">
            Last update: {processingStatus.lastProcessed || 'Just now'}
          </span>
        </div>
      )}
    </div>
  );
};

export default AIProcessingStatus;
