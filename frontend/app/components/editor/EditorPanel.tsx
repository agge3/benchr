import { CodeEditor } from '~/components/editor/CodeEditor';
import { LanguageSelector } from '~/components/editor/LanguageSelector';
import { LANGUAGE_OPTIONS } from '~/constants/benchmark';
import { useWorkspace } from '~/contexts/WorkspaceContext';

export function EditorPanel() {
  const { editor } = useWorkspace();

  return (
    <div className="flex flex-col h-full gap-2">
      {/* Header with Language Selector */}
      <div className="px-2 sm:px-4 py-2 bg-benchr-bg-header flex items-center justify-between rounded-lg border border-benchr-border shadow-lg">
        <h2 className="text-xs sm:text-sm font-medium text-benchr-gold-accent whitespace-nowrap">
          Code Editor
        </h2>
        <div className="flex items-center gap-2">
          <LanguageSelector
            languages={LANGUAGE_OPTIONS}
            currentLanguage={editor.editor.language}
            onLanguageChange={editor.handleLanguageChange}
          />
        </div>
      </div>

      {/* Editor */}
      <div className="flex-1 overflow-hidden rounded-lg border border-benchr-border shadow-xl">
        <CodeEditor
          value={editor.editor.code}
          onChange={editor.handleCodeChange}
          language={editor.editor.language}
          theme="vs-dark"
        />
      </div>
    </div>
  );
}
