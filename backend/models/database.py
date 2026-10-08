import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import DeclarativeBase, sessionmaker

load_dotenv()

# Point to instance/database.db if present, or database.db in root/instance folder
DEFAULT_DB_PATH = "sqlite:///../instance/database.db"
DATABASE_URL = os.getenv("DATABASE_URL", os.getenv("DATABASE_URI", DEFAULT_DB_PATH))

# Only add check_same_thread=False for SQLite
connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args["check_same_thread"] = False

engine = create_engine(DATABASE_URL, connect_args=connect_args)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

class Base(DeclarativeBase):
    pass

from sqlalchemy.sql.expression import FunctionElement
from sqlalchemy.ext.compiler import compiles
from sqlalchemy.types import String

class date_trunc_custom(FunctionElement):
    name = 'date_trunc_custom'
    type = String()
    inherit_cache = True

@compiles(date_trunc_custom, 'sqlite')
def _date_trunc_sqlite(element, compiler, **kw):
    args = list(element.clauses)
    level_str = args[0].value
    col = compiler.process(args[1], **kw)
    
    if level_str == 'year':
        format_str = "'%Y-%m'"
    elif level_str == 'month':
        format_str = "'%Y-%W'"
    elif level_str == 'week':
        format_str = "'%Y-%m-%d'"
    elif level_str == 'day':
        format_str = "'%Y-%m-%d %H:00'"
    else:
        format_str = "'%Y-%m-%d'"
        
    return f"strftime({format_str}, {col})"

@compiles(date_trunc_custom, 'postgresql')
def _date_trunc_postgres(element, compiler, **kw):
    args = list(element.clauses)
    level_str = args[0].value
    col = compiler.process(args[1], **kw)
    
    if level_str == 'year':
        return f"to_char({col}, 'YYYY-MM')"
    elif level_str == 'month':
        return f"to_char({col}, 'IYYY-IW')"
    elif level_str == 'week':
        return f"to_char({col}, 'YYYY-MM-DD')"
    elif level_str == 'day':
        return f"to_char({col}, 'YYYY-MM-DD HH24:00')"
    else:
        return f"to_char({col}, 'YYYY-MM-DD')"

class string_agg_custom(FunctionElement):
    name = 'string_agg_custom'
    type = String()
    inherit_cache = True

@compiles(string_agg_custom, 'sqlite')
def _string_agg_sqlite(element, compiler, **kw):
    clauses = list(element.clauses)
    col = compiler.process(clauses[0], **kw)
    if len(clauses) > 1:
        sep = compiler.process(clauses[1], **kw)
        return f"group_concat({col}, {sep})"
    return f"group_concat({col})"

@compiles(string_agg_custom, 'postgresql')
def _string_agg_postgres(element, compiler, **kw):
    clauses = list(element.clauses)
    col = compiler.process(clauses[0], **kw)
    sep = "','"
    if len(clauses) > 1:
        sep = compiler.process(clauses[1], **kw)
    return f"string_agg({col}::text, {sep})"

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
