import { Text, View } from 'react-native';

import {
  getGpsFreshness,
  GPS_FRESHNESS_LABEL,
  type GpsFreshness,
} from '../lib/liveGpsStatus';

const styles: Record<GpsFreshness, { bg: string; text: string; dot: string }> = {
  live: { bg: 'bg-emerald-500/20', text: 'text-emerald-400', dot: 'bg-emerald-400' },
  stale: { bg: 'bg-amber-500/25', text: 'text-amber-300', dot: 'bg-amber-400' },
  offline: { bg: 'bg-slate-600/30', text: 'text-slate-400', dot: 'bg-slate-500' },
};

export function GpsStatusBadge({
  updatedAt,
  compact,
}: {
  updatedAt: string | null | undefined;
  compact?: boolean;
}) {
  const freshness = getGpsFreshness(updatedAt);
  const s = styles[freshness];

  return (
    <View className={`flex-row items-center rounded-full px-2.5 py-1 ${s.bg}`}>
      <View className={`mr-1.5 h-2 w-2 rounded-full ${s.dot}`} />
      <Text className={`${compact ? 'text-[10px]' : 'text-xs'} font-bold uppercase ${s.text}`}>
        {GPS_FRESHNESS_LABEL[freshness]}
      </Text>
    </View>
  );
}
