import { useState, useRef } from 'react';
import { Header } from '~/components/layout/Header';
import { Footer } from '~/components/layout/Footer';
 import { EditorPanel } from '~/components/editor/EditorPanel';
import { ResultsPanel } from '~/components/benchmark/ResultsPanel';
import { WorkspaceRow } from '~/components/WorkspaceRow';
import { WorkspaceProvider, useWorkspace } from '~/contexts/WorkspaceContext';
import { ErrorBoundary } from '~/components/ui/ErrorBoundary';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";
import type { ImperativePanelHandle } from 'react-resizable-panels';

// Helper component to access workspace context in single view
function SingleViewLayout({ onToggleCompare }: { onToggleCompare: () => void }) {
  const workspace = useWorkspace();
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const resultsPanelRef = useRef<ImperativePanelHandle>(null);

  const resetHorizontalPanels = () => {
    editorPanelRef.current?.resize(50);
    resultsPanelRef.current?.resize(50);
  };

  return (
    <>
      <Header
        onRunBenchmark={workspace.benchmark.handleRunBenchmark}
        loading={workspace.benchmark.loading}
        compareMode={false}
        onToggleCompare={onToggleCompare}
      />

      <div className="flex-1 min-h-0 p-4 overflow-hidden">
        <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
          <ResizablePanel ref={editorPanelRef} defaultSize={50} minSize={30}>
            <EditorPanel />
          </ResizablePanel>

          <ResizableHandle withHandle onDoubleClick={resetHorizontalPanels} />

          <ResizablePanel ref={resultsPanelRef} defaultSize={50} minSize={30}>
            <ResultsPanel />
          </ResizablePanel>
        </ResizablePanelGroup>
      </div>
    </>
  );
}

// Component to wrap each workspace and expose its context
function WorkspaceItem({ 
  index, 
  onRegister 
}: { 
  index: number;
  onRegister: (context: ReturnType<typeof useWorkspace>) => void;
}) {
  const workspace = useWorkspace();
  
  // Register this workspace with parent on mount
  useState(() => {
    onRegister(workspace);
  });

  return <WorkspaceRow />;
}

// Compare mode layout with multiple workspaces
function CompareViewLayout({ 
  workspaceCount,
  onToggleCompare 
}: { 
  workspaceCount: number;
  onToggleCompare: () => void;
}) {
  const [loadingBoth, setLoadingBoth] = useState(false);
  const rowRefs = useRef<(ImperativePanelHandle | null)[]>([]);
  const workspaceRefs = useRef<ReturnType<typeof useWorkspace>[]>([]);

  const resetVerticalPanels = () => {
    rowRefs.current.forEach(ref => ref?.resize(50));
  };

  const handleRunBoth = async () => {
    setLoadingBoth(true);
    try {
      await Promise.all(
        workspaceRefs.current.map(ws => ws.benchmark.handleRunBenchmark())
      );
    } finally {
      setLoadingBoth(false);
    }
  };

  const registerWorkspace = (index: number) => (ws: ReturnType<typeof useWorkspace>) => {
    workspaceRefs.current[index] = ws;
  };

  return (
    <>
      <Header
        onRunBoth={handleRunBoth}
        loadingBoth={loadingBoth}
        compareMode={true}
        onToggleCompare={onToggleCompare}
      />

      <div className="flex-1 min-h-0 p-4 overflow-hidden">
        <ResizablePanelGroup direction="vertical" className="h-full gap-4">
          {Array.from({ length: workspaceCount }).map((_, index) => (
            <>
              <ResizablePanel
                key={`workspace-${index}`}
                ref={(el) => (rowRefs.current[index] = el)}
                defaultSize={50}
                minSize={30}
              >
                <WorkspaceProvider id={`workspace-${index + 1}`}>
                  <WorkspaceItem 
                    index={index} 
                    onRegister={registerWorkspace(index)} 
                  />
                </WorkspaceProvider>
              </ResizablePanel>

              {index < workspaceCount - 1 && (
                <ResizableHandle withHandle onDoubleClick={resetVerticalPanels} />
              )}
            </>
          ))}
        </ResizablePanelGroup>
      </div>
    </>
  );
}

export default function Home() {
  const [compareMode, setCompareMode] = useState(false);
  const [workspaceCount] = useState(2);

  return (
    <ErrorBoundary>
      <div className="h-screen flex flex-col bg-[#1e1e1e]">
        {!compareMode ? (
          <WorkspaceProvider id="workspace-1">
            <SingleViewLayout onToggleCompare={() => setCompareMode(true)} />
          </WorkspaceProvider>
        ) : (
          <CompareViewLayout 
            workspaceCount={workspaceCount}
            onToggleCompare={() => setCompareMode(false)}
          />
        )}

        <Footer />
      </div>
    </ErrorBoundary>
  );
}
