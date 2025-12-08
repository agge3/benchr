// Monaco configuration for NASM assembly language support
// Using 'any' types to avoid issues when monaco-editor types aren't installed

export function configureMonacoForAssembly(monaco: any) {
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
		provideCompletionItems: (model: any, position: any) => {
			const word = model.getWordUntilPosition(position);
			const range = {
				startLineNumber: position.lineNumber,
				endLineNumber: position.lineNumber,
				startColumn: word.startColumn,
				endColumn: word.endColumn
			};

			const suggestions = [
				{
					label: 'mov',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'mov ${1:dest}, ${2:src}',
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: 'Move data from source to destination',
					range: range
				},
				{
					label: 'syscall',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'syscall',
					documentation: 'Invoke system call',
					range: range
				},
				{
					label: 'push',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'push ${1:reg}',
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: 'Push value onto stack',
					range: range
				},
				{
					label: 'pop',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'pop ${1:reg}',
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: 'Pop value from stack',
					range: range
				},
				{
					label: 'call',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'call ${1:label}',
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: 'Call a procedure',
					range: range
				},
				{
					label: 'ret',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'ret',
					documentation: 'Return from procedure',
					range: range
				},
				{
					label: 'jmp',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'jmp ${1:label}',
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: 'Unconditional jump',
					range: range
				},
				{
					label: 'cmp',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'cmp ${1:op1}, ${2:op2}',
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: 'Compare two operands',
					range: range
				},
				{
					label: 'add',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'add ${1:dest}, ${2:src}',
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: 'Add source to destination',
					range: range
				},
				{
					label: 'sub',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'sub ${1:dest}, ${2:src}',
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: 'Subtract source from destination',
					range: range
				},
				{
					label: 'lea',
					kind: monaco.languages.CompletionItemKind.Keyword,
					insertText: 'lea ${1:dest}, [${2:src}]',
					insertTextRules: monaco.languages.CompletionItemInsertTextRule.InsertAsSnippet,
					documentation: 'Load effective address',
					range: range
				},
			];

			return { suggestions };
		}
	});
}
