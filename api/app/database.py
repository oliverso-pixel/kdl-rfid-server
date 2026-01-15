from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from pydantic_settings import BaseSettings
import urllib.parse

class Settings(BaseSettings):
    DB_CONNECTION_STRING: str
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    class Config:
        env_file = ".env"

settings = Settings()

encoded_connection_string = urllib.parse.quote_plus(settings.DB_CONNECTION_STRING)
sqlalchemy_url = f"mssql+pyodbc:///?odbc_connect={encoded_connection_string}"

# 建立 SQL Server 連線
engine = create_engine(sqlalchemy_url)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()