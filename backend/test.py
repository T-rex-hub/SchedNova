from backend.database import SessionLocal
from backend.main import get_timetable_data  # your FastAPI function
from sqlalchemy.orm import Session

# Open DB session
db: Session = SessionLocal()

# Call the function directly
data = get_timetable_data(db)

print("Fetched data from DB:")
print(data)
