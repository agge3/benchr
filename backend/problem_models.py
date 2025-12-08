from datetime import datetime

from models import BaseModel, db
from peewee import (
    AutoField,
    BooleanField,
    CharField,
    Check,
    DateTimeField,
    ForeignKeyField,
    IntegerField,
    TextField,
)


class Problem(BaseModel):
  id = AutoField(primary_key=True)
    title = CharField(max_length=255)
    description = TextField()
    difficulty = CharField(max_length=20)  # easy, medium, hard
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "problems"


class TestCase(BaseModel):
id = AutoField(primary_key=True)
    problem = ForeignKeyField(Problem, backref="test_cases", on_delete="CASCADE")
    input = TextField()  # Test input data (text/JSON)
    expected_output = TextField()  # Expected output for this input
    is_hidden = BooleanField(default=False)  # false = sample test, true = hidden test
    test_order = IntegerField()  # Order in which tests should run (must be positive)
    created_at = DateTimeField(default=datetime.now)

    class Meta:
        table_name = "test_cases"
        indexes = (
            # Index on (problem_id, test_order) for ordered retrieval - unique constraint
            (("problem", "test_order"), True),
            # Index on (problem_id, is_hidden) for filtering sample vs hidden tests
            (("problem", "is_hidden"), False),
        )
        constraints = [
            Check("test_order > 0"),  # test_order must be positive integer
        ]


def init_problem_tables():
    with db:
        db.create_tables([Problem, TestCase], safe=True)
        print("Problem tables initialized")


def get_test_cases_for_problem(problem_id: int, include_hidden: bool = False):

    query = TestCase.select().where(TestCase.problem == problem_id)

    if not include_hidden:
        query = query.where(TestCase.is_hidden == False)

    return query.order_by(TestCase.test_order)


def get_sample_tests(problem_id: int):
    return get_test_cases_for_problem(problem_id, include_hidden=False)


def get_all_tests(problem_id: int):
    return get_test_cases_for_problem(problem_id, include_hidden=True)
