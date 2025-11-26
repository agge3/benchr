import { OverviewView } from '~/components/benchmark/results/Overview';
import { PerformanceView } from '~/components/benchmark/results/Performance';
import { BytecodeView } from '~/components/benchmark/results/Bytecode';
import { SystemView } from '~/components/benchmark/results/System';
import type { ResultView, Language } from '~/types/benchmark';

export interface ViewInfo {
  id: ResultView;
  label: string;
  description: string;
  component: React.ComponentType<any>;
}

const VIEW_CONFIGS: Record<ResultView, ViewInfo> = {
  overview: {
    id: 'overview',
    label: 'Overview',
    description: 'Key metrics and output',
    component: OverviewView,
  },
  performance: {
    id: 'performance',
    label: 'Performance',
    description: 'Detailed performance metrics',
    component: PerformanceView,
  },
  bytecode: {
    id: 'bytecode',
    label: 'Bytecode',
    description: 'Assembly/bytecode output',
    component: BytecodeView,
  },
  system: {
    id: 'system',
    label: 'System',
    description: 'System-level metrics',
    component: SystemView,
  },
};

export function getViewConfig(view: ResultView): ViewInfo | undefined {
  return VIEW_CONFIGS[view];
}

export function getAvailableViews(language: Language): ViewInfo[] {
  return Object.values(VIEW_CONFIGS);
}
