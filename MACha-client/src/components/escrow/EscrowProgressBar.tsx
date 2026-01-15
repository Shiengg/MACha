'use client';

import { EscrowProgress, ProgressStepState } from '@/services/escrow.service';
import { CheckCircle2, Circle, XCircle, Clock } from 'lucide-react';

interface EscrowProgressBarProps {
  progress: EscrowProgress;
  showLabels?: boolean;
  compact?: boolean;
}

export default function EscrowProgressBar({
  progress,
  showLabels = true,
  compact = false,
}: EscrowProgressBarProps) {
  if (!progress || !progress.steps || progress.steps.length === 0) {
    return null;
  }

  const getStepIcon = (state: ProgressStepState) => {
    switch (state) {
      case 'DONE':
        return <CheckCircle2 className="w-5 h-5 text-white" />;
      case 'ACTIVE':
        return <Clock className="w-5 h-5 text-white" />;
      case 'REJECTED':
        return <XCircle className="w-5 h-5 text-white" />;
      case 'CANCELLED':
        return <XCircle className="w-5 h-5 text-white" />;
      case 'WAITING':
      default:
        return <Circle className="w-5 h-5 text-gray-400" />;
    }
  };

  const getStepColor = (state: ProgressStepState) => {
    switch (state) {
      case 'DONE':
        return 'bg-green-500 border-green-500 text-white';
      case 'ACTIVE':
        return 'bg-blue-500 border-blue-500 text-white';
      case 'REJECTED':
        return 'bg-red-500 border-red-500 text-white';
      case 'CANCELLED':
        return 'bg-gray-400 border-gray-400 text-white';
      case 'WAITING':
      default:
        return 'bg-gray-200 border-gray-300 text-gray-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-400';
    }
  };

  const getStepTextColor = (state: ProgressStepState) => {
    switch (state) {
      case 'DONE':
        return 'text-green-600 dark:text-green-400';
      case 'ACTIVE':
        return 'text-blue-600 dark:text-blue-400 font-semibold';
      case 'REJECTED':
        return 'text-red-600 dark:text-red-400';
      case 'CANCELLED':
        return 'text-gray-500 dark:text-gray-400';
      case 'WAITING':
      default:
        return 'text-gray-500 dark:text-gray-400';
    }
  };

  const getActiveStepLabel = () => {
    const activeStep = progress.steps.find(step => step.state === 'ACTIVE');
    if (activeStep) {
      return activeStep.label;
    }
    const rejectedStep = progress.steps.find(step => step.state === 'REJECTED');
    if (rejectedStep) {
      return `${rejectedStep.label} (Đã từ chối)`;
    }
    return null;
  };

  const activeLabel = getActiveStepLabel();

  if (compact) {
    // Compact horizontal progress bar
    return (
      <div className="w-full">
        {activeLabel && (
          <p className="text-sm font-medium text-blue-600 dark:text-blue-400 mb-2">
            {activeLabel}
          </p>
        )}
        <div className="flex items-center gap-2">
          {progress.steps.map((step, index) => (
            <div key={step.key} className="flex-1 flex flex-col items-center">
              <div
                className={`w-full h-2 rounded-full transition-all ${
                  step.state === 'DONE'
                    ? 'bg-green-500'
                    : step.state === 'ACTIVE'
                    ? 'bg-blue-500'
                    : step.state === 'REJECTED'
                    ? 'bg-red-500'
                    : 'bg-gray-200 dark:bg-gray-700'
                }`}
              />
              {showLabels && (
                <p
                  className={`text-xs mt-1 text-center ${
                    step.state === 'ACTIVE'
                      ? 'font-semibold text-blue-600 dark:text-blue-400'
                      : step.state === 'DONE'
                      ? 'text-green-600 dark:text-green-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {step.label}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Full timeline view
  return (
    <div className="w-full">
      {activeLabel && (
        <div className="mb-6 p-3 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
          <p className="text-sm font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
            <Clock className="w-4 h-4 flex-shrink-0" />
            <span>{activeLabel}</span>
          </p>
        </div>
      )}

      <div className="relative">
        {/* Steps */}
        <div className="relative space-y-6">
          {progress.steps.map((step, index) => (
            <div key={step.key} className="flex items-start gap-4 relative">
              {/* Icon */}
              <div
                className={`relative z-10 flex-shrink-0 w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all ${getStepColor(
                  step.state
                )}`}
              >
                {getStepIcon(step.state)}
              </div>

              {/* Content */}
              <div className="flex-1 pt-1.5">
                <p
                  className={`text-sm font-medium ${getStepTextColor(step.state)}`}
                >
                  {step.label}
                </p>
                {step.state === 'ACTIVE' && progress.metadata && (
                  <div className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    {step.key === 'community_voting' &&
                      progress.metadata.voting_end_date && (
                        <span>
                          Kết thúc:{' '}
                          {new Date(
                            progress.metadata.voting_end_date
                          ).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    {step.key === 'admin_review' &&
                      progress.metadata.admin_reviewed_at && (
                        <span>
                          Đã duyệt:{' '}
                          {new Date(
                            progress.metadata.admin_reviewed_at
                          ).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                    {step.key === 'owner_disbursement' &&
                      progress.metadata.released_at && (
                        <span>
                          Đã giải ngân:{' '}
                          {new Date(
                            progress.metadata.released_at
                          ).toLocaleDateString('vi-VN', {
                            day: '2-digit',
                            month: '2-digit',
                            year: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </span>
                      )}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

