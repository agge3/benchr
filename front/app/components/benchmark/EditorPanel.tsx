import Editor from '@monaco-editor/react';
import { ClientOnly } from '~/components/ClientOnly';
import { LanguageSelector } from './LanguageSelector';
import type { Language } from '~/types/benchmark';
import { LANGUAGE_OPTIONS } from '~/constants/benchmark';

interface EditorPanelProps {
  code: string;
  language: Language;
  onCodeChange: (code: string) => void;
  onLanguageChange: (lang: Language) => void;
}

export function EditorPanel({
  code,
  language,
  onCodeChange,
  onLanguageChange,
}: EditorPanelProps) {
  return (
    <div className="flex flex-col h-full gap-2">
      <div className="px-2 sm:px-4 py-2 bg-[#252526] flex items-center justify-between rounded-lg border border-gray-700 shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-[#d4a04c] whitespace-nowrap">Code Editor</h2>
        <div className="flex items-center gap-2">
          <LanguageSelector
            languages={LANGUAGE_OPTIONS}
            currentLanguage={language}
            onLanguageChange={onLanguageChange}
          />
        </div>
      </div>
      <div className="flex-1 overflow-hidden rounded-lg border border-gray-700 shadow-xl">
        <div className="h-full bg-[#1e1e1e] pt-1">
          <ClientOnly
            fallback={
              <div className="flex items-center justify-center h-full text-gray-300">
                Loading editor...
              </div>
            }
          >
            {() => (
              <Editor
                height="100%"
                language={language}
                value={code}
                onChange={(value) => onCodeChange(value || '')}
                theme="vs-dark"
                options={{
                  minimap: { enabled: false },
                  fontSize: 14,
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                  automaticLayout: true,
                }}
              />
            )}
          </ClientOnly>
        </div>
      </div>
    </div>
  );
}
