import { useState, useRef } from 'react';
import { Header } from '~/components/layout/Header';
import { Footer } from '~/components/layout/Footer';
import { EditorPanel } from '~/components/benchmark/EditorPanel';
import { ResultsPanel } from '~/components/benchmark/ResultsPanel';
import { WorkspaceRow } from '~/components/benchmark/WorkspaceRow';
import { useWorkspaces } from '~/hooks/UseWorkspaces';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";
import type { ImperativePanelHandle } from 'react-resizable-panels';
import type { Workspace } from '~/hooks/UseWorkspaces';

export default function Home() {
  const [compareMode, setCompareMode] = useState(false);
  const [loadingBoth, setLoadingBoth] = useState(false);
  
  // Create workspaces (2 for comparison)
  const workspaces = useWorkspaces(2);
  const primaryWorkspace = workspaces[0];
  
  // Single view refs
  const editorPanelRef = useRef<ImperativePanelHandle>(null);
  const resultsPanelRef = useRef<ImperativePanelHandle>(null);
  
  // Compare mode row refs
  const rowRefs = useRef<(ImperativePanelHandle | null)[]>([]);

  // Reset functions
  const resetHorizontalPanels = () => {
    editorPanelRef.current?.resize(50);
    resultsPanelRef.current?.resize(50);
  };

  const resetVerticalPanels = () => {
    rowRefs.current.forEach(ref => ref?.resize(50));
  };

  const resetWorkspacePanels = (workspace: Workspace) => {
    workspace.refs.editor.current?.resize(50);
    workspace.refs.results.current?.resize(50);
  };

  // Run all benchmarks simultaneously
  const handleRunBoth = async () => {
    setLoadingBoth(true);
    try {
      await Promise.all(
        workspaces.map(ws => ws.benchmark.handleRunBenchmark())
      );
    } finally {
      setLoadingBoth(false);
    }
  };

  return (
    <div className="h-screen flex flex-col bg-[#1e1e1e]">
      <Header 
        onRunBenchmark={compareMode ? undefined : primaryWorkspace.benchmark.handleRunBenchmark}
        onRunBoth={compareMode ? handleRunBoth : undefined}
        loading={compareMode ? false : primaryWorkspace.benchmark.loading}
        loadingBoth={loadingBoth}
        compareMode={compareMode}
        onToggleCompare={() => setCompareMode(!compareMode)}
      />

      {!compareMode ? (
        // Single view: side by side with resizable panels
        <div className="flex-1 min-h-0 p-4 overflow-hidden">
          <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
            <ResizablePanel ref={editorPanelRef} defaultSize={50} minSize={30}>
              <EditorPanel
                code={primaryWorkspace.editor.editor.code}
                language={primaryWorkspace.editor.editor.language}
                onCodeChange={primaryWorkspace.editor.handleCodeChange}
                onLanguageChange={primaryWorkspace.editor.handleLanguageChange}
              />
            </ResizablePanel>
            
            <ResizableHandle withHandle onDoubleClick={resetHorizontalPanels} />
            
            <ResizablePanel ref={resultsPanelRef} defaultSize={50} minSize={30}>
              <ResultsPanel
                loading={primaryWorkspace.benchmark.loading}
                jobData={primaryWorkspace.benchmark.jobData}
                error={primaryWorkspace.benchmark.error}
                cancelled={primaryWorkspace.benchmark.cancelled}
                pollAttempts={primaryWorkspace.benchmark.pollAttempts}
                onCancel={primaryWorkspace.benchmark.handleCancel}
                language={primaryWorkspace.editor.editor.language}
              />
            </ResizablePanel>
          </ResizablePanelGroup>
        </div>
      ) : (
        // Compare view: dynamic grid with workspace rows
        <div className="flex-1 min-h-0 p-4 overflow-hidden">
          <ResizablePanelGroup direction="vertical" className="h-full gap-4">
            {workspaces.map((workspace, index) => (
              <>
                <ResizablePanel
                  key={workspace.id}
                  ref={(el) => (rowRefs.current[index] = el)}
                  defaultSize={50}
                  minSize={30}
                >
                  <WorkspaceRow
                    workspace={workspace}
                    onResetPanels={() => resetWorkspacePanels(workspace)}
                  />
                </ResizablePanel>
                
                {/* Add vertical handle between workspaces (but not after the last one) */}
                {index < workspaces.length - 1 && (
                  <ResizableHandle withHandle onDoubleClick={resetVerticalPanels} />
                )}
              </>
            ))}
          </ResizablePanelGroup>
        </div>
      )}

      <Footer />
    </div>
  );
}
