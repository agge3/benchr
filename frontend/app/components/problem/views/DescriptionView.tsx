import { useProblem } from '~/contexts/ProblemContext';
import { Badge } from '~/components/ui/badge';

const getDifficultyColor = (difficulty: string) => {
  switch (difficulty) {
    case "Easy": return "bg-green-500/20 text-green-400 border-green-500/50";
    case "Medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
    case "Hard": return "bg-red-500/20 text-red-400 border-red-500/50";
    default: return "";
  }
};

// Helper to render text with inline code formatting
function renderWithCode(text: string) {
  const parts = text.split(/(`[^`]+`)/g);
  return parts.map((part, i) => {
    if (part.startsWith('`') && part.endsWith('`')) {
      return (
        <code key={i} className="px-1.5 py-0.5 bg-benchr-bg-elevated rounded text-benchr-gold-accent font-mono text-xs">
          {part.slice(1, -1)}
        </code>
      );
    }
    return part;
  });
}

// Helper to render text as bullet points (split by sentence)
function renderAsBullets(text: string) {
  const sentences = text.split(/(?<=[.!?])\s+/).filter(s => s.trim());
  return (
    <ul className="space-y-1">
      {sentences.map((sentence, index) => (
        <li key={index} className="text-sm text-benchr-text-light flex items-start gap-2">
          <span className="text-benchr-gold-accent text-xs mt-0.5">•</span>
          <span className="leading-relaxed">{renderWithCode(sentence)}</span>
        </li>
      ))}
    </ul>
  );
}

export function DescriptionView() {
  const { problem } = useProblem();

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <div className="flex items-center gap-3 mb-1">
          <h1 className="text-xl font-bold text-benchr-text-light">{problem.title}</h1>
          <Badge variant="outline" className={getDifficultyColor(problem.difficulty)}>
            {problem.difficulty}
          </Badge>
        </div>
        <p className="text-sm text-benchr-text-muted">{problem.category}</p>
      </div>

      {/* Given */}
      <div>
        <h3 className="text-xs font-medium mb-1.5 text-benchr-gold-accent uppercase tracking-wide">Given</h3>
        {renderAsBullets(problem.description.given)}
      </div>

      {/* Expected */}
      <div>
        <h3 className="text-xs font-medium mb-1.5 text-benchr-gold-accent uppercase tracking-wide">Expected</h3>
        {renderAsBullets(problem.description.expected)}
      </div>

      {/* Assumptions */}
      <div>
        <h3 className="text-xs font-medium mb-1.5 text-benchr-gold-accent uppercase tracking-wide">Assumptions</h3>
        {renderAsBullets(problem.description.assumptions)}
      </div>

      {/* Performance Goal */}
      <div>
        <h3 className="text-xs font-medium mb-1.5 text-benchr-gold-accent uppercase tracking-wide">Performance Goal</h3>
        {renderAsBullets(problem.description.performanceGoal)}
      </div>

      {/* Examples */}
      <div>
        <h3 className="text-xs font-medium mb-2 text-benchr-gold-accent uppercase tracking-wide">Examples</h3>
        <div className="space-y-3">
          {problem.examples.map((example, index) => (
            <div
              key={index}
              className="bg-benchr-bg-header border border-benchr-border rounded-lg p-3"
            >
              <span className="text-xs font-medium text-benchr-text-muted mb-2 block">
                Example {index + 1}
              </span>

              <div className="space-y-2">
                <div>
                  <span className="text-xs text-benchr-text-muted">Input:</span>
                  <pre className="mt-1 p-2 bg-benchr-bg-main rounded text-xs font-mono text-benchr-text-light overflow-x-auto">
                    {example.input}
                  </pre>
                </div>

                <div>
                  <span className="text-xs text-benchr-text-muted">Output:</span>
                  <pre className="mt-1 p-2 bg-benchr-bg-main rounded text-xs font-mono text-benchr-text-light overflow-x-auto">
                    {example.expectedOutput}
                  </pre>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Constraints */}
      <div>
        <h3 className="text-xs font-medium mb-2 text-benchr-gold-accent uppercase tracking-wide">Constraints</h3>
        <ul className="space-y-1">
          {problem.constraints.map((constraint, index) => (
            <li key={index} className="text-sm text-benchr-text-muted flex items-center gap-2">
              <span className="text-benchr-gold-accent text-xs">•</span>
              <code className="font-mono text-xs">{constraint}</code>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
