interface MetricsTableProps {
  title: string;
  data: Record<string, any>;
  formatLabel?: (key: string) => string;
  formatValue?: (value: any) => string;
}

/**
 * Reusable table component for displaying key-value metric data
 * Handles dynamic data with consistent styling
 */
export function MetricsTable({ 
  title, 
  data, 
  formatLabel = (key) => key,
  formatValue = (val) => String(val)
}: MetricsTableProps) {
  const entries = Object.entries(data);

  if (entries.length === 0) {
    return null;
  }

  return (
    <div>
      <h3 className="text-sm font-medium mb-3 text-gray-200">{title}</h3>
      <div className="rounded-lg border border-gray-700 overflow-hidden bg-[#252526] shadow-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-[#2a2d2e] border-b border-gray-700">
              <th className="text-left py-3 px-4 text-sm font-medium text-gray-300">Metric</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-gray-300">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value]) => (
              <tr 
                key={key} 
                className="border-b border-gray-700 last:border-b-0 hover:bg-[#2a2d2e] transition-colors"
              >
                <td className="py-3 px-4 text-sm text-gray-400">
                  {formatLabel(key)}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right text-gray-200">
                  {formatValue(value)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
