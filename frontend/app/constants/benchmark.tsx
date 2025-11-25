import type { Language, LanguageConfig, LanguageOption } from '~/types/benchmark';

export const LANGUAGE_CONFIGS: Record<Language, LanguageConfig> = {
  python: {
    defaultCode: '# Write your Python code here\nprint("Hello, Benchr!")',
    compiler: 'python3',
    opts: ''
  },
  cpp: {
    defaultCode: '// Write your C++ code here\n#include <iostream>\n\nint main() {\n    std::cout << "Hello, Benchr!" << std::endl;\n    return 0;\n}',
    compiler: 'g++',
    opts: '-O2 -std=c++17'
  },
  java: {
    defaultCode: '// Write your Java code here\npublic class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello, Benchr!");\n    }\n}',
    compiler: 'javac',
    opts: ''
  },
  c: {
    defaultCode: '// Write your C code here\n#include <stdio.h>\n\nint main() {\n    printf("Hello, Benchr!\\n");\n    return 0;\n}',
    compiler: 'gcc',
    opts: '-O2 -std=c11'
  }
};

export const LANGUAGE_OPTIONS: LanguageOption[] = [
  { id: 'python', label: 'Python' },
  { id: 'cpp', label: 'C++' },
  { id: 'c', label: 'C' }
];

export const POLLING_CONFIG = {
  MAX_ATTEMPTS: 15,
  POLL_INTERVAL_MS: 2000,
  CANCEL_BUTTON_DELAY_ATTEMPTS: 1
};
