interface MetricProps {
  label: string;
  value: string | number;
}

/**
 * Metric display component
 */
export function Metric({ label, value }: MetricProps) {
  return (
    <div className="bg-[#2a2d2e] rounded p-3 border border-gray-700">
      <div className="text-xs text-gray-400 mb-1">{label}</div>
      <div className="text-base font-semibold text-gray-200 font-mono">
	    {value}
	  </div>
    </div>
  );
}
