import { EditorPanel } from '~/components/benchmark/EditorPanel';
import { ResultsPanel } from '~/components/benchmark/ResultsPanel';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";
import type { Workspace } from '~/hooks/UseWorkspaces';

interface WorkspaceRowProps {
  workspace: Workspace;
  onResetPanels: () => void;
}

/**
 * Reusable component representing a single workspace row
 * Contains an editor panel and results panel side by side
 */
export function WorkspaceRow({ workspace, onResetPanels }: WorkspaceRowProps) {
  return (
    <ResizablePanelGroup direction="horizontal" className="h-full gap-4">
      <ResizablePanel ref={workspace.refs.editor} defaultSize={50} minSize={30}>
        <EditorPanel
          code={workspace.editor.editor.code}
          language={workspace.editor.editor.language}
          onCodeChange={workspace.editor.handleCodeChange}
          onLanguageChange={workspace.editor.handleLanguageChange}
        />
      </ResizablePanel>
      
      <ResizableHandle withHandle onDoubleClick={onResetPanels} />
      
      <ResizablePanel ref={workspace.refs.results} defaultSize={50} minSize={30}>
        <ResultsPanel
          loading={workspace.benchmark.loading}
          jobData={workspace.benchmark.jobData}
          error={workspace.benchmark.error}
          cancelled={workspace.benchmark.cancelled}
          pollAttempts={workspace.benchmark.pollAttempts}
          onCancel={workspace.benchmark.handleCancel}
          language={workspace.editor.editor.language}
        />
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}
