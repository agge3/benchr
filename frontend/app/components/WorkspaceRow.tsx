import { useRef } from 'react';
import { EditorPanel } from '~/components/editor/EditorPanel';
import { ResultsPanel } from '~/components/benchmark/ResultsPanel';
import { useWorkspace } from '~/contexts/WorkspaceContext';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";
import type { ImperativePanelHandle } from 'react-resizable-panels';

/**
 * Reusable component representing a single workspace row
 * Contains an editor panel and results panel side by side
 * Now uses WorkspaceContext instead of prop drilling
 */
export function WorkspaceRow() {
  const { refs } = useWorkspace();
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const resultsPanelRef = useRef<ImperativePanelHandle>(null);

  const resetPanels = () => {
    editorPanelRef.current?.resize(50);
    resultsPanelRef.current?.resize(50);
  };

  return (
    <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
      <ResizablePanel ref={editorPanelRef} defaultSize={50} minSize={30}>
        <EditorPanel />
      </ResizablePanel>

      <ResizableHandle withHandle onDoubleClick={resetPanels} />

      <ResizablePanel ref={resultsPanelRef} defaultSize={50} minSize={30}>
        <ResultsPanel />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
