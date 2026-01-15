import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';

const EscrowProgressBar = ({ progress, compact = false }) => {
  if (!progress || !progress.steps || progress.steps.length === 0) {
    return null;
  }

  const getStepIcon = (state) => {
    switch (state) {
      case 'DONE':
        return <MaterialCommunityIcons name="check-circle" size={20} color="#10B981" />;
      case 'ACTIVE':
        return <MaterialCommunityIcons name="clock-outline" size={20} color="#3B82F6" />;
      case 'REJECTED':
        return <MaterialCommunityIcons name="close-circle" size={20} color="#EF4444" />;
      case 'CANCELLED':
        return <MaterialCommunityIcons name="close-circle" size={20} color="#9CA3AF" />;
      case 'WAITING':
      default:
        return <MaterialCommunityIcons name="circle-outline" size={20} color="#D1D5DB" />;
    }
  };

  const getStepColor = (state) => {
    switch (state) {
      case 'DONE':
        return { color: '#10B981', bg: '#D1FAE5' };
      case 'ACTIVE':
        return { color: '#3B82F6', bg: '#DBEAFE', fontWeight: 'bold' };
      case 'REJECTED':
        return { color: '#EF4444', bg: '#FEE2E2' };
      case 'CANCELLED':
        return { color: '#9CA3AF', bg: '#F3F4F6' };
      case 'WAITING':
      default:
        return { color: '#9CA3AF', bg: '#F3F4F6' };
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
      <View style={styles.compactContainer}>
        {activeLabel && (
          <Text style={styles.activeLabel}>{activeLabel}</Text>
        )}
        <View style={styles.compactProgressBar}>
          {progress.steps.map((step, index) => {
            const stepColor = getStepColor(step.state);
            return (
              <View key={step.key} style={styles.compactStep}>
                <View
                  style={[
                    styles.compactStepBar,
                    { backgroundColor: stepColor.color }
                  ]}
                />
                <Text
                  style={[
                    styles.compactStepLabel,
                    step.state === 'ACTIVE' && styles.compactStepLabelActive
                  ]}
                >
                  {step.label}
                </Text>
              </View>
            );
          })}
        </View>
      </View>
    );
  }

  // Full timeline view
  return (
    <View style={styles.container}>
      {activeLabel && (
        <View style={styles.activeLabelContainer}>
          <MaterialCommunityIcons name="clock-outline" size={16} color="#3B82F6" />
          <Text style={styles.activeLabelText}>{activeLabel}</Text>
        </View>
      )}

      <View style={styles.timelineContainer}>
        {/* Progress line */}
        <View style={styles.progressLine}>
          {progress.steps.map((step, index) => {
            if (index === 0) return null;
            const prevStep = progress.steps[index - 1];
            const isCompleted = step.state === 'DONE';
            const isActive = step.state === 'ACTIVE';
            const isRejected = step.state === 'REJECTED';

            const lineColor = prevStep?.state === 'DONE'
              ? '#10B981'
              : isActive || isRejected
              ? '#3B82F6'
              : '#E5E7EB';

            return (
              <View
                key={`line-${step.key}`}
                style={[
                  styles.progressLineSegment,
                  { backgroundColor: lineColor }
                ]}
              />
            );
          })}
        </View>

        {/* Steps */}
        <View style={styles.stepsContainer}>
          {progress.steps.map((step, index) => {
            const stepColor = getStepColor(step.state);
            return (
              <View key={step.key} style={styles.stepRow}>
                {/* Icon */}
                <View
                  style={[
                    styles.stepIcon,
                    { backgroundColor: stepColor.bg, borderColor: stepColor.color }
                  ]}
                >
                  {getStepIcon(step.state)}
                </View>

                {/* Content */}
                <View style={styles.stepContent}>
                  <Text
                    style={[
                      styles.stepLabel,
                      { color: stepColor.color },
                      step.state === 'ACTIVE' && styles.stepLabelActive
                    ]}
                  >
                    {step.label}
                  </Text>
                  {step.state === 'ACTIVE' && progress.metadata && (
                    <Text style={styles.stepMetadata}>
                      {step.key === 'community_voting' &&
                        progress.metadata.voting_end_date && (
                          `Kết thúc: ${new Date(progress.metadata.voting_end_date).toLocaleDateString('vi-VN')}`
                        )}
                      {step.key === 'admin_review' &&
                        progress.metadata.admin_reviewed_at && (
                          `Đã duyệt: ${new Date(progress.metadata.admin_reviewed_at).toLocaleDateString('vi-VN')}`
                        )}
                      {step.key === 'owner_disbursement' &&
                        progress.metadata.released_at && (
                          `Đã giải ngân: ${new Date(progress.metadata.released_at).toLocaleDateString('vi-VN')}`
                        )}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  activeLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 12,
    backgroundColor: '#DBEAFE',
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  activeLabelText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1E40AF',
  },
  timelineContainer: {
    position: 'relative',
  },
  progressLine: {
    position: 'absolute',
    left: 20,
    top: 0,
    bottom: 0,
    width: 2,
    flexDirection: 'column',
  },
  progressLineSegment: {
    flex: 1,
    width: 2,
  },
  stepsContainer: {
    paddingLeft: 8,
  },
  stepRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  stepIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  stepContent: {
    flex: 1,
    paddingTop: 4,
  },
  stepLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  stepLabelActive: {
    fontWeight: '700',
  },
  stepMetadata: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  compactContainer: {
    width: '100%',
  },
  compactProgressBar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  compactStep: {
    flex: 1,
    alignItems: 'center',
  },
  compactStepBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
  },
  compactStepLabel: {
    fontSize: 10,
    color: '#6B7280',
    marginTop: 4,
    textAlign: 'center',
  },
  compactStepLabelActive: {
    fontWeight: '700',
    color: '#3B82F6',
  },
  activeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#3B82F6',
    marginBottom: 8,
  },
});

export default EscrowProgressBar;

