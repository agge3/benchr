import { useState, useEffect, useRef, useCallback } from 'react';
import { WorkspaceRow } from '~/components/WorkspaceRow';
import { WorkspaceProvider, useWorkspace } from '~/contexts/WorkspaceContext';
import { SavedRunsProvider } from '~/contexts/SavedRunsContext';
import { ErrorBoundary } from '~/components/ui/ErrorBoundary';
import {
	ResizablePanelGroup,
	ResizablePanel,
	ResizableHandle,
} from "~/components/ui/resizable";
import {
  SandboxSidebarLayout,
  SandboxSidebarContent,
} from "~/components/sandbox/SandboxSidebar";
import type { ImperativePanelHandle } from 'react-resizable-panels';

// Helper component to access workspace context in single view
function SingleViewLayout({ onToggleCompare }: { onToggleCompare: () => void }) {
	const workspace = useWorkspace();

  return (
    <div className="flex-1 min-h-0 p-4 overflow-hidden">
      <WorkspaceRow
        showToolbar={true}
        showSidebarToggle={true}
        onRunBenchmark={workspace.benchmark.handleRunBenchmark}
        loading={workspace.benchmark.loading}
        onToggleCompare={onToggleCompare}
        compareMode={false}
      />
    </div>
  );
}

// Type for the workspace context value
type WorkspaceContextType = ReturnType<typeof useWorkspace>;

// Component to wrap each workspace and expose its context
function WorkspaceItem({
  index,
  onRegister,
  showToolbar = false,
  showSidebarToggle = false,
  onToggleCompare,
  compareMode = false,
  onRunBoth,
  loadingBoth = false
}: {
  index: number;
  onRegister: (context: ReturnType<typeof useWorkspace>) => void;
  showToolbar?: boolean;
  showSidebarToggle?: boolean;
  onToggleCompare?: () => void;
  compareMode?: boolean;
  onRunBoth?: () => void;
  loadingBoth?: boolean;
}) {
	const workspace = useWorkspace();

	useEffect(() => {
		onRegister(workspace);
	}, [onRegister, workspace]);

  return (
    <WorkspaceRow
      showToolbar={showToolbar}
      showSidebarToggle={showSidebarToggle}
      onToggleCompare={onToggleCompare}
      compareMode={compareMode}
      onRunBoth={onRunBoth}
      loadingBoth={loadingBoth}
    />
  );
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
	const workspaceRefs = useRef<(WorkspaceContextType | null)[]>([]);

	const resetVerticalPanels = () => {
		rowRefs.current.forEach(ref => ref?.resize(50));
	};

	const handleRunBoth = async () => {
		setLoadingBoth(true);
		try {
			await Promise.all(
				workspaceRefs.current
					.filter((wsRef): wsRef is WorkspaceContextType => wsRef !== null)
					.map(ws => ws.benchmark.handleRunBenchmark())
			);
		} finally {
			setLoadingBoth(false);
		}
	};

	const registerWorkspace = useCallback((index: number) => (ws: WorkspaceContextType) => {
		workspaceRefs.current[index] = ws;
	}, []);

  return (
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
                  showToolbar={index === 0}
                  showSidebarToggle={index === 0}
                  onToggleCompare={onToggleCompare}
                  compareMode={true}
                  onRunBoth={handleRunBoth}
                  loadingBoth={loadingBoth}
                />
              </WorkspaceProvider>
            </ResizablePanel>

						{index < workspaceCount - 1 && (
							<ResizableHandle withHandle onDoubleClick={resetVerticalPanels} />
						)}
					</div>
				))}
			</ResizablePanelGroup>
		</div>
	);
}

export default function SandboxPage() {
	const [compareMode, setCompareMode] = useState(false);
	const [workspaceCount] = useState(2);

  return (
    <ErrorBoundary>
      <SavedRunsProvider>
        <SandboxSidebarLayout
          defaultOpen={false}
          sidebar={<SandboxSidebarContent />}
        >
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
        </SandboxSidebarLayout>
      </SavedRunsProvider>
    </ErrorBoundary>
  );
}
