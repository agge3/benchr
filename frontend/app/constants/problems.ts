export interface TestCase {
  input: string;
  expectedOutput: string;
  explanation?: string;
}

export interface ProblemDescription {
  given: string;
  expected: string;
  assumptions: string;
  performanceGoal: string;
}

export interface Problem {
  id: number;
  title: string;
  slug: string;
  difficulty: 'Easy' | 'Medium' | 'Hard';
  category: string;
  description: ProblemDescription;
  examples: TestCase[];
  constraints: string[];
  starterCode: Record<string, string>;
  testHarness: Record<string, string>;
}

export const problems: Problem[] = [
  {
    id: 1,
    title: "Two Sum",
    slug: "two-sum",
    difficulty: "Easy",
    category: "Arrays",
    description: {
      given: "An array of integers `nums`. An integer `target`.",
      expected: "Return the indices of the two numbers that add up to `target`. Return the answer in any order.",
      assumptions: "Each input has exactly one solution. You may not use the same element twice.",
      performanceGoal: "Optimize for the fastest execution time. Consider time-space tradeoffs."
    },
    examples: [
      {
        input: "nums = [2, 7, 11, 15], target = 9",
        expectedOutput: "[0, 1]",
        explanation: "Because nums[0] + nums[1] == 9, we return [0, 1]."
      },
      {
        input: "nums = [3, 2, 4], target = 6",
        expectedOutput: "[1, 2]",
        explanation: "Because nums[1] + nums[2] == 6, we return [1, 2]."
      }
    ],
    constraints: [
      "2 <= nums.length <= 10^4",
      "-10^9 <= nums[i] <= 10^9",
      "-10^9 <= target <= 10^9",
      "Only one valid answer exists."
    ],
    starterCode: {
      python: `def two_sum(nums: list[int], target: int) -> list[int]:
    # Your solution here
    pass

# Test your solution
if __name__ == "__main__":
    print(two_sum([2, 7, 11, 15], 9))
`,
      c: `#include <stdio.h>
#include <stdlib.h>

int* two_sum(int* nums, int nums_size, int target, int* return_size) {
    // Your solution here
    *return_size = 2;
    int* result = malloc(2 * sizeof(int));
    return result;
}

int main() {
    int nums[] = {2, 7, 11, 15};
    int return_size;
    int* result = two_sum(nums, 4, 9, &return_size);
    printf("[%d, %d]\\n", result[0], result[1]);
    free(result);
    return 0;
}
`,
      cpp: `#include <iostream>
#include <vector>

using namespace std;

vector<int> twoSum(vector<int>& nums, int target) {
    // Your solution here
    return {};
}

int main() {
    vector<int> nums = {2, 7, 11, 15};
    vector<int> result = twoSum(nums, 9);
    cout << "[" << result[0] << ", " << result[1] << "]" << endl;
    return 0;
}
`
    },
    testHarness: {
      python: `
# Test harness - do not modify
if __name__ == "__main__":
    result1 = two_sum([2, 7, 11, 15], 9)
    print(result1)
    result2 = two_sum([3, 2, 4], 6)
    print(result2)
`,
      c: `
// Test harness - do not modify
int main() {
    int nums1[] = {2, 7, 11, 15};
    int return_size;
    int* result1 = two_sum(nums1, 4, 9, &return_size);
    printf("[%d, %d]\\n", result1[0], result1[1]);
    free(result1);

    int nums2[] = {3, 2, 4};
    int* result2 = two_sum(nums2, 3, 6, &return_size);
    printf("[%d, %d]\\n", result2[0], result2[1]);
    free(result2);
    return 0;
}
`,
      cpp: `
// Test harness - do not modify
int main() {
    vector<int> nums1 = {2, 7, 11, 15};
    vector<int> result1 = twoSum(nums1, 9);
    cout << "[" << result1[0] << ", " << result1[1] << "]" << endl;

    vector<int> nums2 = {3, 2, 4};
    vector<int> result2 = twoSum(nums2, 6);
    cout << "[" << result2[0] << ", " << result2[1] << "]" << endl;
    return 0;
}
`
    }
  },
  {
    id: 2,
    title: "Fibonacci Optimization",
    slug: "fibonacci-optimization",
    difficulty: "Medium",
    category: "Dynamic Programming",
    description: {
      given: "An integer `n` representing the position in the Fibonacci sequence.",
      expected: "Return the nth Fibonacci number. The sequence is defined as: F(0) = 0, F(1) = 1, F(n) = F(n-1) + F(n-2) for n > 1.",
      assumptions: "The answer is guaranteed to fit in a 64-bit signed integer.",
      performanceGoal: "Your solution will be benchmarked on large values of n. Naive recursion will timeout. Consider memoization, iteration, or matrix exponentiation."
    },
    examples: [
      {
        input: "n = 10",
        expectedOutput: "55",
        explanation: "The 10th Fibonacci number is 55 (0, 1, 1, 2, 3, 5, 8, 13, 21, 34, 55)."
      },
      {
        input: "n = 50",
        expectedOutput: "12586269025",
        explanation: "The 50th Fibonacci number. Naive recursion would be too slow."
      }
    ],
    constraints: [
      "0 <= n <= 90",
      "The answer is guaranteed to fit in a 64-bit signed integer."
    ],
    starterCode: {
      python: `def fibonacci(n: int) -> int:
    # Your solution here
    pass

# Test your solution
if __name__ == "__main__":
    print(fibonacci(10))
    print(fibonacci(50))
`,
      c: `#include <stdio.h>

long long fibonacci(int n) {
    // Your solution here
    return 0;
}

int main() {
    printf("%lld\\n", fibonacci(10));
    printf("%lld\\n", fibonacci(50));
    return 0;
}
`,
      cpp: `#include <iostream>

using namespace std;

long long fibonacci(int n) {
    // Your solution here
    return 0;
}

int main() {
    cout << fibonacci(10) << endl;
    cout << fibonacci(50) << endl;
    return 0;
}
`
    },
    testHarness: {
      python: `
# Test harness - do not modify
if __name__ == "__main__":
    print(fibonacci(10))
    print(fibonacci(50))
`,
      c: `
// Test harness - do not modify
int main() {
    printf("%lld\\n", fibonacci(10));
    printf("%lld\\n", fibonacci(50));
    return 0;
}
`,
      cpp: `
// Test harness - do not modify
int main() {
    cout << fibonacci(10) << endl;
    cout << fibonacci(50) << endl;
    return 0;
}
`
    }
  },
  {
    id: 3,
    title: "Matrix Multiplication",
    slug: "matrix-multiplication",
    difficulty: "Hard",
    category: "Linear Algebra",
    description: {
      given: "A square matrix `A` of size N x N. A square matrix `B` of size N x N.",
      expected: "Compute and return their product C = A * B using standard matrix multiplication: C[i][j] = sum(A[i][k] * B[k][j]).",
      assumptions: "Both matrices are guaranteed to be square and of the same size.",
      performanceGoal: "Optimize for cache efficiency and minimize memory access patterns. Consider blocking/tiling strategies for large matrices. SIMD instructions may help for compiled languages."
    },
    examples: [
      {
        input: "A = [[1, 2], [3, 4]], B = [[5, 6], [7, 8]]",
        expectedOutput: "[[19, 22], [43, 50]]",
        explanation: "Standard matrix multiplication: C[i][j] = sum(A[i][k] * B[k][j])."
      },
      {
        input: "A = [[1, 0], [0, 1]], B = [[5, 6], [7, 8]]",
        expectedOutput: "[[5, 6], [7, 8]]",
        explanation: "Multiplying by identity matrix returns the original matrix."
      }
    ],
    constraints: [
      "1 <= N <= 1000",
      "-1000 <= A[i][j], B[i][j] <= 1000",
      "Both matrices are guaranteed to be square and of the same size."
    ],
    starterCode: {
      python: `def matrix_multiply(A: list[list[int]], B: list[list[int]]) -> list[list[int]]:
    # Your solution here
    pass

# Test your solution
if __name__ == "__main__":
    A = [[1, 2], [3, 4]]
    B = [[5, 6], [7, 8]]
    result = matrix_multiply(A, B)
    print(result)
`,
      c: `#include <stdio.h>
#include <stdlib.h>

void matrix_multiply(int** A, int** B, int** C, int n) {
    // Your solution here
}

int main() {
    int n = 2;
    // Allocate and initialize matrices
    int** A = malloc(n * sizeof(int*));
    int** B = malloc(n * sizeof(int*));
    int** C = malloc(n * sizeof(int*));
    for (int i = 0; i < n; i++) {
        A[i] = malloc(n * sizeof(int));
        B[i] = malloc(n * sizeof(int));
        C[i] = malloc(n * sizeof(int));
    }

    A[0][0] = 1; A[0][1] = 2;
    A[1][0] = 3; A[1][1] = 4;
    B[0][0] = 5; B[0][1] = 6;
    B[1][0] = 7; B[1][1] = 8;

    matrix_multiply(A, B, C, n);

    printf("[[%d, %d], [%d, %d]]\\n", C[0][0], C[0][1], C[1][0], C[1][1]);

    return 0;
}
`,
      cpp: `#include <iostream>
#include <vector>

using namespace std;

vector<vector<int>> matrixMultiply(vector<vector<int>>& A, vector<vector<int>>& B) {
    // Your solution here
    return {};
}

int main() {
    vector<vector<int>> A = {{1, 2}, {3, 4}};
    vector<vector<int>> B = {{5, 6}, {7, 8}};
    vector<vector<int>> result = matrixMultiply(A, B);

    cout << "[[" << result[0][0] << ", " << result[0][1] << "], ";
    cout << "[" << result[1][0] << ", " << result[1][1] << "]]" << endl;

    return 0;
}
`
    },
    testHarness: {
      python: `
# Test harness - do not modify
if __name__ == "__main__":
    A1 = [[1, 2], [3, 4]]
    B1 = [[5, 6], [7, 8]]
    result1 = matrix_multiply(A1, B1)
    print(result1)

    A2 = [[1, 0], [0, 1]]
    B2 = [[5, 6], [7, 8]]
    result2 = matrix_multiply(A2, B2)
    print(result2)
`,
      c: `
// Test harness - do not modify
int main() {
    int n = 2;
    int** A = malloc(n * sizeof(int*));
    int** B = malloc(n * sizeof(int*));
    int** C = malloc(n * sizeof(int*));
    for (int i = 0; i < n; i++) {
        A[i] = malloc(n * sizeof(int));
        B[i] = malloc(n * sizeof(int));
        C[i] = malloc(n * sizeof(int));
    }

    // Test 1
    A[0][0] = 1; A[0][1] = 2;
    A[1][0] = 3; A[1][1] = 4;
    B[0][0] = 5; B[0][1] = 6;
    B[1][0] = 7; B[1][1] = 8;
    matrix_multiply(A, B, C, n);
    printf("[[%d, %d], [%d, %d]]\\n", C[0][0], C[0][1], C[1][0], C[1][1]);

    // Test 2
    A[0][0] = 1; A[0][1] = 0;
    A[1][0] = 0; A[1][1] = 1;
    matrix_multiply(A, B, C, n);
    printf("[[%d, %d], [%d, %d]]\\n", C[0][0], C[0][1], C[1][0], C[1][1]);

    return 0;
}
`,
      cpp: `
// Test harness - do not modify
int main() {
    vector<vector<int>> A1 = {{1, 2}, {3, 4}};
    vector<vector<int>> B1 = {{5, 6}, {7, 8}};
    vector<vector<int>> result1 = matrixMultiply(A1, B1);
    cout << "[[" << result1[0][0] << ", " << result1[0][1] << "], ";
    cout << "[" << result1[1][0] << ", " << result1[1][1] << "]]" << endl;

    vector<vector<int>> A2 = {{1, 0}, {0, 1}};
    vector<vector<int>> B2 = {{5, 6}, {7, 8}};
    vector<vector<int>> result2 = matrixMultiply(A2, B2);
    cout << "[[" << result2[0][0] << ", " << result2[0][1] << "], ";
    cout << "[" << result2[1][0] << ", " << result2[1][1] << "]]" << endl;

    return 0;
}
`
    }
  }
];

export function getProblemById(id: number): Problem | undefined {
  return problems.find(p => p.id === id);
}

export function getProblemBySlug(slug: string): Problem | undefined {
  return problems.find(p => p.slug === slug);
}
