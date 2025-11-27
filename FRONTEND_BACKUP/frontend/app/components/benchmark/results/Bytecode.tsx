import type { JobData } from '~/services/api';
import type { Language } from '~/types/benchmark';
import { AssemblyViewer } from './AssemblyViewer';

interface BytecodeViewProps {
  jobData: JobData | null;
  language: Language;
}

export function BytecodeView({ jobData, language }: BytecodeViewProps) {
  if (!jobData?.result?.asm) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-sm text-benchr-text-muted">No bytecode available</p>
      </div>
    );
  }

  return (
    <div className="h-full -m-6">
      <AssemblyViewer assembly={jobData.result.asm} />
    </div>
  );
}
