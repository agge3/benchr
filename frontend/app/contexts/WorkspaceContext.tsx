import { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { useEditor } from '~/hooks/UseEditor';
import { useBenchmark } from '~/hooks/UseBenchmark';
import type { ImperativePanelHandle } from 'react-resizable-panels';

interface WorkspaceContextValue {
  id: string;
  editor: ReturnType<typeof useEditor>;
  benchmark: ReturnType<typeof useBenchmark>;
  refs: {
    editor: React.RefObject<ImperativePanelHandle>;
    results: React.RefObject<ImperativePanelHandle>;
  };
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  id: string;
  children: ReactNode;
}

export function WorkspaceProvider({ id, children }: WorkspaceProviderProps) {
  const editor = useEditor();
  const benchmark = useBenchmark(editor.editor);
  const editorRef = useRef<ImperativePanelHandle>(null);
  const resultsRef = useRef<ImperativePanelHandle>(null);

  const value: WorkspaceContextValue = {
    id,
    editor,
    benchmark,
    refs: {
      editor: editorRef,
      results: resultsRef,
    },
  };

  return (
    <WorkspaceContext.Provider value={value}>
      {children}
    </WorkspaceContext.Provider>
  );
}

export function useWorkspace() {
  const context = useContext(WorkspaceContext);
  if (!context) {
    throw new Error('useWorkspace must be used within WorkspaceProvider');
  }
  return context;
}
