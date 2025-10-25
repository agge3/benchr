import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Menu, Play, Columns2, Grid2x2, X, User, Settings as SettingsIcon, ChevronRight } from 'lucide-react';
import { ClientOnly } from '~/components/ClientOnly';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '~/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '~/components/ui/card';
import { Button } from '~/components/ui/button';
import { Input } from '~/components/ui/input';
import { Label } from '~/components/ui/label';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '~/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '~/components/ui/dialog';

type Language = 'cpp' | 'python';
type EditorMode = 'single' | 'dual';
type PerformanceTab = 'perf' | 'vmstat' | 'iostat';

interface EditorState {
  code: string;
  language: Language;
}

interface User {
  id: number;
  username: string;
  email: string;
}

interface SavedRun {
  id: number;
  name: string;
  timestamp: string;
  editorMode: EditorMode;
  editor1: EditorState;
  editor2?: EditorState;
  perfData1?: PerformanceData;
  perfData2?: PerformanceData;
}

// Database schema types
interface PerfMetrics {
  id: number;
  snapshot_id: number;
  cpu_cycles: number;
  instructions: number;
  cache_references: number;
  cache_misses: number;
  branch_misses: number;
}

interface VmstatMetrics {
  id: number;
  snapshot_id: number;
  procs_running: number;
  procs_blocked: number;
  memory_free_kb: number;
  memory_used_kb: number;
  swap_used_kb: number;
  io_blocks_in: number;
  io_blocks_out: number;
  cpu_user_percent: number;
  cpu_system_percent: number;
  cpu_idle_percent: number;
}

interface IostatMetrics {
  id: number;
  snapshot_id: number;
  device: string;
  total_reads: number;
  total_writes: number;
  read_kb_per_sec: number;
  write_kb_per_sec: number;
  cpu_util: number;
  cpu_idle: number;
  await_ms: number;
}

interface MetricSnapshot {
  id: number;
  code_program_id: number;
  timestamp: string;
  notes: string | null;
  perf_metrics: PerfMetrics;
  vmstat_metrics: VmstatMetrics;
  iostat_metrics: IostatMetrics;
}

interface PerformanceData {
  snapshot: MetricSnapshot;
}

const DEFAULT_CODE: Record<Language, string> = {
  python: '# Write your Python code here\nprint("Hello, Benchr!")',
  cpp: '// Write your C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, Benchr!" << std::endl;\n    return 0;\n}'
};

// Validation functions
const validateEmail = (email: string): string | null => {
  if (!email) return 'Email is required';
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) return 'Invalid email format';
  return null;
};

const validateUsername = (username: string): string | null => {
  if (!username) return 'Username is required';
  if (username.length < 3) return 'Username must be at least 3 characters';
  if (username.length > 20) return 'Username must be less than 20 characters';
  if (!/^[a-zA-Z0-9_]+$/.test(username)) return 'Username can only contain letters, numbers, and underscores';
  return null;
};

const validatePassword = (password: string): string | null => {
  if (!password) return 'Password is required';
  if (password.length < 8) return 'Password must be at least 8 characters';
  if (!/[A-Z]/.test(password)) return 'Password must contain at least one uppercase letter';
  if (!/[a-z]/.test(password)) return 'Password must contain at least one lowercase letter';
  if (!/[0-9]/.test(password)) return 'Password must contain at least one number';
  return null;
};

// Simulated API calls
const fetchPerformanceStats = async (code: string, language: Language): Promise<PerformanceData> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const snapshotId = Math.floor(Math.random() * 1000);
  const codeProgramId = Math.floor(Math.random() * 100);
  
  return {
    snapshot: {
      id: snapshotId,
      code_program_id: codeProgramId,
      timestamp: new Date().toISOString(),
      notes: null,
      perf_metrics: {
        id: Math.floor(Math.random() * 1000),
        snapshot_id: snapshotId,
        cpu_cycles: Math.floor(Math.random() * 10000000 + 5000000),
        instructions: Math.floor(Math.random() * 5000000 + 2000000),
        cache_references: Math.floor(Math.random() * 500000 + 100000),
        cache_misses: Math.floor(Math.random() * 50000 + 10000),
        branch_misses: Math.floor(Math.random() * 20000 + 5000),
      },
      vmstat_metrics: {
        id: Math.floor(Math.random() * 1000),
        snapshot_id: snapshotId,
        procs_running: Math.floor(Math.random() * 5 + 1),
        procs_blocked: Math.floor(Math.random() * 3),
        memory_free_kb: Math.floor(Math.random() * 2048000 + 1024000),
        memory_used_kb: Math.floor(Math.random() * 4096000 + 2048000),
        swap_used_kb: Math.floor(Math.random() * 512000),
        io_blocks_in: Math.floor(Math.random() * 10000 + 1000),
        io_blocks_out: Math.floor(Math.random() * 8000 + 800),
        cpu_user_percent: Math.random() * 60 + 20,
        cpu_system_percent: Math.random() * 20 + 5,
        cpu_idle_percent: Math.random() * 50 + 10,
      },
      iostat_metrics: {
        id: Math.floor(Math.random() * 1000),
        snapshot_id: snapshotId,
        device: language === 'python' ? '/dev/sda' : '/dev/nvme0n1',
        total_reads: Math.random() * 100000 + 50000,
        total_writes: Math.random() * 80000 + 40000,
        read_kb_per_sec: Math.random() * 150 + 50,
        write_kb_per_sec: Math.random() * 120 + 40,
        cpu_util: Math.random() * 80 + 10,
        cpu_idle: Math.random() * 50 + 30,
        await_ms: Math.random() * 10 + 1,
      },
    },
  };
};

const mockLogin = async (email: string, password: string): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    id: 1,
    username: 'testuser',
    email: email
  };
};

const mockSignup = async (username: string, email: string, password: string): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return {
    id: 1,
    username: username,
    email: email
  };
};

const mockUpdateProfile = async (user: User): Promise<User> => {
  await new Promise(resolve => setTimeout(resolve, 500));
  return user;
};

// Auth Modal Component
const AuthModal: React.FC<{
  isOpen: boolean;
  onSuccess: (user: User) => void;
}> = ({ isOpen, onSuccess }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!isLogin) {
      const usernameError = validateUsername(username);
      if (usernameError) newErrors.username = usernameError;
    }

    const emailError = validateEmail(email);
    if (emailError) newErrors.email = emailError;

    const passwordError = validatePassword(password);
    if (passwordError) newErrors.password = passwordError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const user = isLogin 
        ? await mockLogin(email, password)
        : await mockSignup(username, email, password);
      onSuccess(user);
    } catch (error) {
      setErrors({ general: 'Authentication failed. Please try again.' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onInteractOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle>{isLogin ? 'Welcome to Benchr' : 'Create Account'}</DialogTitle>
          <DialogDescription>
            {isLogin ? 'Sign in to continue' : 'Sign up to get started'}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div className="space-y-2">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value);
                  setErrors({ ...errors, username: '' });
                }}
                placeholder="johndoe"
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                setErrors({ ...errors, email: '' });
              }}
              placeholder="you@example.com"
            />
            {errors.email && (
              <p className="text-sm text-destructive">{errors.email}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value);
                setErrors({ ...errors, password: '' });
              }}
              placeholder="••••••••"
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password}</p>
            )}
          </div>
          {errors.general && (
            <p className="text-sm text-destructive">{errors.general}</p>
          )}
          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Loading...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </Button>
          <div className="text-center text-sm">
            <button
              type="button"
              onClick={() => {
                setIsLogin(!isLogin);
                setErrors({});
              }}
              className="text-primary hover:underline"
            >
              {isLogin ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Side Panel Component
const SidePanel: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (user: User) => void;
  savedRuns: SavedRun[];
  onLoadRun: (run: SavedRun, editorNum?: 1 | 2) => void;
  currentEditorMode: EditorMode;
}> = ({ isOpen, onClose, user, onUpdateUser, savedRuns, onLoadRun, currentEditorMode }) => {
  const [activeTab, setActiveTab] = useState<'runs' | 'settings'>('runs');
  const [editedUser, setEditedUser] = useState(user);
  const [newPassword, setNewPassword] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);

  const handleSaveProfile = async () => {
    const newErrors: Record<string, string> = {};

    const usernameError = validateUsername(editedUser.username);
    if (usernameError) newErrors.username = usernameError;

    const emailError = validateEmail(editedUser.email);
    if (emailError) newErrors.email = emailError;

    if (newPassword) {
      const passwordError = validatePassword(newPassword);
      if (passwordError) newErrors.password = passwordError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    try {
      const updated = await mockUpdateProfile(editedUser);
      onUpdateUser(updated);
      setNewPassword('');
      setErrors({});
    } catch (error) {
      setErrors({ general: 'Failed to update profile' });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent side="left" className="w-80 p-0 flex flex-col">
        <SheetHeader className="p-4 border-b">
          <SheetTitle>Menu</SheetTitle>
        </SheetHeader>
        
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'runs' | 'settings')} className="flex-1 flex flex-col">
          <TabsList className="mx-4 mt-2">
            <TabsTrigger value="runs" className="flex-1">Saved Runs</TabsTrigger>
            <TabsTrigger value="settings" className="flex-1">Settings</TabsTrigger>
          </TabsList>

          <TabsContent value="runs" className="flex-1 overflow-auto p-4 space-y-2">
            {savedRuns.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No saved runs yet</p>
            ) : (
              savedRuns.map((run) => (
                <Card key={run.id} className="p-3">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium">{run.name}</h3>
                      <p className="text-xs text-muted-foreground">
                        {new Date(run.timestamp).toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {run.editorMode === 'single' ? '1 Editor' : '2 Editors'}
                      </p>
                    </div>
                    <div className="flex gap-1">
                      {run.editorMode === 'single' || currentEditorMode === 'single' ? (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => onLoadRun(run)}
                        >
                          Load
                        </Button>
                      ) : (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onLoadRun(run, 1)}
                            className="w-8 h-8 p-0"
                          >
                            1
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onLoadRun(run, 2)}
                            className="w-8 h-8 p-0"
                          >
                            2
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </TabsContent>

          <TabsContent value="settings" className="flex-1 overflow-auto p-4 space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-username">Username</Label>
              <Input
                id="edit-username"
                value={editedUser.username}
                onChange={(e) => {
                  setEditedUser({ ...editedUser, username: e.target.value });
                  setErrors({ ...errors, username: '' });
                }}
              />
              {errors.username && (
                <p className="text-sm text-destructive">{errors.username}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-email">Email</Label>
              <Input
                id="edit-email"
                type="email"
                value={editedUser.email}
                onChange={(e) => {
                  setEditedUser({ ...editedUser, email: e.target.value });
                  setErrors({ ...errors, email: '' });
                }}
              />
              {errors.email && (
                <p className="text-sm text-destructive">{errors.email}</p>
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="new-password">New Password (optional)</Label>
              <Input
                id="new-password"
                type="password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setErrors({ ...errors, password: '' });
                }}
                placeholder="Leave blank to keep current"
              />
              {errors.password && (
                <p className="text-sm text-destructive">{errors.password}</p>
              )}
            </div>
            {errors.general && (
              <p className="text-sm text-destructive">{errors.general}</p>
            )}
            <Button onClick={handleSaveProfile} className="w-full" disabled={isLoading}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Button>
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

// Reusable Editor Component
const CodeEditor: React.FC<{
  editorState: EditorState;
  onCodeChange: (code: string) => void;
  onLanguageChange: (lang: Language) => void;
  title: string;
}> = ({ editorState, onCodeChange, onLanguageChange, title }) => (
  <div className="h-full flex flex-col">
    <div className="px-4 py-2 border-b border-border bg-muted/50 flex items-center justify-between">
      <h2 className="text-sm font-medium text-foreground">{title}</h2>
      <div className="flex items-center gap-2 bg-background rounded-md p-0.5 border border-border">
        <button
          onClick={() => onLanguageChange('python')}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            editorState.language === 'python'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          Python
        </button>
        <button
          onClick={() => onLanguageChange('cpp')}
          className={`px-2 py-1 text-xs font-medium rounded transition-colors ${
            editorState.language === 'cpp'
              ? 'bg-primary text-primary-foreground'
              : 'text-muted-foreground hover:text-foreground'
          }`}
        >
          C++
        </button>
      </div>
    </div>
    <div className="flex-1 overflow-hidden">
      <ClientOnly
        fallback={
          <div className="flex items-center justify-center h-full text-muted-foreground">
            Loading editor...
          </div>
        }
      >
        {() => (
          <Editor
            height="100%"
            language={editorState.language}
            value={editorState.code}
            onChange={(value) => onCodeChange(value || '')}
            theme="vs-dark"
            options={{
              minimap: { enabled: false },
              fontSize: 14,
              lineNumbers: 'on',
              scrollBeyondLastLine: false,
              automaticLayout: true,
            }}
          />
        )}
      </ClientOnly>
    </div>
  </div>
);

// Reusable Performance Panel Component
const PerformancePanel: React.FC<{
  data: PerformanceData | null;
  title: string;
  loading: boolean;
}> = ({ data, title, loading }) => {
  const [activeTab, setActiveTab] = useState<PerformanceTab>('perf');

  const formatNumber = (num: number) => num.toLocaleString();
  const formatBytes = (kb: number) => {
    if (kb > 1024 * 1024) return `${(kb / (1024 * 1024)).toFixed(2)} GB`;
    if (kb > 1024) return `${(kb / 1024).toFixed(2)} MB`;
    return `${kb.toFixed(2)} KB`;
  };

  return (
    <div className="h-full flex flex-col">
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PerformanceTab)} className="h-full flex flex-col">
        <div className="px-4 py-2 border-b border-border bg-muted/50">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-medium text-foreground">{title}</h2>
            <TabsList className="h-8">
              <TabsTrigger value="perf" className="text-xs">perf</TabsTrigger>
              <TabsTrigger value="vmstat" className="text-xs">vmstat</TabsTrigger>
              <TabsTrigger value="iostat" className="text-xs">iostat</TabsTrigger>
            </TabsList>
          </div>
        </div>
        
        <div className="flex-1 overflow-auto p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-center space-y-2">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
                <p className="text-sm text-muted-foreground">Running benchmark...</p>
              </div>
            </div>
          ) : !data ? (
            <div className="flex items-center justify-center h-full">
              <p className="text-sm text-muted-foreground">Run a benchmark to see results</p>
            </div>
          ) : (
            <>
              <TabsContent value="perf" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Performance Counters</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Snapshot #{data.snapshot.id} • {new Date(data.snapshot.timestamp).toLocaleString()}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CPU Cycles:</span>
                      <span className="font-medium">{formatNumber(data.snapshot.perf_metrics.cpu_cycles)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Instructions:</span>
                      <span className="font-medium">{formatNumber(data.snapshot.perf_metrics.instructions)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cache References:</span>
                      <span className="font-medium">{formatNumber(data.snapshot.perf_metrics.cache_references)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cache Misses:</span>
                      <span className="font-medium">{formatNumber(data.snapshot.perf_metrics.cache_misses)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Branch Misses:</span>
                      <span className="font-medium">{formatNumber(data.snapshot.perf_metrics.branch_misses)}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vmstat" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Virtual Memory Statistics</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Snapshot #{data.snapshot.id} • {new Date(data.snapshot.timestamp).toLocaleString()}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Procs Running:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.procs_running}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Procs Blocked:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.procs_blocked}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Memory Free:</span>
                      <span className="font-medium">{formatBytes(data.snapshot.vmstat_metrics.memory_free_kb)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Memory Used:</span>
                      <span className="font-medium">{formatBytes(data.snapshot.vmstat_metrics.memory_used_kb)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Swap Used:</span>
                      <span className="font-medium">{formatBytes(data.snapshot.vmstat_metrics.swap_used_kb)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">I/O Blocks In:</span>
                      <span className="font-medium">{formatNumber(data.snapshot.vmstat_metrics.io_blocks_in)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">I/O Blocks Out:</span>
                      <span className="font-medium">{formatNumber(data.snapshot.vmstat_metrics.io_blocks_out)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CPU User:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.cpu_user_percent.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CPU System:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.cpu_system_percent.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CPU Idle:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.cpu_idle_percent.toFixed(2)}%</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="iostat" className="mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">I/O Statistics</CardTitle>
                    <p className="text-xs text-muted-foreground">
                      Snapshot #{data.snapshot.id} • {new Date(data.snapshot.timestamp).toLocaleString()}
                    </p>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Device:</span>
                      <span className="font-medium font-mono">{data.snapshot.iostat_metrics.device}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Reads:</span>
                      <span className="font-medium">{formatNumber(Math.floor(data.snapshot.iostat_metrics.total_reads))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Writes:</span>
                      <span className="font-medium">{formatNumber(Math.floor(data.snapshot.iostat_metrics.total_writes))}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Read KB/s:</span>
                      <span className="font-medium">{data.snapshot.iostat_metrics.read_kb_per_sec.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Write KB/s:</span>
                      <span className="font-medium">{data.snapshot.iostat_metrics.write_kb_per_sec.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CPU Utilization:</span>
                      <span className="font-medium">{data.snapshot.iostat_metrics.cpu_util.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CPU Idle:</span>
                      <span className="font-medium">{data.snapshot.iostat_metrics.cpu_idle.toFixed(2)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Await (ms):</span>
                      <span className="font-medium">{data.snapshot.iostat_metrics.await_ms.toFixed(2)}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </>
          )}
        </div>
      </Tabs>
    </div>
  );
};

export default function BenchrLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [isPanelOpen, setIsPanelOpen] = useState(false);
  const [editorMode, setEditorMode] = useState<EditorMode>('single');
  const [loading1, setLoading1] = useState(false);
  const [loading2, setLoading2] = useState(false);
  
  const [editor1, setEditor1] = useState<EditorState>({
    code: DEFAULT_CODE.python,
    language: 'python'
  });
  
  const [editor2, setEditor2] = useState<EditorState>({
    code: DEFAULT_CODE.python,
    language: 'python'
  });

  const [perfData1, setPerfData1] = useState<PerformanceData | null>(null);
  const [perfData2, setPerfData2] = useState<PerformanceData | null>(null);

  // Mock saved runs
  const [savedRuns] = useState<SavedRun[]>([
    {
      id: 1,
      name: 'Quick Sort Benchmark',
      timestamp: new Date(Date.now() - 86400000).toISOString(),
      editorMode: 'single',
      editor1: { code: DEFAULT_CODE.python, language: 'python' }
    },
    {
      id: 2,
      name: 'Bubble vs Quick Sort',
      timestamp: new Date(Date.now() - 172800000).toISOString(),
      editorMode: 'dual',
      editor1: { code: DEFAULT_CODE.python, language: 'python' },
      editor2: { code: DEFAULT_CODE.cpp, language: 'cpp' }
    }
  ]);

  const handleLanguageChange = (editor: 1 | 2, newLang: Language) => {
    const newCode = DEFAULT_CODE[newLang];
    if (editor === 1) {
      setEditor1({ code: newCode, language: newLang });
    } else {
      setEditor2({ code: newCode, language: newLang });
    }
  };

  const handleRunBenchmark = async () => {
    if (editorMode === 'single') {
      setLoading1(true);
      const data = await fetchPerformanceStats(editor1.code, editor1.language);
      setPerfData1(data);
      setLoading1(false);
    } else {
      setLoading1(true);
      setLoading2(true);
      const [data1, data2] = await Promise.all([
        fetchPerformanceStats(editor1.code, editor1.language),
        fetchPerformanceStats(editor2.code, editor2.language)
      ]);
      setPerfData1(data1);
      setPerfData2(data2);
      setLoading1(false);
      setLoading2(false);
    }
  };

  const handleLoadRun = (run: SavedRun, editorNum?: 1 | 2) => {
    if (editorMode === 'single' || !editorNum) {
      setEditor1(run.editor1);
      if (run.perfData1) setPerfData1(run.perfData1);
    } else if (editorNum === 1) {
      setEditor1(run.editor1);
      if (run.perfData1) setPerfData1(run.perfData1);
    } else {
      if (run.editor2) {
        setEditor2(run.editor2);
        if (run.perfData2) setPerfData2(run.perfData2);
      }
    }
    setIsPanelOpen(false);
  };

  if (!user) {
    return <AuthModal isOpen={true} onSuccess={setUser} />;
  }

  return (
    <div className="h-screen flex flex-col bg-background">
      {/* Top Bar */}
      <header className="border-b border-border bg-card">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsPanelOpen(true)}
              className="hover:bg-muted p-1.5 rounded transition-colors"
            >
              <Menu className="h-5 w-5 text-muted-foreground" />
            </button>
            <h1 className="text-xl font-semibold">Benchr</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Editor Mode Toggle */}
            <div className="flex items-center gap-2 bg-muted rounded-md p-1">
              <button
                onClick={() => setEditorMode('single')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  editorMode === 'single'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Columns2 className="h-4 w-4" />
                Single
              </button>
              <button
                onClick={() => setEditorMode('dual')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded transition-colors ${
                  editorMode === 'dual'
                    ? 'bg-background text-foreground shadow-sm'
                    : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                <Grid2x2 className="h-4 w-4" />
                Dual
              </button>
            </div>

            <button
              onClick={handleRunBenchmark}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Play className="h-4 w-4" />
              Run Benchmark
            </button>
          </div>
        </div>
      </header>

      {/* Side Panel */}
      <SidePanel
        isOpen={isPanelOpen}
        onClose={() => setIsPanelOpen(false)}
        user={user}
        onUpdateUser={setUser}
        savedRuns={savedRuns}
        onLoadRun={handleLoadRun}
        currentEditorMode={editorMode}
      />

      {/* Main Content */}
      <div className="flex-1 overflow-hidden">
        {editorMode === 'single' ? (
          // Single Editor Mode - 2 Panel Layout
          <div className="h-full grid grid-cols-2">
            <div className="border-r border-border">
              <CodeEditor
                editorState={editor1}
                onCodeChange={(code) => setEditor1({ ...editor1, code })}
                onLanguageChange={(lang) => handleLanguageChange(1, lang)}
                title="Code Editor"
              />
            </div>
            <div>
              <PerformancePanel
                data={perfData1}
                title="Performance Results"
                loading={loading1}
              />
            </div>
          </div>
        ) : (
          // Dual Editor Mode - 4 Panel Layout
          <div className="h-full grid grid-cols-2 grid-rows-2">
            <div className="border-r border-b border-border">
              <CodeEditor
                editorState={editor1}
                onCodeChange={(code) => setEditor1({ ...editor1, code })}
                onLanguageChange={(lang) => handleLanguageChange(1, lang)}
                title="Editor 1"
              />
            </div>
            <div className="border-b border-border">
              <PerformancePanel
                data={perfData1}
                title="Performance 1"
                loading={loading1}
              />
            </div>
            <div className="border-r border-border">
              <CodeEditor
                editorState={editor2}
                onCodeChange={(code) => setEditor2({ ...editor2, code })}
                onLanguageChange={(lang) => handleLanguageChange(2, lang)}
                title="Editor 2"
              />
            </div>
            <div>
              <PerformancePanel
                data={perfData2}
                title="Performance 2"
                loading={loading2}
              />
            </div>
          </div>
        )}
      </div>

      {/* Footer Bar */}
      <footer className="border-t border-border bg-card px-4 py-2">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Logged in as {user.username}</span>
          <span>{editorMode === 'single' ? '1 Editor' : '2 Editors'} Active</span>
        </div>
      </footer>
    </div>
  );
}
