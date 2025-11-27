import { Link } from "react-router";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "~/components/ui/card";
import { Badge } from "~/components/ui/badge";
import { Button } from "~/components/ui/button";

export default function ProblemsPage() {
  const problems = [
    {
      id: 1,
      title: "Two Sum",
      difficulty: "Easy",
      category: "Arrays",
      submissions: 1234,
      acceptanceRate: 87,
    },
    {
      id: 2,
      title: "Fibonacci Optimization",
      difficulty: "Medium",
      category: "Dynamic Programming",
      submissions: 567,
      acceptanceRate: 62,
    },
    {
      id: 3,
      title: "Matrix Multiplication",
      difficulty: "Hard",
      category: "Linear Algebra",
      submissions: 234,
      acceptanceRate: 34,
    },
  ];

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy": return "bg-green-500/20 text-green-400 border-green-500/50";
      case "Medium": return "bg-yellow-500/20 text-yellow-400 border-yellow-500/50";
      case "Hard": return "bg-red-500/20 text-red-400 border-red-500/50";
      default: return "";
    }
  };

  return (
    <div className="min-h-full px-4 py-12 bg-benchr-bg-main">
      <div className="max-w-6xl mx-auto">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-benchr-text-light mb-2">Problems</h1>
          <p className="text-benchr-text-muted">
            Choose a problem and optimize your solution to climb the leaderboard
          </p>
        </div>

        <div className="space-y-4">
          {problems.map((problem) => (
            <Card key={problem.id} className="bg-benchr-bg-elevated border-benchr-border hover:border-benchr-gold/50 transition-colors">
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-xl text-benchr-text-light mb-2">
                      {problem.title}
                    </CardTitle>
                    <CardDescription className="flex items-center gap-3 text-benchr-text-muted">
                      <Badge variant="outline" className={getDifficultyColor(problem.difficulty)}>
                        {problem.difficulty}
                      </Badge>
                      <span>{problem.category}</span>
                      <span>•</span>
                      <span>{problem.submissions} submissions</span>
                      <span>•</span>
                      <span>{problem.acceptanceRate}% acceptance</span>
                    </CardDescription>
                  </div>
                  <Button
                    asChild
                    className="bg-benchr-gold text-benchr-text-dark hover:bg-benchr-gold-hover"
                  >
                    <Link to={`/problems/${problem.id}`}>Solve</Link>
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        <div className="mt-12 text-center">
          <p className="text-benchr-text-muted">More problems coming soon...</p>
        </div>
      </div>
    </div>
  );
}
