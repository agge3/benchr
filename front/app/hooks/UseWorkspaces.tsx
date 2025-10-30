import { useRef } from 'react';
import { useEditor } from '~/hooks/UseEditor';
import { useBenchmark } from '~/hooks/UseBenchmark';
import type { ImperativePanelHandle } from 'react-resizable-panels';

export interface Workspace {
  id: string;
  editor: ReturnType<typeof useEditor>;
  benchmark: ReturnType<typeof useBenchmark>;
  refs: {
    editor: React.RefObject<ImperativePanelHandle>;
    results: React.RefObject<ImperativePanelHandle>;
  };
}

/**
 * Custom hook to manage multiple workspaces for comparison mode
 * Each workspace has its own editor, benchmark state, and panel refs
 */
export function useWorkspaces(count: number = 2): Workspace[] {
  // Create workspaces array
  const workspaces: Workspace[] = [];
  
  for (let i = 0; i < count; i++) {
    const editor = useEditor();
    const benchmark = useBenchmark(editor.editor);
    
    workspaces.push({
      id: `workspace-${i + 1}`,
      editor,
      benchmark,
      refs: {
        editor: useRef<ImperativePanelHandle>(null),
        results: useRef<ImperativePanelHandle>(null),
      },
    });
  }
  
  return workspaces;
}
