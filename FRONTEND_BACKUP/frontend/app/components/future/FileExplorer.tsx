import { useState } from 'react';
import { ChevronRight, ChevronDown, File, Folder, FolderOpen, Plus, Trash2 } from 'lucide-react';
import { Button } from './components/ui/button';

export interface FileNode {
  id: string;
  name: string;
  type: 'file' | 'folder';
  content?: string;
  children?: FileNode[];
}

interface FileExplorerProps {
  files: FileNode[];
  onFileSelect: (file: FileNode) => void;
  onFileCreate: (parentId: string | null, type: 'file' | 'folder') => void;
  onFileDelete: (fileId: string) => void;
  selectedFileId?: string;
}

export function FileExplorer({ 
  files, 
  onFileSelect, 
  onFileCreate, 
  onFileDelete,
  selectedFileId 
}: FileExplorerProps) {
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set(['root']));

  const toggleFolder = (folderId: string) => {
    setExpandedFolders(prev => {
      const next = new Set(prev);
      if (next.has(folderId)) {
        next.delete(folderId);
      } else {
        next.add(folderId);
      }
      return next;
    });
  };

  const renderNode = (node: FileNode, level: number = 0) => {
    const isExpanded = expandedFolders.has(node.id);
    const isSelected = selectedFileId === node.id;

    if (node.type === 'folder') {
      return (
        <div key={node.id}>
          <div
            className={`flex items-center gap-1 px-2 py-1 hover:bg-gray-100 cursor-pointer ${
              isSelected ? 'bg-blue-100' : ''
            }`}
            style={{ paddingLeft: `${level * 12 + 8}px` }}
          >
            <button
              onClick={() => toggleFolder(node.id)}
              className="p-0 hover:bg-transparent"
            >
              {isExpanded ? (
                <ChevronDown className="w-4 h-4" />
              ) : (
                <ChevronRight className="w-4 h-4" />
              )}
            </button>
            <div
              onClick={() => onFileSelect(node)}
              className="flex items-center gap-1 flex-1"
            >
              {isExpanded ? (
                <FolderOpen className="w-4 h-4 text-blue-500" />
              ) : (
                <Folder className="w-4 h-4 text-blue-500" />
              )}
              <span className="text-sm">{node.name}</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.stopPropagation();
                onFileDelete(node.id);
              }}
              className="opacity-0 hover:opacity-100 p-1 h-auto"
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          {isExpanded && node.children && (
            <div>
              {node.children.map(child => renderNode(child, level + 1))}
            </div>
          )}
        </div>
      );
    }

    return (
      <div
        key={node.id}
        className={`flex items-center gap-1 px-2 py-1 hover:bg-gray-100 cursor-pointer ${
          isSelected ? 'bg-blue-100' : ''
        }`}
        style={{ paddingLeft: `${level * 12 + 24}px` }}
        onClick={() => onFileSelect(node)}
      >
        <File className="w-4 h-4 text-gray-500" />
        <span className="text-sm flex-1">{node.name}</span>
        <Button
          variant="ghost"
          size="sm"
          onClick={(e) => {
            e.stopPropagation();
            onFileDelete(node.id);
          }}
          className="opacity-0 hover:opacity-100 p-1 h-auto"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>
    );
  };

  return (
    <div className="h-full bg-white border-r border-gray-200 flex flex-col">
      <div className="p-2 border-b border-gray-200 flex items-center justify-between">
        <span className="text-sm">Explorer</span>
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFileCreate(null, 'file')}
            className="p-1 h-auto"
            title="New File"
          >
            <File className="w-4 h-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onFileCreate(null, 'folder')}
            className="p-1 h-auto"
            title="New Folder"
          >
            <Folder className="w-4 h-4" />
          </Button>
        </div>
      </div>
      <div className="flex-1 overflow-y-auto">
        {files.map(node => renderNode(node, 0))}
      </div>
    </div>
  );
}