export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CodeAnalysis {
  suggestions: string[];
  optimizations: string[];
  potentialIssues: string[];
  complexity: string;
}

class ClaudeService {
  private apiKey: string;
  private baseUrl = 'https://api.anthropic.com/v1';

  constructor(apiKey: string) {
    this.apiKey = apiKey;
  }

  async analyzeCode(code: string, language: string): Promise<CodeAnalysis> {
    const prompt = `Analyze the following ${language} code for performance benchmarking. Provide:
1. Optimization suggestions
2. Potential performance issues
3. Time complexity analysis
4. Memory usage considerations

Code:
\`\`\`${language}
${code}
\`\`\`

Return response in JSON format with keys: suggestions, optimizations, potentialIssues, complexity`;

    const response = await this.sendMessage([
      { role: 'user', content: prompt }
    ]);

    try {
      return JSON.parse(response);
    } catch {
      return {
        suggestions: [response],
        optimizations: [],
        potentialIssues: [],
        complexity: 'Unknown'
      };
    }
  }

  async optimizeCode(code: string, language: string): Promise<string> {
    const prompt = `Optimize the following ${language} code for performance. Return only the optimized code without explanations.

\`\`\`${language}
${code}
\`\`\``;

    return this.sendMessage([{ role: 'user', content: prompt }]);
  }

  async explainAssembly(assembly: string): Promise<string> {
    const prompt = `Explain what this assembly code does in simple terms:

\`\`\`asm
${assembly}
\`\`\``;

    return this.sendMessage([{ role: 'user', content: prompt }]);
  }

  async debugCode(code: string, error: string, language: string): Promise<string> {
    const prompt = `Help debug this ${language} code. Error message:
${error}

Code:
\`\`\`${language}
${code}
\`\`\`

Provide specific suggestions to fix the error.`;

    return this.sendMessage([{ role: 'user', content: prompt }]);
  }

  private async sendMessage(messages: ClaudeMessage[]): Promise<string> {
    const response = await fetch(`${this.baseUrl}/messages`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': this.apiKey,
        'anthropic-version': '2023-06-01'
      },
      body: JSON.stringify({
        model: 'claude-3-5-sonnet-20241022',
        max_tokens: 4096,
        messages
      })
    });

    if (!response.ok) {
      throw new Error(`Claude API error: ${response.statusText}`);
    }

    const data = await response.json();
    return data.content[0].text;
  }
}

export const createClaudeService = (apiKey: string) => new ClaudeService(apiKey);
