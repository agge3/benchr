import { useState } from 'react';
import { Button } from '~/components/ui/button';
import type { ChatMessage } from '~/types/benchmark';

export function InsightsView() {
  const [chatInput, setChatInput] = useState('');
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      content: 'Hi! I\'m Claude, your performance analysis assistant. Ask me anything about code optimization, performance metrics, or best practices!'
    }
  ]);

  const handleSendMessage = () => {
    if (!chatInput.trim()) return;

    // Add user message
    setMessages(prev => [...prev, { role: 'user', content: chatInput }]);

    // Clear input
    setChatInput('');

    // Mock AI response (no backend yet)
    setTimeout(() => {
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'This is a placeholder response. Backend integration coming soon!'
      }]);
    }, 500);
  };

  return (
    <div className="flex flex-col h-full gap-4">
      {/* Chat messages - scrollable */}
      <div className="flex-1 overflow-y-auto space-y-4">
        {messages.map((message, idx) => (
          <div key={idx} className="flex gap-3">
            {/* Avatar */}
            <div className="flex-shrink-0 w-8 h-8 rounded-full bg-benchr-gold-accent flex items-center justify-center text-benchr-text-dark text-xs font-bold shadow-md">
              {message.role === 'assistant' ? 'AI' : 'You'}
            </div>

            {/* Message bubble */}
            <div className="flex-1">
              <div className={`rounded-lg p-3 shadow-lg ${
                message.role === 'assistant'
                  ? 'bg-benchr-bg-header'
                  : 'bg-benchr-bg-elevated'
              }`}>
                <p className="text-sm text-benchr-text-light leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Input box at bottom */}
      <div className="flex gap-2">
        <input
          type="text"
          value={chatInput}
          onChange={(e) => setChatInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask Claude about performance optimization..."
          className="flex-1 bg-benchr-bg-header border border-benchr-border rounded-lg px-4 py-2.5 text-sm text-benchr-text-light placeholder-benchr-text-muted focus:outline-none focus:ring-2 focus:ring-benchr-gold-accent focus:border-transparent shadow-md transition-all"
        />
        <Button
          onClick={handleSendMessage}
          disabled={!chatInput.trim()}
          className="bg-benchr-gold-accent hover:bg-benchr-gold-hover text-benchr-text-dark shadow-lg font-medium disabled:opacity-50 disabled:cursor-not-allowed px-6"
        >
          Send
        </Button>
      </div>
    </div>
  );
}
