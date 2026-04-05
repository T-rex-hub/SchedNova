#!/usr/bin/env python3
"""
Simple test script for tt-generator that doesn't require database.
Use this to verify OR-Tools installation and basic functionality.
"""

from ortools.sat.python import cp_model
import time

def simple_timetable_test():
    """Create a simple test timetable to verify OR-Tools works"""
    print("Testing OR-Tools installation...")

    model = cp_model.CpModel()
    solver = cp_model.CpSolver()

    # Simple constraint: x + y = 10
    x = model.NewIntVar(0, 10, 'x')
    y = model.NewIntVar(0, 10, 'y')

    model.Add(x + y == 10)
    model.Maximize(x * 2 + y)

    status = solver.Solve(model)

    if status == cp_model.OPTIMAL:
        print(f"✓ OR-Tools working! x={solver.Value(x)}, y={solver.Value(y)}")
        return True
    else:
        print("✗ OR-Tools test failed")
        return False

def test_database_connection():
    """Test database connection"""
    print("\nTesting database connection...")

    try:
        import sys
        import os
        sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

        from backend.database import SessionLocal
        from backend import models

        db = SessionLocal()

        # Try to query each table
        tables = [
            (models.Batch, "batches"),
            (models.Classroom, "classrooms"),
            (models.Subject, "subjects"),
            (models.Teacher, "teachers"),
            (models.FixedGroup, "fixed_groups"),
        ]

        for model, name in tables:
            count = db.query(model).count()
            print(f"  {name}: {count} records")

        db.close()
        print("✓ Database connection working!")
        return True

    except Exception as e:
        print(f"✗ Database error: {e}")
        return False

if __name__ == "__main__":
    ortools_ok = simple_timetable_test()
    db_ok = test_database_connection()

    if ortools_ok and db_ok:
        print("\n✓ All tests passed! You can now run tt-generator.py")
    else:
        print("\n✗ Some tests failed. Check errors above.")
        sys.exit(1)
