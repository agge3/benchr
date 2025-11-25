export interface CompilerInfo {
  id: string;
  name: string;
  lang: string;
  compilerType: string;
  semver: string;
  instructionSet?: string;
}

export interface CompileOptions {
  userArguments: string;
  compilerOptions: {
    skipAsm?: boolean;
    executorRequest?: boolean;
  };
  filters: {
    binary?: boolean;
    execute?: boolean;
    intel?: boolean;
    demangle?: boolean;
    labels?: boolean;
    directives?: boolean;
    commentOnly?: boolean;
    trim?: boolean;
  };
  tools?: Array<{
    id: string;
    args?: string;
  }>;
  libraries?: Array<{
    id: string;
    version: string;
  }>;
}

export interface CompileResult {
  code: number;
  stdout: Array<{ text: string }>;
  stderr: Array<{ text: string }>;
  asm?: Array<{
    text: string;
    source?: { line: number; file: string | null };
  }>;
  execResult?: {
    code: number;
    stdout: string;
    stderr: string;
    execTime: string;
  };
}

class GodboltService {
  private baseUrl = 'https://godbolt.org/api';

  async getCompilers(language: string): Promise<CompilerInfo[]> {
    const response = await fetch(`${this.baseUrl}/compilers/${language}`);
    if (!response.ok) throw new Error('Failed to fetch compilers');
    return response.json();
  }

  async compile(
    compiler: string,
    source: string,
    options: CompileOptions
  ): Promise<CompileResult> {
    const response = await fetch(`${this.baseUrl}/compiler/${compiler}/compile`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json'
      },
      body: JSON.stringify({
        source,
        options,
        lang: compiler.includes('python') ? 'python' : 'c++',
        allowStoreCodeDebug: true
      })
    });

    if (!response.ok) throw new Error('Compilation failed');
    return response.json();
  }

  async getLibraries(language: string): Promise<any[]> {
    const response = await fetch(`${this.baseUrl}/libraries/${language}`);
    if (!response.ok) throw new Error('Failed to fetch libraries');
    return response.json();
  }

  async format(source: string, base: 'Google' | 'LLVM' | 'Mozilla' | 'Chromium' | 'WebKit' = 'Google'): Promise<string> {
    const response = await fetch(`${this.baseUrl}/format/clangformat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        source,
        base
      })
    });

    if (!response.ok) throw new Error('Formatting failed');
    const result = await response.json();
    return result.answer;
  }
}

export const godboltService = new GodboltService();
