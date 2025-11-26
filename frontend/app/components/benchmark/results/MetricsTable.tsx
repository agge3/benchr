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
      <h3 className="text-sm font-medium mb-3 text-benchr-text-light">{title}</h3>
      <div className="rounded-lg border border-benchr-border overflow-hidden bg-benchr-bg-header shadow-lg">
        <table className="w-full">
          <thead>
            <tr className="bg-benchr-bg-elevated border-b border-benchr-border">
              <th className="text-left py-3 px-4 text-sm font-medium text-benchr-text-light">Metric</th>
              <th className="text-right py-3 px-4 text-sm font-medium text-benchr-text-light">Value</th>
            </tr>
          </thead>
          <tbody>
            {entries.map(([key, value]) => (
              <tr
                key={key}
                className="border-b border-benchr-border last:border-b-0 hover:bg-benchr-bg-elevated transition-colors"
              >
                <td className="py-3 px-4 text-sm text-benchr-text-muted">
                  {formatLabel(key)}
                </td>
                <td className="py-3 px-4 text-sm font-mono text-right text-benchr-text-light">
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
