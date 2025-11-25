import { useState } from 'react';
import type { EditorConfig, Language } from '~/types/benchmark';
import { LANGUAGE_CONFIGS } from '~/constants/benchmark';

/**
 * Custom hook to manage editor state and handlers
 * Encapsulates all editor-related logic
 */
export function useEditor() {
  const [editor, setEditor] = useState<EditorConfig>({
    code: LANGUAGE_CONFIGS.python.defaultCode,
    language: 'python',
    compiler: LANGUAGE_CONFIGS.python.compiler,
    opts: LANGUAGE_CONFIGS.python.opts
  });

  const handleLanguageChange = (newLang: Language) => {
    const config = LANGUAGE_CONFIGS[newLang];
    setEditor({
      code: config.defaultCode,
      language: newLang,
      compiler: config.compiler,
      opts: config.opts
    });
  };

  const handleCodeChange = (code: string) => {
    setEditor(prev => ({ ...prev, code }));
  };

  return {
    editor,
    handleLanguageChange,
    handleCodeChange
  };
}
