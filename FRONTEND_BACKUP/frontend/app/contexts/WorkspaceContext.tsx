import { createContext, useContext, useRef } from 'react';
import type { ReactNode } from 'react';
import { useEditor } from '~/hooks/UseEditor';
import { useBenchmark } from '~/hooks/UseBenchmark';
import { useWebSocket } from '~/hooks/useWebSocket';
import type { WebSocketHook } from '~/hooks/useWebSocket';
import type { ImperativePanelHandle } from 'react-resizable-panels';

const API_BASE_URL = 'https://www.benchr.cc';
const WS_URL = `wss://www.benchr.cc/ws`;

interface WorkspaceContextValue {
  id: string;
  editor: ReturnType<typeof useEditor>;
  benchmark: ReturnType<typeof useBenchmark>;
  refs: {
    editor: React.RefObject<ImperativePanelHandle>;
    results: React.RefObject<ImperativePanelHandle>;
  };
  ws: WebSocketHook;
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null);

interface WorkspaceProviderProps {
  id: string;
  children: ReactNode;
}

export function WorkspaceProvider({ id, children }: WorkspaceProviderProps) {
  const editor = useEditor();
  const ws = useWebSocket(WS_URL);
  const benchmark = useBenchmark(editor.editor, ws);

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
    ws,
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
