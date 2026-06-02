import { Text, View } from 'react-native';

import { AnimatedPressable } from './AnimatedPressable';
import { FadeInView } from './FadeInView';

export type SegmentedTab<T extends string> = {
  key: T;
  label: string;
  count: number;
};

type Props<T extends string> = {
  tabs: SegmentedTab<T>[];
  active: T;
  onChange: (key: T) => void;
  accent?: 'emerald' | 'sky' | 'orange';
};

const accents = {
  emerald: {
    activeBorder: 'border-emerald-500 bg-emerald-500/15',
    activeText: 'text-emerald-400',
    activeCount: 'text-emerald-400',
  },
  sky: {
    activeBorder: 'border-sky-500 bg-sky-500/15',
    activeText: 'text-sky-400',
    activeCount: 'text-sky-400',
  },
  orange: {
    activeBorder: 'border-orange-500 bg-orange-500/15',
    activeText: 'text-orange-400',
    activeCount: 'text-orange-400',
  },
};

export function SegmentedTabs<T extends string>({
  tabs,
  active,
  onChange,
  accent = 'emerald',
}: Props<T>) {
  const a = accents[accent];

  return (
    <FadeInView delay={120} className="mb-3 flex-row gap-2">
      {tabs.map((tab) => {
        const isActive = tab.key === active;
        return (
          <AnimatedPressable
            key={tab.key}
            className={`flex-1 items-center rounded-2xl border py-3 ${
              isActive ? a.activeBorder : 'border-servi-borde bg-servi-superficie'
            }`}
            onPress={() => onChange(tab.key)}
          >
            <Text className={`text-2xl font-black ${isActive ? a.activeCount : 'text-servi-texto'}`}>
              {tab.count}
            </Text>
            <Text
              className={`text-[10px] font-semibold uppercase ${
                isActive ? a.activeText : 'text-servi-suave'
              }`}
            >
              {tab.label}
            </Text>
          </AnimatedPressable>
        );
      })}
    </FadeInView>
  );
}
