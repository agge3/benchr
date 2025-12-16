import * as React from "react";
import { PanelLeftIcon } from "lucide-react";
import { cn } from "~/lib/utils";
import { Button } from "~/components/ui/button";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "~/components/ui/resizable";
import { useSavedRunsContext } from "~/contexts/SavedRunsContext";
import { SavedRunsList } from "./SavedRunsList";
import type { ImperativePanelHandle } from 'react-resizable-panels';

const SANDBOX_SIDEBAR_KEYBOARD_SHORTCUT = "b";
const SANDBOX_SIDEBAR_MIN_SIZE = 10;
const SANDBOX_SIDEBAR_MAX_SIZE = 30;

type SandboxSidebarContextProps = {
  open: boolean;
  toggleSidebar: () => void;
};

const SandboxSidebarContext = React.createContext<SandboxSidebarContextProps | null>(null);

function useSandboxSidebar() {
  const context = React.useContext(SandboxSidebarContext);
  if (!context) {
    throw new Error("useSandboxSidebar must be used within a SandboxSidebarLayout.");
  }
  return context;
}

/**
 * Layout component that provides resizable sidebar functionality
 * Uses render props pattern for sidebar and content
 */
function SandboxSidebarLayout({
  defaultOpen = false,
  sidebar,
  children,
  className,
}: {
  defaultOpen?: boolean;
  sidebar: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  const sidebarPanelRef = React.useRef<ImperativePanelHandle>(null);
  const lastSizeRef = React.useRef(SANDBOX_SIDEBAR_MIN_SIZE);

  const toggleSidebar = React.useCallback(() => {
    const panel = sidebarPanelRef.current;
    if (!panel) return;

    const currentSize = panel.getSize();
    if (currentSize > 0) {
      lastSizeRef.current = currentSize;
      panel.resize(0);
    } else {
      panel.resize(Math.max(lastSizeRef.current, SANDBOX_SIDEBAR_MIN_SIZE));
    }
  }, []);

  // Keyboard shortcut (Cmd/Ctrl+B)
  React.useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === SANDBOX_SIDEBAR_KEYBOARD_SHORTCUT &&
        (event.metaKey || event.ctrlKey)
      ) {
        event.preventDefault();
        toggleSidebar();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [toggleSidebar]);

  const contextValue = React.useMemo<SandboxSidebarContextProps>(
    () => ({ open: true, toggleSidebar }),
    [toggleSidebar]
  );

  return (
    <SandboxSidebarContext.Provider value={contextValue}>
      <ResizablePanelGroup
        direction="horizontal"
        className={cn("h-full w-full", className)}
      >
        <ResizablePanel
          ref={sidebarPanelRef}
          defaultSize={defaultOpen ? SANDBOX_SIDEBAR_MIN_SIZE : 0}
          minSize={0}
          maxSize={SANDBOX_SIDEBAR_MAX_SIZE}
          collapsible
        >
          <aside className="h-full overflow-hidden bg-benchr-bg-header flex flex-col border-r border-benchr-border">
            {sidebar}
          </aside>
        </ResizablePanel>

        <ResizableHandle />

        <ResizablePanel defaultSize={100} minSize={70} className="flex flex-col">
          {children}
        </ResizablePanel>
      </ResizablePanelGroup>
    </SandboxSidebarContext.Provider>
  );
}

/**
 * Button to toggle the sidebar
 */
function SandboxSidebarTrigger({
  className,
  ...props
}: React.ComponentProps<typeof Button>) {
  const { toggleSidebar } = useSandboxSidebar();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleSidebar}
      className={cn("size-8 text-benchr-gold hover:bg-benchr-gold hover:text-benchr-text-dark", className)}
      {...props}
    >
      <PanelLeftIcon className="size-4" />
      <span className="sr-only">Toggle Sidebar</span>
    </Button>
  );
}

/**
 * Section within the sidebar
 */
function SandboxSidebarSection({
  title,
  children,
  className,
  ...props
}: React.ComponentProps<"div"> & { title: string }) {
  return (
    <div className={cn("flex flex-col flex-1 min-h-0", className)} {...props}>
      <div className="px-4 py-2 text-xs font-medium text-benchr-gold uppercase tracking-wider">
        {title}
      </div>
      <div className="flex-1 overflow-auto px-2">
        {children}
      </div>
    </div>
  );
}


/**
 * Sidebar content with file tree and saved runs sections
 */
function SandboxSidebarContent() {
  const { runs, loading, deleteRun } = useSavedRunsContext();

  return (
    <ResizablePanelGroup direction="vertical" className="h-full">
      {/* File Tree Section */}
      <ResizablePanel defaultSize={50} minSize={20}>
        <SandboxSidebarSection title="Files" className="pt-2 h-full">
          <div className="py-4 text-sm text-benchr-gold">
            File tree coming soon...
          </div>
        </SandboxSidebarSection>
      </ResizablePanel>

      <ResizableHandle />

      {/* Saved Runs Section */}
      <ResizablePanel defaultSize={50} minSize={20}>
        <SandboxSidebarSection title="Saved Runs" className="h-full">
          <SavedRunsList
            runs={runs}
            loading={loading}
            onDelete={deleteRun}
          />
        </SandboxSidebarSection>
      </ResizablePanel>
    </ResizablePanelGroup>
  );
}

export {
  SandboxSidebarLayout,
  SandboxSidebarContent,
  SandboxSidebarTrigger,
  SandboxSidebarSection,
  useSandboxSidebar,
};
