const BenchmarkWorkspace: React.FC = () => {
  const [code, setCode] = useState(`#include <iostream>
#include <chrono>

int main() {
    auto start = std::chrono::high_resolution_clock::now();
    
    // Your benchmark code here
    int sum = 0;
    for (int i = 0; i < 1000000; ++i) {
        sum += i;
    }
    
    auto end = std::chrono::high_resolution_clock::now();
    auto duration = std::chrono::duration_cast<std::chrono::microseconds>(end - start);
    
    std::cout << "Sum: " << sum << std::endl;
    std::cout << "Time: " << duration.count() << " µs" << std::endl;
    return 0;
}`);

  const [language, setLanguage] = useState<'cpp' | 'c' | 'python' | 'assembly'>('cpp');
  
  // Assembly-specific state
  const [assemblyFormat, setAssemblyFormat] = useState<'elf64' | 'elf32' | 'win64' | 'win32'>('elf64');
  
  const exampleAssemblyCode = `section .data
    msg db "Hello, Benchr!", 0xa
    len equ $ - msg

section .text
    global _start

_start:
    ; write syscall
    mov rax, 1          ; sys_write
    mov rdi, 1          ; stdout
    mov rsi, msg        ; message
    mov rdx, len        ; length
    syscall
    
    ; exit syscall
    mov rax, 60         ; sys_exit
    xor rdi, rdi        ; exit code 0
    syscall`;

  useEffect(() => {
    if (language === 'assembly' && !code.includes('section')) {
      setCode(exampleAssemblyCode);
    }
  }, [language]);

  const handleCompileAndBenchmark = async () => {
    setIsCompiling(true);
    setExecutionOutput('Compiling...');
    
    try {
      let result: any;
      
      if (language === 'assembly') {
        // Special handling for assembly
        result = await godboltService.compileAssembly(
          code,
          selectedCompiler || 'nasm21502',
          assemblyFormat
        );
      } else {
        // Regular compilation for C/C++/Python
        const compileOptions: CompileOptions = {
          userArguments: `${config.optimizationLevel} ${config.standardVersion} ${config.additionalFlags}`.trim(),
          compilerOptions: {
            executorRequest: true
          },
          filters: {
            binary: false,
            execute: true,
            intel: true,
            demangle: true,
            labels: true,
            directives: true,
            commentOnly: false,
            trim: true
          }
        };

        result = await godboltService.compile(
          selectedCompiler,
          code,
          compileOptions,
          language === 'cpp' ? 'c++' : language
        );
      }

      // Handle compilation errors
      if (result.code !== 0 || (result.stderr && result.stderr.length > 0)) {
        const errorMsg = result.stderr
          ? result.stderr.map((e: any) => e.text).join('\n')
          : 'Compilation failed';
        setExecutionOutput(`Compilation Error:\n${errorMsg}`);
        return;
      }

      // Extract assembly (not applicable for assembly input, but for C/C++)
      if (result.asm && language !== 'assembly') {
        setAssembly(result.asm.map((line: any) => line.text).join('\n'));
      } else if (language === 'assembly') {
        setAssembly('Assembly source code (input)');
      }

      // Extract execution results
      if (result.execResult) {
        const output = `
╔══════════════════════════════════════╗
║     EXECUTION RESULTS               ║
╚══════════════════════════════════════╝

Exit Code: ${result.execResult.code}
Execution Time: ${result.execResult.execTime || 'N/A'}

${result.execResult.stdout ? '─── STDOUT ───\n' + result.execResult.stdout : ''}
${result.execResult.stderr ? '─── STDERR ───\n' + result.execResult.stderr : ''}
        `.trim();

        setExecutionOutput(output);

        setBenchmarkResults({
          executionTime: result.execResult.execTime || '0ms',
          exitCode: result.execResult.code,
          output: result.execResult.stdout,
          compiler: selectedCompiler,
          flags: language === 'assembly' ? `-f ${assemblyFormat}` : config.optimizationLevel,
          language
        });
      } else {
        setExecutionOutput('Compilation successful, but no execution results available.');
      }
    } catch (error: any) {
      console.error('Compilation failed:', error);
      
      let errorMessage = 'An error occurred during compilation.';
      
      if (error.message.includes('timed out')) {
        errorMessage = `⏱️ TIMEOUT ERROR

The compilation request timed out. This can happen when:
- The code takes too long to compile
- The code takes too long to execute
- Network connection issues
- Godbolt API is overloaded

Suggestions:
- Simplify your code
- Remove infinite loops
- Check your network connection
- Try again in a moment`;
      } else if (error.message.includes('Failed to fetch')) {
        errorMessage = `🌐 NETWORK ERROR

Could not connect to Godbolt API.
Please check your internet connection.`;
      } else {
        errorMessage = `❌ ERROR

${error.message}

Stack trace:
${error.stack || 'No stack trace available'}`;
      }
      
      setExecutionOutput(errorMessage);
    } finally {
      setIsCompiling(false);
    }
  };

  return (
    <div className="benchmark-workspace">
      <header className="workspace-header">
        <div className="header-left">
          <h1>Benchr.cc</h1>
          <div className="language-selector">
            <select value={language} onChange={(e) => setLanguage(e.target.value as any)}>
              <option value="cpp">C++</option>
              <option value="c">C</option>
              <option value="python">Python</option>
              <option value="assembly">Assembly (NASM)</option>
            </select>
          </div>
          
          {language === 'assembly' && (
            <div className="assembly-format-selector">
              <select 
                value={assemblyFormat} 
                onChange={(e) => setAssemblyFormat(e.target.value as any)}
              >
                <option value="elf64">ELF64 (Linux x64)</option>
                <option value="elf32">ELF32 (Linux x86)</option>
                <option value="win64">Win64</option>
                <option value="win32">Win32</option>
              </select>
            </div>
          )}
        </div>
        
        {/* Rest of the header... */}
      </header>

      {/* Rest of the workspace... */}
    </div>
  );
};
