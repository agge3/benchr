import React, { useState } from 'react';
import './ClaudePanel.css';

interface ClaudePanelProps {
  code: string;
  language: string;
  assembly: string;
  claudeService: any;
  onCodeUpdate: (code: string) => void;
}

export const ClaudePanel: React.FC<ClaudePanelProps> = ({
  code,
  language,
  assembly,
  claudeService,
  onCodeUpdate
}) => {
  const [messages, setMessages] = useState<Array<{ role: string; content: string }>>([]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleAnalyze = async () => {
    setIsLoading(true);
    try {
      const analysis = await claudeService.analyzeCode(code, language);
      const message = `**Code Analysis:**

**Optimization Suggestions:**
${analysis.suggestions.join('\n')}

**Performance Optimizations:**
${analysis.optimizations.join('\n')}

**Potential Issues:**
${analysis.potentialIssues.join('\n')}

**Complexity:** ${analysis.complexity}`;

      setMessages([...messages, { role: 'assistant', content: message }]);
    } catch (error) {
      console.error('Analysis failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleOptimize = async () => {
    setIsLoading(true);
    try {
      const optimized = await claudeService.optimizeCode(code, language);
      onCodeUpdate(optimized);
      setMessages([...messages, { 
        role: 'assistant', 
        content: 'Code optimized and updated in editor!' 
      }]);
    } catch (error) {
      console.error('Optimization failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExplainAssembly = async () => {
    if (!assembly) return;
    setIsLoading(true);
    try {
      const explanation = await claudeService.explainAssembly(assembly);
      setMessages([...messages, { role: 'assistant', content: explanation }]);
    } catch (error) {
      console.error('Explanation failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages([...messages, userMessage]);
    setInput('');
    setIsLoading(true);

    // For custom queries, you'd implement a more general chat interface
    setIsLoading(false);
  };

  return (
    <div className="claude-panel-content">
      <div className="claude-header">
        <h3>Claude AI Assistant</h3>
      </div>
      
      <div className="claude-actions">
        <button onClick={handleAnalyze} disabled={isLoading} className="btn-small">
          Analyze Code
        </button>
        <button onClick={handleOptimize} disabled={isLoading} className="btn-small">
          Optimize
        </button>
        <button onClick={handleExplainAssembly} disabled={isLoading} className="btn-small">
          Explain Assembly
        </button>
      </div>

      <div className="claude-messages">
        {messages.map((msg, idx) => (
          <div key={idx} className={`message ${msg.role}`}>
            <div className="message-role">{msg.role === 'user' ? 'You' : 'Claude'}</div>
            <div className="message-content">{msg.content}</div>
          </div>
        ))}
        {isLoading && <div className="message assistant loading">Thinking...</div>}
      </div>

      <div className="claude-input">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask Claude anything..."
        />
        <button onClick={handleSendMessage} disabled={isLoading}>
          Send
        </button>
      </div>
    </div>
  );
};
