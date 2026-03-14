import os
import urllib
from pathlib import Path

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base


BASE_DIR = Path(__file__).resolve().parent
load_dotenv(dotenv_path=BASE_DIR / ".env")


def _build_database_url_from_parts() -> str | None:
    host = os.getenv("DB_HOST")
    port = os.getenv("DB_PORT")
    user = os.getenv("DB_USER")
    password = os.getenv("DB_PASSWORD")
    name = os.getenv("DB_NAME")

    if not all([host, port, user, password, name]):
        return None

    safe_password = urllib.parse.quote_plus(password)
    return f"postgresql+psycopg2://{user}:{safe_password}@{host}:{port}/{name}"


DATABASE_URL = os.getenv("DATABASE_URL") or _build_database_url_from_parts()
if not DATABASE_URL:
    raise ValueError("DATABASE_URL or DB_* env vars must be set")

# Normalize scheme to psycopg2 if no explicit driver is provided.
if DATABASE_URL.startswith("postgres://"):
    DATABASE_URL = DATABASE_URL.replace("postgres://", "postgresql+psycopg2://", 1)
elif DATABASE_URL.startswith("postgresql://") and "postgresql+" not in DATABASE_URL:
    DATABASE_URL = DATABASE_URL.replace("postgresql://", "postgresql+psycopg2://", 1)

DB_ECHO = os.getenv("DB_ECHO", "false").lower() == "true"
DB_POOL_SIZE = int(os.getenv("DB_POOL_SIZE", "5"))
DB_MAX_OVERFLOW = int(os.getenv("DB_MAX_OVERFLOW", "10"))
DB_POOL_TIMEOUT = int(os.getenv("DB_POOL_TIMEOUT", "30"))
DB_POOL_RECYCLE = int(os.getenv("DB_POOL_RECYCLE", "1800"))
DB_SSLMODE = os.getenv("DB_SSLMODE", "require")

connect_args: dict[str, str] = {}
if DATABASE_URL.startswith("postgresql") and "sslmode=" not in DATABASE_URL:
    connect_args["sslmode"] = DB_SSLMODE

engine = create_engine(
    DATABASE_URL,
    echo=DB_ECHO,
    pool_pre_ping=True,
    pool_size=DB_POOL_SIZE,
    max_overflow=DB_MAX_OVERFLOW,
    pool_timeout=DB_POOL_TIMEOUT,
    pool_recycle=DB_POOL_RECYCLE,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
