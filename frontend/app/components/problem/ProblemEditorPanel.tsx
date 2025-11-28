import { CodeEditor } from '~/components/editor/CodeEditor';
import { LanguageSelector } from '~/components/editor/LanguageSelector';
import { useProblem } from '~/contexts/ProblemContext';
import type { Language } from '~/types/benchmark';

// Only show languages that have starter code for problems
const PROBLEM_LANGUAGE_OPTIONS = [
  { id: 'python' as Language, label: 'Python' },
  { id: 'c' as Language, label: 'C' },
  { id: 'cpp' as Language, label: 'C++' },
];

export function ProblemEditorPanel() {
  const { code, language, setCode, setLanguage } = useProblem();

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header with Language Selector */}
      <div className="px-2 sm:px-4 py-2 bg-benchr-bg-header flex items-center justify-between rounded-lg border border-benchr-border shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-benchr-gold-accent whitespace-nowrap">
          Code Editor
        </h2>
        <div className="flex items-center gap-2">
          <LanguageSelector
            languages={PROBLEM_LANGUAGE_OPTIONS}
            currentLanguage={language}
            onLanguageChange={setLanguage}
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden rounded-lg border border-benchr-border shadow-xl">
        <CodeEditor
          value={code}
          onChange={setCode}
          language={language}
          theme="vs-dark"
        />
      </div>
    </div>
  );
}
