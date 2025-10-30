import * as monaco from 'monaco-editor';

export function configureMonacoForAssembly() {
  // Register NASM syntax highlighting
  monaco.languages.register({ id: 'nasm' });

  monaco.languages.setMonarchTokensProvider('nasm', {
    tokenizer: {
      root: [
        // Comments
        [/;.*$/, 'comment'],
        
        // Sections
        [/section\s+\.(data|bss|text|rodata)/, 'keyword'],
        
        // Directives
        [/\.(global|extern|equ|times|db|dw|dd|dq)/, 'keyword'],
        
        // Registers
        [/\b(rax|rbx|rcx|rdx|rsi|rdi|rbp|rsp|r8|r9|r10|r11|r12|r13|r14|r15)\b/, 'variable.predefined'],
        [/\b(eax|ebx|ecx|edx|esi|edi|ebp|esp)\b/, 'variable.predefined'],
        [/\b(ax|bx|cx|dx|si|di|bp|sp)\b/, 'variable.predefined'],
        [/\b(al|bl|cl|dl|ah|bh|ch|dh)\b/, 'variable.predefined'],
        
        // Instructions
        [/\b(mov|add|sub|mul|div|inc|dec|push|pop|call|ret|jmp|je|jne|jg|jl|cmp|test|lea|syscall|int)\b/, 'keyword'],
        
        // Numbers
        [/\b0x[0-9a-fA-F]+\b/, 'number.hex'],
        [/\b\d+\b/, 'number'],
        
        // Labels
        [/^[a-zA-Z_][a-zA-Z0-9_]*:/, 'type.identifier'],
        
        // Strings
        [/"([^"\\]|\\.)*$/, 'string.invalid'],
        [/"/, 'string', '@string'],
      ],
      
      string: [
        [/[^\\"]+/, 'string'],
        [/\\./, 'string.escape'],
        [/"/, 'string', '@pop']
      ]
    }
  });

  // Configure completion provider
  monaco.languages.registerCompletionItemProvider('nasm', {
    provideCompletionItems: (model, position) => {
      const suggestions = [
        {
          label: 'mov',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'mov ${1:dest}, ${2:src}',
          insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
          documentation: 'Move data from source to destination'
        },
        {
          label: 'syscall',
          kind: monaco.languages.CompletionItemKind.Keyword,
          insertText: 'syscall',
          documentation: 'Invoke system call'
        },
        // Add more...
      ];

      return { suggestions };
    }
  });
}
