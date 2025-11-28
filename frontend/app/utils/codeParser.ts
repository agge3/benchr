import type { Language } from '~/types/benchmark';

/**
 * Strips the user's main/test code and returns just the function implementation
 */
export function stripUserMain(code: string, language: Language): string {
  switch (language) {
    case 'python':
      return stripPythonMain(code);
    case 'c':
      return stripCMain(code);
    case 'cpp':
      return stripCppMain(code);
    default:
      return code;
  }
}

/**
 * Combines user's function code with the test harness
 */
export function buildTestCode(code: string, testHarness: string, language: Language): string {
  const functionCode = stripUserMain(code, language);
  return functionCode + '\n' + testHarness;
}

function stripPythonMain(code: string): string {
  // Remove everything after "if __name__" block
  const lines = code.split('\n');
  const result: string[] = [];
  let inMainBlock = false;
  let mainIndent = 0;

  for (const line of lines) {
    // Check for if __name__ == "__main__":
    if (line.match(/^\s*if\s+__name__\s*==\s*["']__main__["']\s*:/)) {
      inMainBlock = true;
      mainIndent = line.search(/\S/); // Get indentation level
      continue;
    }

    if (inMainBlock) {
      // Check if we've exited the main block (less or equal indentation, non-empty line)
      const currentIndent = line.search(/\S/);
      if (line.trim() !== '' && currentIndent <= mainIndent) {
        inMainBlock = false;
        result.push(line);
      }
      // Skip lines inside main block
      continue;
    }

    result.push(line);
  }

  return result.join('\n').trim();
}

function stripCMain(code: string): string {
  // Remove int main() { ... } block
  return stripMainFunction(code, /int\s+main\s*\([^)]*\)\s*\{/);
}

function stripCppMain(code: string): string {
  // Remove int main() { ... } block
  return stripMainFunction(code, /int\s+main\s*\([^)]*\)\s*\{/);
}

function stripMainFunction(code: string, mainPattern: RegExp): string {
  const match = code.match(mainPattern);
  if (!match || match.index === undefined) {
    return code;
  }

  const beforeMain = code.substring(0, match.index).trim();
  const afterMainStart = code.substring(match.index + match[0].length);

  // Find matching closing brace
  let braceCount = 1;
  let i = 0;
  while (i < afterMainStart.length && braceCount > 0) {
    if (afterMainStart[i] === '{') braceCount++;
    if (afterMainStart[i] === '}') braceCount--;
    i++;
  }

  const afterMain = afterMainStart.substring(i).trim();

  return (beforeMain + '\n' + afterMain).trim();
}
