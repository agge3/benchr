import type { JobData } from '~/services/api';
import type { Language } from '~/types/benchmark';

interface BytecodeViewProps {
  jobData: JobData | null;
  language: Language;
}

function bytecodeToLines({bytecode}) {
	// xxx do we want to trim blank lines...? maybe not
	const lines = bytecode.split("/\r?\n/").filter(line => line.trim() != "")
	// in the bytecode view, actually have a proper text rendering component
	// that word wraps appropriately for each line, and formats nicely, with a
	// nice monocode font
	// NOTE: easier to do with lines than one giant newline separated string.
	// xxx since this is postprocessing, almost definitely better to do 
	// serverside than client side (without python), but client side works for
	// now: just expect a lines array
	// xxx look into npm app for asm syntax highlighting
	// react-syntax-highlighting seems to work.
}

export function BytecodeView({ jobData, language }: BytecodeViewProps) {
  return (
    <div className="space-y-4">
      {jobData?.result?.asm ? (
        <>
          <h3 className="text-sm font-medium text-gray-200">
            {language === 'python' ? 'Python Bytecode' : 'Assembly Output'}
          </h3>
          <div className="rounded-lg border border-gray-700 bg-[#1e1e1e] shadow-lg overflow-hidden">
            <div className="h-[600px] overflow-auto">
              <pre className="p-4 text-xs font-mono text-gray-300 leading-relaxed whitespace-pre">
                {jobData.result.asm}
              </pre>
            </div>
          </div>
          {jobData.result.metadata && (
            <p className="text-xs text-gray-500">
              Generated from: {jobData.result.metadata.compiler || jobData.result.metadata.interpreter} {jobData.result.metadata.opts || ''}
            </p>
          )}
        </>
      ) : (
        <div className="flex items-center justify-center h-64">
        </div>
      )}
    </div>
  );
}
