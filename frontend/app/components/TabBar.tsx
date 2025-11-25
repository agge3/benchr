import { X } from 'lucide-react';
import { Button } from './components/ui/button';
import { FileNode } from './FileExplorer';

interface TabBarProps {
  openFiles: FileNode[];
  activeFileId: string | null;
  onTabClick: (file: FileNode) => void;
  onTabClose: (fileId: string) => void;
}

export function TabBar({ openFiles, activeFileId, onTabClick, onTabClose }: TabBarProps) {
  return (
    <div className="flex items-center bg-gray-800 border-b border-gray-700 overflow-x-auto">
      {openFiles.map(file => (
        <div
          key={file.id}
          className={`flex items-center gap-2 px-3 py-2 border-r border-gray-700 cursor-pointer min-w-[120px] ${
            activeFileId === file.id
              ? 'bg-gray-900 text-white'
              : 'bg-gray-800 text-gray-400 hover:bg-gray-750'
          }`}
          onClick={() => onTabClick(file)}
        >
          <span className="text-sm truncate flex-1">{file.name}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              onTabClose(file.id);
            }}
            className="p-0 h-auto hover:bg-gray-600"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      ))}
    </div>
  );
}