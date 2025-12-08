"""
Migration script to create problems and test_cases tables.

Run this script to add the new tables to an existing database.

Usage:
    python migrate_problems.py
    python migrate_problems.py --seed  # Also add sample data
"""

import os
import sys

# Ensure we can import from the backend directory
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from models import db
from problem_models import Problem, TestCase, init_problem_tables


def migrate():
    """Create the problems and test_cases tables if they don't exist."""
    print("Starting migration for problems and test_cases tables...")

    init_problem_tables()

    # Verify tables were created
    tables = db.get_tables()

    if "problems" in tables:
        print("✓ problems table created/verified")
    else:
        print("✗ Failed to create problems table")
        return False

    if "test_cases" in tables:
        print("✓ test_cases table created/verified")
    else:
        print("✗ Failed to create test_cases table")
        return False

    print("\n✓ Migration complete!")
    print("\nTable structure:")
    print("  problems:")
    print("    - id: Primary key (auto)")
    print("    - title: VARCHAR(255)")
    print("    - description: TEXT")
    print("    - difficulty: VARCHAR(20)")
    print("    - created_at: DATETIME")
    print("\n  test_cases:")
    print("    - id: Primary key (auto)")
    print("    - problem_id: Foreign key -> problems(id) CASCADE")
    print("    - input: TEXT")
    print("    - expected_output: TEXT")
    print("    - is_hidden: BOOLEAN (default: false)")
    print("    - test_order: INTEGER (positive, unique per problem)")
    print("    - created_at: DATETIME")
    print("\n  Indexes:")
    print("    - UNIQUE (problem_id, test_order)")
    print("    - INDEX (problem_id, is_hidden)")
    print("\n  Constraints:")
    print("    - test_order > 0")
    print("    - problem_id CASCADE on delete")

    return True


def seed_sample_data():
    """Optionally seed some sample problems and test cases for development."""
    print("\nSeeding sample data...")

    with db.atomic():
        # Create a sample problem
        problem, created = Problem.get_or_create(
            title="Two Sum",
            defaults={
                "description": """Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.

You may assume that each input would have exactly one solution, and you may not use the same element twice.

You can return the answer in any order.

Example:
Input: nums = [2,7,11,15], target = 9
Output: [0,1]
Explanation: Because nums[0] + nums[1] == 9, we return [0, 1].""",
                "difficulty": "easy",
            },
        )

        if created:
            print(f"✓ Created problem: {problem.title}")

            # Sample test cases (visible to users)
            sample_tests = [
                {
                    "input": "[2,7,11,15]\n9",
                    "expected_output": "[0,1]",
                    "test_order": 1,
                },
                {"input": "[3,2,4]\n6", "expected_output": "[1,2]", "test_order": 2},
            ]

            # Hidden test cases (for validation)
            hidden_tests = [
                {"input": "[3,3]\n6", "expected_output": "[0,1]", "test_order": 3},
                {
                    "input": "[1,2,3,4,5]\n9",
                    "expected_output": "[3,4]",
                    "test_order": 4,
                },
                {
                    "input": "[-1,-2,-3,-4,-5]\n-8",
                    "expected_output": "[2,4]",
                    "test_order": 5,
                },
            ]

            for test in sample_tests:
                TestCase.create(
                    problem=problem,
                    input=test["input"],
                    expected_output=test["expected_output"],
                    is_hidden=False,
                    test_order=test["test_order"],
                )
            print(f"  ✓ Created {len(sample_tests)} sample test cases")

            for test in hidden_tests:
                TestCase.create(
                    problem=problem,
                    input=test["input"],
                    expected_output=test["expected_output"],
                    is_hidden=True,
                    test_order=test["test_order"],
                )
            print(f"  ✓ Created {len(hidden_tests)} hidden test cases")

        else:
            print(f"  Problem '{problem.title}' already exists, skipping seed data")

    print("\n✓ Sample data seeding complete!")


if __name__ == "__main__":
    import argparse

    parser = argparse.ArgumentParser(
        description="Migrate problems and test_cases tables"
    )
    parser.add_argument(
        "--seed",
        action="store_true",
        help="Also seed sample problem data for development",
    )
    args = parser.parse_args()

    success = migrate()

    if success and args.seed:
        seed_sample_data()
