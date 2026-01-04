import { createContext, useContext, useState, useCallback, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { Problem, TestCase } from '~/constants/problems';
import type { Language } from '~/types/benchmark';
import type { JobData } from '~/services/api';
import { buildTestCode } from '~/utils/codeParser';
import { LANGUAGE_CONFIGS } from '~/constants/benchmark';

// Simple hash function for code comparison
function hashCode(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  return hash.toString(16);
}

export interface TestResult {
  testCase: TestCase;
  passed: boolean;
  actualOutput: string;
  error?: string;
}

export interface LeaderboardEntry {
  rank: number;
  username: string;
  executionTime: string;
  language: string;
  submittedAt: string;
}

interface ProblemContextValue {
  problem: Problem;
  // Editor state
  code: string;
  language: Language;
  setCode: (code: string) => void;
  setLanguage: (lang: Language) => void;
  // Get code for submission (user's code as-is for Run Code, with test harness for Run Tests)
  getRunCodePayload: () => { code: string; lang: string; compiler: string; opts: string };
  getTestCodePayload: () => { code: string; lang: string; compiler: string; opts: string };
  // Test state
  testResults: TestResult[];
  allTestsPassed: boolean;
  isRunningCode: boolean;
  isRunningTests: boolean;
  runCodeOutput: string | null;
  processRunCodeResult: (jobData: JobData) => void;
  processTestResult: (jobData: JobData) => void;
  setIsRunningCode: (running: boolean) => void;
  setIsRunningTests: (running: boolean) => void;
  // Submit state
  canSubmit: boolean;
  isSubmitting: boolean;
  hasSubmitted: boolean;
  submitBenchmark: () => void;
  // Leaderboard state (simulated)
  leaderboard: LeaderboardEntry[];
  userRank: number | null;
  // Active tab
  activeTab: 'description' | 'leaderboard' | 'discussion';
  setActiveTab: (tab: 'description' | 'leaderboard' | 'discussion') => void;
}

const ProblemContext = createContext<ProblemContextValue | null>(null);

interface ProblemProviderProps {
  problem: Problem;
  children: ReactNode;
}

// Simulated leaderboard data
const generateLeaderboard = (problemId: number): LeaderboardEntry[] => {
  const languages = ['python', 'c', 'cpp'];
  const usernames = ['speedster42', 'algo_master', 'bytecruncher', 'turbo_coder', 'perf_ninja'];

  return usernames.map((username, index) => ({
    rank: index + 1,
    username,
    executionTime: `${(Math.random() * 10 + 1).toFixed(2)} ms`,
    language: languages[Math.floor(Math.random() * languages.length)],
    submittedAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000).toLocaleDateString()
  }));
};

export function ProblemProvider({ problem, children }: ProblemProviderProps) {
  // Editor state - fully controlled by ProblemContext
  const [code, setCodeState] = useState(problem.starterCode.python || '');
  const [language, setLanguageState] = useState<Language>('python');

  // Test state
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [isRunningCode, setIsRunningCode] = useState(false);
  const [isRunningTests, setIsRunningTests] = useState(false);
  const [runCodeOutput, setRunCodeOutput] = useState<string | null>(null);

  // Submit state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [hasSubmitted, setHasSubmitted] = useState(false);

  // Tab state
  const [activeTab, setActiveTab] = useState<'description' | 'leaderboard' | 'discussion'>('description');

  // Leaderboard state
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>(() => generateLeaderboard(problem.id));
  const [userRank, setUserRank] = useState<number | null>(null);

  // Code hash tracking for submit validation
  const [testedCodeHash, setTestedCodeHash] = useState<string | null>(null);
  const [currentCodeHash, setCurrentCodeHash] = useState<string>(() => hashCode(problem.starterCode.python || ''));

  // Update hash when code changes
  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode);
    setCurrentCodeHash(hashCode(newCode));
  }, []);

  // Update code when language changes
  const setLanguage = useCallback((newLang: Language) => {
    const starterCode = problem.starterCode[newLang];
    if (starterCode) {
      setLanguageState(newLang);
      setCodeState(starterCode);
      setCurrentCodeHash(hashCode(starterCode));
      // Reset test state on language change
      setTestResults([]);
      setTestedCodeHash(null);
      setRunCodeOutput(null);
    }
  }, [problem.starterCode]);

  const allTestsPassed = testResults.length > 0 && testResults.every(r => r.passed);
  const canSubmit = allTestsPassed && testedCodeHash !== null && testedCodeHash === currentCodeHash;

  // Get payload for "Run Code" - user's code as-is
  const getRunCodePayload = useCallback(() => {
    const config = LANGUAGE_CONFIGS[language];
    return {
      code,
      lang: language,
      compiler: config.compiler,
      opts: config.opts
    };
  }, [code, language]);

  // Get payload for "Run Tests" - user's function + test harness
  const getTestCodePayload = useCallback(() => {
    const config = LANGUAGE_CONFIGS[language];
    const testHarness = problem.testHarness[language];
    const testCode = buildTestCode(code, testHarness, language);
    return {
      code: testCode,
      lang: language,
      compiler: config.compiler,
      opts: config.opts
    };
  }, [code, language, problem.testHarness]);

  // Process result from "Run Code"
  const processRunCodeResult = useCallback((jobData: JobData) => {
    const output = jobData.result?.output || '';
    setRunCodeOutput(output);
    setIsRunningCode(false);
  }, []);

  // Process result from "Run Tests"
  const processTestResult = useCallback((jobData: JobData) => {
    const output = jobData.result?.output || '';
    const outputLines = output.trim().split('\n');

    // Store full output so user can see it in Output tab
    setRunCodeOutput(output);

    const results: TestResult[] = problem.examples.map((testCase, index) => {
      const expectedNormalized = testCase.expectedOutput.replace(/\s/g, '');
      const actualLine = outputLines[index] || '';
      const actualNormalized = actualLine.replace(/\s/g, '');

      const passed = actualNormalized === expectedNormalized;

      return {
        testCase,
        passed,
        actualOutput: actualLine,
        error: passed ? undefined : 'Output does not match expected result'
      };
    });

    setTestResults(results);
    setIsRunningTests(false);

    // If all tests pass, save the code hash
    if (results.every(r => r.passed)) {
      setTestedCodeHash(currentCodeHash);
    } else {
      setTestedCodeHash(null);
    }
  }, [problem.examples, currentCodeHash]);

  const submitBenchmark = useCallback(() => {
    if (!canSubmit) return;

    setIsSubmitting(true);

    // Simulate benchmark submission
    setTimeout(() => {
      // Generate a random rank for the user
      const newRank = Math.floor(Math.random() * 10) + 1;
      setUserRank(newRank);

      // Add user to leaderboard
      const userEntry: LeaderboardEntry = {
        rank: newRank,
        username: 'you',
        executionTime: `${(Math.random() * 5 + 0.5).toFixed(2)} ms`,
        language,
        submittedAt: 'Just now'
      };

      // Insert user into leaderboard and re-rank
      const newLeaderboard = [...leaderboard, userEntry]
        .sort((a, b) => parseFloat(a.executionTime) - parseFloat(b.executionTime))
        .map((entry, index) => ({ ...entry, rank: index + 1 }));

      setLeaderboard(newLeaderboard.slice(0, 10)); // Keep top 10
      setUserRank(newLeaderboard.findIndex(e => e.username === 'you') + 1);
      setHasSubmitted(true);
      setIsSubmitting(false);
      setActiveTab('leaderboard');
    }, 1000);
  }, [canSubmit, leaderboard, language]);

  const value: ProblemContextValue = {
    problem,
    code,
    language,
    setCode,
    setLanguage,
    getRunCodePayload,
    getTestCodePayload,
    testResults,
    allTestsPassed,
    isRunningCode,
    isRunningTests,
    runCodeOutput,
    processRunCodeResult,
    processTestResult,
    setIsRunningCode,
    setIsRunningTests,
    canSubmit,
    isSubmitting,
    hasSubmitted,
    submitBenchmark,
    leaderboard,
    userRank,
    activeTab,
    setActiveTab,
  };

  return (
    <ProblemContext.Provider value={value}>
      {children}
    </ProblemContext.Provider>
  );
}

export function useProblem(): ProblemContextValue {
  const context = useContext(ProblemContext);
  if (!context) {
    throw new Error('useProblem must be used within ProblemProvider');
  }
  return context;
}
