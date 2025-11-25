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
  executeParameters?: {
    args?: string[];
    stdin?: string;
  };
}

class GodboltService {
  private baseUrl = 'https://godbolt.org/api';
  private timeout = 10000; // 10 second timeout

  async compile(
    compiler: string,
    source: string,
    options: CompileOptions,
    language: string = 'c++'
  ): Promise<CompileResult> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.timeout);

    try {
      // Special handling for assembly
      const isAssembly = language === 'assembly' || compiler.includes('nasm');
      
      const body: any = {
        source,
        options,
        lang: isAssembly ? 'assembly' : language,
        allowStoreCodeDebug: true
      };

      // For assembly, we need different options
      if (isAssembly) {
        body.options = {
          ...options,
          userArguments: options.userArguments || '-f elf64',
          compilerOptions: {
            ...options.compilerOptions,
            executorRequest: true,
            skipAsm: false
          },
          filters: {
            ...options.filters,
            binary: true,
            execute: true,
            labels: false,
            directives: false
          }
        };
      }

      const response = await fetch(`${this.baseUrl}/compiler/${compiler}/compile`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify(body),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Compilation failed: ${response.status} - ${errorText}`);
      }

      return response.json();
    } catch (error: any) {
      clearTimeout(timeoutId);
      
      if (error.name === 'AbortError') {
        throw new Error('Compilation timed out. The request took too long to complete.');
      }
      throw error;
    }
  }

  // Helper method specifically for assembly compilation
  async compileAssembly(
    source: string,
    compiler: string = 'nasm21502', // Latest NASM version
    format: 'elf64' | 'elf32' | 'win64' | 'win32' = 'elf64'
  ): Promise<CompileResult> {
    const options: CompileOptions = {
      userArguments: `-f ${format}`,
      compilerOptions: {
        skipAsm: false,
        executorRequest: true
      },
      filters: {
        binary: true,
        execute: true,
        intel: true,
        labels: false,
        directives: false,
        commentOnly: false,
        trim: true
      },
      executeParameters: {
        args: [],
        stdin: ''
      }
    };

    return this.compile(compiler, source, options, 'assembly');
  }
}
