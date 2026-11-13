import os
import logging
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

logger = logging.getLogger("enterprise_ai.db")

# Default PostgreSQL URL (can be customized via .env)
# e.g., postgresql://username:password@localhost:5432/enterprise_ai_db
POSTGRES_URL = os.getenv(
    "DATABASE_URL", 
    "postgresql://postgres:postgres@localhost:5432/enterprise_ai_db"
)
SQLITE_FALLBACK_URL = "sqlite:///./enterprise_ai.db"

engine = None
SessionLocal = None
Base = declarative_base()

def get_engine():
    global engine
    if engine is not None:
        return engine

    # Attempt PostgreSQL first if specified
    if POSTGRES_URL and not POSTGRES_URL.startswith("sqlite"):
        try:
            logger.info(f"Attempting connection to PostgreSQL: {POSTGRES_URL}")
            test_engine = create_engine(POSTGRES_URL, pool_pre_ping=True, echo=False)
            with test_engine.connect() as conn:
                logger.info("Successfully connected to PostgreSQL database!")
            engine = test_engine
            return engine
        except Exception as e:
            logger.warning(
                f"Could not connect to PostgreSQL ({e}). Falling back to SQLite for local development: {SQLITE_FALLBACK_URL}"
            )

    # Fallback to SQLite
    engine = create_engine(
        SQLITE_FALLBACK_URL, 
        connect_args={"check_same_thread": False}, 
        echo=False
    )
    return engine

def get_session():
    global SessionLocal
    if SessionLocal is None:
        eng = get_engine()
        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=eng)
    return SessionLocal()

def get_db():
    db = get_session()
    try:
        yield db
    finally:
        db.close()

def init_db():
    from backend.models.user import User
    from backend.models.ticket import SupportTicket
    from backend.models.leave_request import LeaveAndRemoteRequest
    from backend.models.document import DocumentRecord
    import bcrypt

    def hash_pwd(pwd: str) -> str:
        salt = bcrypt.gensalt()
        return bcrypt.hashpw(pwd.encode("utf-8")[:72], salt).decode("utf-8")

    eng = get_engine()
    Base.metadata.create_all(bind=eng)
    logger.info("Database schema initialized successfully.")

    # Seed default Admin and Employee accounts if not existing
    db = get_session()
    try:
        admin_user = db.query(User).filter(User.email == "admin@enterprise.ai").first()
        if not admin_user:
            admin_user = User(
                email="admin@enterprise.ai",
                full_name="Enterprise Admin",
                hashed_password=hash_pwd("admin123"),
                role="ADMIN",
                department="IT Administration"
            )
            db.add(admin_user)

        employee_user = db.query(User).filter(User.email == "alex.smith@enterprise.ai").first()
        if not employee_user:
            employee_user = User(
                email="alex.smith@enterprise.ai",
                full_name="Alex Smith",
                hashed_password=hash_pwd("employee123"),
                role="EMPLOYEE",
                department="Product Engineering"
            )
            db.add(employee_user)

        db.commit()
        logger.info("Initial seed accounts verified.")
    except Exception as e:
        logger.error(f"Error seeding database: {e}")
        db.rollback()
    finally:
        db.close()
