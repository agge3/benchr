interface MetricProps {
  label: string;
  value: string | number;
}

/**
 * Metric display component
 */
export function Metric({ label, value }: MetricProps) {
  return (
    <div className="bg-benchr-bg-elevated rounded p-3 border border-benchr-border">
      <div className="text-xs text-benchr-text-muted mb-1">{label}</div>
      <div className="text-base font-semibold text-benchr-text-light font-mono">
        {value}
      </div>
    </div>
  );
}
