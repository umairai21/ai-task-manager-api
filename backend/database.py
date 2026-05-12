from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base

# The connection string matches the credentials in our docker-compose.yml
# Format: postgresql://user:password@host:port/database_name
SQLALCHEMY_DATABASE_URL = "postgresql://admin:secretpassword@localhost:5434/taskmanager"

# Create the database engine
engine = create_engine(SQLALCHEMY_DATABASE_URL)

# Create a session local class. Each instance of this will be a database session.
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Base class for our database models (tables) to inherit from
Base = declarative_base()

# Dependency to get the database session in our API routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()