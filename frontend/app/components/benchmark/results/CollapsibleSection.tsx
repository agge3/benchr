import { useState } from 'react';

interface CollapsibleSectionProps {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

/**
 * Collapsible section component for organizing result details
 */
export function CollapsibleSection({ title, children, defaultOpen = true }: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border border-benchr-border rounded-lg overflow-hidden bg-benchr-bg-header">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full px-4 py-3 bg-benchr-bg-elevated hover:bg-benchr-bg-elevated/80 flex items-center justify-between font-medium text-benchr-text-light transition-colors"
      >
        <span className="text-sm">{title}</span>
        <span className="text-benchr-text-muted">{isOpen ? '−' : '+'}</span>
      </button>
      {isOpen && (
        <div className="p-4">
          {children}
        </div>
      )}
    </div>
  );
}
