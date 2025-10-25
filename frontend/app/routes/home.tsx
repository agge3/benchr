import React, { useState, useEffect } from 'react';
import Editor from '@monaco-editor/react';
import { Menu, Play, Columns2, Grid2x2, X, User, Settings as SettingsIcon, ChevronRight, Loader2 } from 'lucide-react';
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
import {
  BenchrAPI,
  APIError,
  type User,
  type CodeProgram,
  type MetricSnapshot,
  type ProgramWithMetrics,
} from '../lib/api-service';

type Language = 'cpp' | 'python';
type EditorMode = 'single' | 'dual';
type PerformanceTab = 'perf' | 'vmstat' | 'iostat';

interface EditorState {
  code: string;
  language: Language;
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

const validateApiKey = (apiKey: string): string | null => {
  if (!apiKey) return 'API key is required';
  if (apiKey.length < 10) return 'Invalid API key format';
  return null;
};

// Auth Modal Component
const AuthModal: React.FC<{
  isOpen: boolean;
  onSuccess: (user: User) => void;
}> = ({ isOpen, onSuccess }) => {
  const [username, setUsername] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [generalError, setGeneralError] = useState<string>('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    const usernameError = validateUsername(username);
    if (usernameError) newErrors.username = usernameError;

    const apiKeyError = validateApiKey(apiKey);
    if (apiKeyError) newErrors.apiKey = apiKeyError;

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setGeneralError('');

    try {
      // Store the API key
      BenchrAPI.auth.setApiKey(apiKey);

      // Try to fetch programs to validate the API key
      await BenchrAPI.getPrograms();

      // If successful, create user object
      const user: User = {
        id: 0, // Will be determined by backend
        username,
        email: '', // Not required for basic auth
        api_key: apiKey,
      };

      onSuccess(user);
    } catch (error) {
      if (error instanceof APIError) {
        if (error.statusCode === 401) {
          setGeneralError('Invalid API key. Please check your credentials.');
        } else {
          setGeneralError(error.message || 'Authentication failed. Please try again.');
        }
      } else {
        setGeneralError('An unexpected error occurred. Please try again.');
      }
      BenchrAPI.auth.logout();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Dialog open={isOpen}>
      <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()}>
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold">Welcome to Benchr</DialogTitle>
          <DialogDescription>
            Enter your credentials to access your benchmarking workspace
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="username">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="Enter your username"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrors({ ...errors, username: '' });
              }}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="apiKey">API Key</Label>
            <Input
              id="apiKey"
              type="password"
              placeholder="Enter your API key"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setErrors({ ...errors, apiKey: '' });
              }}
              disabled={isLoading}
            />
            {errors.apiKey && (
              <p className="text-sm text-destructive">{errors.apiKey}</p>
            )}
          </div>

          {generalError && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {generalError}
            </div>
          )}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Authenticating...
              </>
            ) : (
              'Login'
            )}
          </Button>

          <p className="text-xs text-muted-foreground text-center">
            Need an API key? Contact your administrator or check the documentation.
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// Settings Modal Component
const SettingsModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onUpdateUser: (user: User) => void;
}> = ({ isOpen, onClose, user, onUpdateUser }) => {
  const [username, setUsername] = useState(user.username);
  const [apiKey, setApiKey] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  const handleSave = async () => {
    const newErrors: Record<string, string> = {};

    if (username !== user.username) {
      const usernameError = validateUsername(username);
      if (usernameError) newErrors.username = usernameError;
    }

    if (apiKey) {
      const apiKeyError = validateApiKey(apiKey);
      if (apiKeyError) newErrors.apiKey = apiKeyError;
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setIsLoading(true);
    setSuccessMessage('');

    try {
      // If API key changed, update it
      if (apiKey) {
        BenchrAPI.auth.setApiKey(apiKey);
        // Validate new API key
        await BenchrAPI.getPrograms();
      }

      const updatedUser = { ...user, username, api_key: apiKey || user.api_key };
      onUpdateUser(updatedUser);
      setSuccessMessage('Settings updated successfully!');
      setApiKey('');
      
      setTimeout(() => {
        onClose();
        setSuccessMessage('');
      }, 1500);
    } catch (error) {
      if (error instanceof APIError) {
        setErrors({ apiKey: 'Invalid API key' });
      } else {
        setErrors({ general: 'Failed to update settings' });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogout = () => {
    BenchrAPI.auth.logout();
    window.location.reload();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Account Settings</DialogTitle>
          <DialogDescription>
            Update your account information
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="settings-username">Username</Label>
            <Input
              id="settings-username"
              type="text"
              value={username}
              onChange={(e) => {
                setUsername(e.target.value);
                setErrors({ ...errors, username: '' });
              }}
              disabled={isLoading}
            />
            {errors.username && (
              <p className="text-sm text-destructive">{errors.username}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="settings-apikey">New API Key (optional)</Label>
            <Input
              id="settings-apikey"
              type="password"
              placeholder="Leave blank to keep current"
              value={apiKey}
              onChange={(e) => {
                setApiKey(e.target.value);
                setErrors({ ...errors, apiKey: '' });
              }}
              disabled={isLoading}
            />
            {errors.apiKey && (
              <p className="text-sm text-destructive">{errors.apiKey}</p>
            )}
          </div>

          {successMessage && (
            <div className="p-3 rounded-md bg-green-500/10 text-green-600 text-sm">
              {successMessage}
            </div>
          )}

          {errors.general && (
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm">
              {errors.general}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            <Button onClick={handleSave} disabled={isLoading} className="flex-1">
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                'Save Changes'
              )}
            </Button>
            <Button onClick={handleLogout} variant="destructive" disabled={isLoading}>
              Logout
            </Button>
          </div>
        </div>
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
  const [activeSection, setActiveSection] = useState<'runs' | 'settings'>('runs');
  const [showSettings, setShowSettings] = useState(false);

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent side="left" className="w-80 p-0">
          <div className="flex flex-col h-full">
            <SheetHeader className="p-6 pb-4 border-b">
              <div className="flex items-center justify-between">
                <SheetTitle>Benchr</SheetTitle>
                <button onClick={onClose} className="hover:bg-muted p-1.5 rounded transition-colors">
                  <X className="h-4 w-4" />
                </button>
              </div>
            </SheetHeader>

            <div className="flex-1 overflow-y-auto">
              <div className="p-4 border-b">
                <button
                  onClick={() => setShowSettings(true)}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-muted transition-colors"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary text-primary-foreground">
                    <User className="h-5 w-5" />
                  </div>
                  <div className="flex-1 text-left">
                    <p className="text-sm font-medium">{user.username}</p>
                    <p className="text-xs text-muted-foreground">{user.email || 'No email set'}</p>
                  </div>
                  <SettingsIcon className="h-4 w-4 text-muted-foreground" />
                </button>
              </div>

              <div className="p-4">
                <div className="space-y-2">
                  <button
                    onClick={() => setActiveSection('runs')}
                    className={`w-full text-left px-3 py-2 rounded-md text-sm font-medium transition-colors ${
                      activeSection === 'runs'
                        ? 'bg-muted text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                    }`}
                  >
                    Saved Runs
                  </button>
                </div>
              </div>

              {activeSection === 'runs' && (
                <div className="px-4 pb-4">
                  <div className="space-y-2">
                    {savedRuns.length === 0 ? (
                      <div className="text-center py-8 text-sm text-muted-foreground">
                        No saved runs yet. Run a benchmark to get started!
                      </div>
                    ) : (
                      savedRuns.map((run) => (
                        <div
                          key={run.id}
                          className="p-3 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <h4 className="text-sm font-medium">{run.name}</h4>
                              <p className="text-xs text-muted-foreground mt-1">
                                {new Date(run.timestamp).toLocaleDateString()} •{' '}
                                {run.editorMode === 'single' ? '1' : '2'} Editor
                                {run.editorMode === 'dual' ? 's' : ''}
                              </p>
                            </div>
                            {currentEditorMode === 'dual' && run.editorMode === 'dual' ? (
                              <div className="flex gap-1 ml-2">
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onLoadRun(run, 1)}
                                  className="h-7 text-xs"
                                >
                                  Load to 1
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onLoadRun(run, 2)}
                                  className="h-7 text-xs"
                                >
                                  Load to 2
                                </Button>
                              </div>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onLoadRun(run)}
                                className="h-7 text-xs ml-2"
                              >
                                Load
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <SettingsModal
        isOpen={showSettings}
        onClose={() => setShowSettings(false)}
        user={user}
        onUpdateUser={onUpdateUser}
      />
    </>
  );
};

// Code Editor Component
const CodeEditor: React.FC<{
  editorState: EditorState;
  onCodeChange: (code: string) => void;
  onLanguageChange: (lang: Language) => void;
  title: string;
}> = ({ editorState, onCodeChange, onLanguageChange, title }) => {
  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-medium">{title}</h3>
        <div className="flex gap-1 bg-background rounded-md p-1">
          <button
            onClick={() => onLanguageChange('python')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              editorState.language === 'python'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Python
          </button>
          <button
            onClick={() => onLanguageChange('cpp')}
            className={`px-3 py-1 text-xs font-medium rounded transition-colors ${
              editorState.language === 'cpp'
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            C++
          </button>
        </div>
      </div>
      <div className="flex-1">
        <ClientOnly>
          <Editor
            height="100%"
            language={editorState.language === 'cpp' ? 'cpp' : 'python'}
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
        </ClientOnly>
      </div>
    </div>
  );
};

// Performance Panel Component
const PerformancePanel: React.FC<{
  data: PerformanceData | null;
  title: string;
  loading: boolean;
}> = ({ data, title, loading }) => {
  const [activeTab, setActiveTab] = useState<PerformanceTab>('perf');

  return (
    <div className="h-full flex flex-col bg-muted/20">
      <div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
        <h3 className="text-sm font-medium">{title}</h3>
        {loading && (
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Loader2 className="h-3 w-3 animate-spin" />
            Running benchmark...
          </div>
        )}
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as PerformanceTab)} className="flex-1 flex flex-col">
        <div className="border-b border-border bg-muted/20 px-3">
          <TabsList className="h-9">
            <TabsTrigger value="perf" className="text-xs">Perf</TabsTrigger>
            <TabsTrigger value="vmstat" className="text-xs">VMStat</TabsTrigger>
            <TabsTrigger value="iostat" className="text-xs">IOStat</TabsTrigger>
          </TabsList>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {!data && !loading && (
            <div className="flex items-center justify-center h-full text-sm text-muted-foreground">
              Run a benchmark to see results
            </div>
          )}

          {loading && (
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto mb-2 text-primary" />
                <p className="text-sm text-muted-foreground">Profiling your code...</p>
              </div>
            </div>
          )}

          {data && !loading && (
            <>
              <TabsContent value="perf" className="space-y-3 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">CPU Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">CPU Cycles:</span>
                      <span className="font-medium">{data.snapshot.perf_metrics.cpu_cycles.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Instructions:</span>
                      <span className="font-medium">{data.snapshot.perf_metrics.instructions.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">IPC:</span>
                      <span className="font-medium">
                        {(data.snapshot.perf_metrics.instructions / data.snapshot.perf_metrics.cpu_cycles).toFixed(2)}
                      </span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Cache Metrics</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cache References:</span>
                      <span className="font-medium">{data.snapshot.perf_metrics.cache_references.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Cache Misses:</span>
                      <span className="font-medium">{data.snapshot.perf_metrics.cache_misses.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Miss Rate:</span>
                      <span className="font-medium">
                        {((data.snapshot.perf_metrics.cache_misses / data.snapshot.perf_metrics.cache_references) * 100).toFixed(2)}%
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Branch Misses:</span>
                      <span className="font-medium">{data.snapshot.perf_metrics.branch_misses.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="vmstat" className="space-y-3 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Process Info</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Running:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.procs_running}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Blocked:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.procs_blocked}</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Memory Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Free Memory:</span>
                      <span className="font-medium">{(data.snapshot.vmstat_metrics.memory_free_kb / 1024).toFixed(0)} MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Used Memory:</span>
                      <span className="font-medium">{(data.snapshot.vmstat_metrics.memory_used_kb / 1024).toFixed(0)} MB</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Swap Used:</span>
                      <span className="font-medium">{(data.snapshot.vmstat_metrics.swap_used_kb / 1024).toFixed(0)} MB</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">CPU Usage</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">User:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.cpu_user_percent.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">System:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.cpu_system_percent.toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Idle:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.cpu_idle_percent.toFixed(1)}%</span>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">I/O Blocks</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Blocks In:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.io_blocks_in.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Blocks Out:</span>
                      <span className="font-medium">{data.snapshot.vmstat_metrics.io_blocks_out.toLocaleString()}</span>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="iostat" className="space-y-3 mt-0">
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Device: {data.snapshot.iostat_metrics.device}</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Reads:</span>
                      <span className="font-medium">{data.snapshot.iostat_metrics.total_reads.toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Total Writes:</span>
                      <span className="font-medium">{data.snapshot.iostat_metrics.total_writes.toFixed(0)}</span>
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
                      <span className="text-muted-foreground">CPU Util:</span>
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
  const [error, setError] = useState<string>('');

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

  // Load saved runs from API
  const [savedRuns, setSavedRuns] = useState<SavedRun[]>([]);
  const [loadingRuns, setLoadingRuns] = useState(false);

  // Load programs when user logs in
  useEffect(() => {
    if (user && BenchrAPI.auth.isAuthenticated()) {
      loadSavedRuns();
    }
  }, [user]);

  const loadSavedRuns = async () => {
    setLoadingRuns(true);
    try {
      const programs = await BenchrAPI.getPrograms();
      
      // Convert programs to SavedRun format
      const runs: SavedRun[] = programs.map((program) => ({
        id: program.id,
        name: program.name,
        timestamp: program.updated_at,
        editorMode: 'single', // You might want to store this in the backend
        editor1: {
          code: program.code_text,
          language: program.language as Language,
        },
      }));

      setSavedRuns(runs);
    } catch (error) {
      console.error('Failed to load saved runs:', error);
    } finally {
      setLoadingRuns(false);
    }
  };

  const handleLanguageChange = (editor: 1 | 2, newLang: Language) => {
    const newCode = DEFAULT_CODE[newLang];
    if (editor === 1) {
      setEditor1({ code: newCode, language: newLang });
    } else {
      setEditor2({ code: newCode, language: newLang });
    }
  };

  const handleRunBenchmark = async () => {
    setError('');

    if (editorMode === 'single') {
      setLoading1(true);
      try {
        const result = await BenchrAPI.runBenchmarkComplete(
          editor1.code,
          editor1.language,
          `Benchmark ${new Date().toLocaleString()}`
        );

        if (result.latest_snapshot) {
          setPerfData1({ snapshot: result.latest_snapshot });
        }

        // Reload saved runs to include this new one
        await loadSavedRuns();
      } catch (error) {
        if (error instanceof APIError) {
          setError(`Benchmark failed: ${error.message}`);
        } else {
          setError('An unexpected error occurred while running the benchmark');
        }
        console.error('Benchmark error:', error);
      } finally {
        setLoading1(false);
      }
    } else {
      setLoading1(true);
      setLoading2(true);

      try {
        const [result1, result2] = await Promise.all([
          BenchrAPI.runBenchmarkComplete(
            editor1.code,
            editor1.language,
            `Benchmark 1 ${new Date().toLocaleString()}`
          ),
          BenchrAPI.runBenchmarkComplete(
            editor2.code,
            editor2.language,
            `Benchmark 2 ${new Date().toLocaleString()}`
          ),
        ]);

        if (result1.latest_snapshot) {
          setPerfData1({ snapshot: result1.latest_snapshot });
        }

        if (result2.latest_snapshot) {
          setPerfData2({ snapshot: result2.latest_snapshot });
        }

        // Reload saved runs
        await loadSavedRuns();
      } catch (error) {
        if (error instanceof APIError) {
          setError(`Benchmark failed: ${error.message}`);
        } else {
          setError('An unexpected error occurred while running the benchmarks');
        }
        console.error('Benchmark error:', error);
      } finally {
        setLoading1(false);
        setLoading2(false);
      }
    }
  };

  const handleLoadRun = async (run: SavedRun, editorNum?: 1 | 2) => {
    try {
      // Fetch the full program with metrics
      const programData = await BenchrAPI.getProgramWithMetrics(run.id);

      if (editorMode === 'single' || !editorNum) {
        setEditor1({
          code: programData.program.code_text,
          language: programData.program.language as Language,
        });
        if (programData.latest_snapshot) {
          setPerfData1({ snapshot: programData.latest_snapshot });
        }
      } else if (editorNum === 1) {
        setEditor1({
          code: programData.program.code_text,
          language: programData.program.language as Language,
        });
        if (programData.latest_snapshot) {
          setPerfData1({ snapshot: programData.latest_snapshot });
        }
      } else {
        setEditor2({
          code: programData.program.code_text,
          language: programData.program.language as Language,
        });
        if (programData.latest_snapshot) {
          setPerfData2({ snapshot: programData.latest_snapshot });
        }
      }

      setIsPanelOpen(false);
    } catch (error) {
      console.error('Failed to load run:', error);
      setError('Failed to load saved run');
    }
  };

  // Check if already authenticated on mount
  useEffect(() => {
    if (BenchrAPI.auth.isAuthenticated()) {
      // Create a minimal user object
      setUser({
        id: 0,
        username: 'User',
        email: '',
        api_key: BenchrAPI.auth.getApiKey() || undefined,
      });
    }
  }, []);

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
              disabled={loading1 || loading2}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading1 || loading2 ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Running...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  Run Benchmark
                </>
              )}
            </button>
          </div>
        </div>

        {error && (
          <div className="px-4 pb-3">
            <div className="p-3 rounded-md bg-destructive/10 text-destructive text-sm flex items-center justify-between">
              <span>{error}</span>
              <button onClick={() => setError('')} className="hover:bg-destructive/20 p-1 rounded">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
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
