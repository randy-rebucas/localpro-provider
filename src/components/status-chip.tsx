import { StyleSheet, Text, View, type ViewStyle } from 'react-native';

import { Status } from '@/constants/theme';

type StatusKey =
  | 'open' | 'active' | 'completed' | 'disputed' | 'withdrawn' | 'cancelled'
  | 'pending' | 'accepted' | 'rejected' | 'retracted' | 'expired'
  | 'funded' | 'released';

const STATUS_MAP: Record<StatusKey, { label: string; color: string; bg: string }> = {
  open:      { label: 'Open',      color: Status.info,    bg: Status.infoBg },
  active:    { label: 'Active',    color: Status.success, bg: Status.successBg },
  completed: { label: 'Completed', color: Status.success, bg: Status.successBg },
  disputed:  { label: 'Disputed',  color: Status.error,   bg: Status.errorBg },
  withdrawn: { label: 'Withdrawn', color: Status.warning, bg: Status.warningBg },
  cancelled: { label: 'Cancelled', color: Status.error,   bg: Status.errorBg },
  pending:   { label: 'Pending',   color: Status.pending, bg: Status.pendingBg },
  accepted:  { label: 'Accepted',  color: Status.success, bg: Status.successBg },
  rejected:  { label: 'Rejected',  color: Status.error,   bg: Status.errorBg },
  retracted: { label: 'Retracted', color: Status.warning, bg: Status.warningBg },
  expired:   { label: 'Expired',   color: Status.warning, bg: Status.warningBg },
  funded:    { label: 'Funded',    color: Status.info,    bg: Status.infoBg },
  released:  { label: 'Released',  color: Status.success, bg: Status.successBg },
};

interface StatusChipProps {
  status: StatusKey | string;
  style?: ViewStyle;
}

export function StatusChip({ status, style }: StatusChipProps) {
  const config = STATUS_MAP[status as StatusKey] ?? {
    label: status,
    color: Status.info,
    bg: Status.infoBg,
  };

  return (
    <View style={[styles.chip, { backgroundColor: config.bg }, style]}>
      <Text style={[styles.text, { color: config.color }]}>{config.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    borderRadius: 100,
    paddingHorizontal: 10,
    paddingVertical: 3,
    alignSelf: 'flex-start',
  },
  text: { fontSize: 12, fontWeight: '700' },
});
