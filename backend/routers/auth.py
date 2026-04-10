import uuid
from passlib.hash import bcrypt  # for password hashing
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import database, models, schemas
from backend.deps import get_current_user
from google.oauth2 import id_token
from google.auth.transport import requests
import os

router = APIRouter(prefix="/auth", tags=["Authentication"])

# Dependency to get DB session
def get_db():
    db = database.SessionLocal()
    try:
        yield db
    finally:
        db.close()

# ---------------- Signup ----------------
@router.post("/signup")
def signup(user: schemas.UserCreate, db: Session = Depends(get_db)):
    # Check if user already exists
    existing_user = db.query(models.User).filter(models.User.username == user.username).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username already exists")
    existing_email = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_email:
        raise HTTPException(status_code=400, detail="Email already exists")

    # Hash password
    hashed_password = bcrypt.hash(user.password)

    # Create user
    new_user = models.User(
    user_id=str(uuid.uuid4()),       # generate UUID
    username=user.username,          # full name entered
    email=user.email,
    pass_word=hashed_password
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    # Return user object (matches UserResponse schema)
    return {
        "status": "success",
        "message": f"Welcome {new_user.username}",
        "user_id": new_user.user_id,
        "username": new_user.username,
        "email": new_user.email
    }

# ---------------- Login ----------------
@router.post("/login")
def login(user: schemas.UserLogin, db: Session = Depends(get_db)):
    # Look up by username OR email (lets users log in with either)
    db_user = (
        db.query(models.User)
        .filter(
            (models.User.username == user.username)
            | (models.User.email == user.username)
        )
        .first()
    )
    if not db_user:
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Verify password
    if not bcrypt.verify(user.password, db_user.pass_word):
        raise HTTPException(status_code=401, detail="Invalid username or password")

    # Return user_id so frontend can send it back in future requests
    return {
        "status": "success",
        "message": f"Welcome {db_user.username}",
        "user_id": db_user.user_id,   # 🔑 include user_id
        "username": db_user.username,
        "email": db_user.email
    }
##google login##
@router.post("/google")
def google_login(data: dict, db: Session = Depends(get_db)):
    token = data.get("token")
    try:
        idinfo = id_token.verify_oauth2_token(
            token,
            requests.Request(),
            os.getenv("GOOGLE_CLIENT_ID", "1050359938315-tv3elrkp7ih5clc8u6odtsj6cjosdh9t.apps.googleusercontent.com")
        )

        email = idinfo.get("email")
        name = idinfo.get("name")

        user = db.query(models.User).filter(models.User.email == email).first()

        if not user:
            user = models.User(
                user_id=str(uuid.uuid4()),
                username=name,
                email=email,
                pass_word=bcrypt.hash("GOOGLE_AUTH")
            )
            db.add(user)
            db.commit()
            db.refresh(user)

        return {
            "message": "Google login successful",
            "user_id": user.user_id,
            "email": user.email,
            "username": name
        }

    except Exception:
        raise HTTPException(status_code=401, detail="Invalid Google token")


@router.get("/me")
def me(user=Depends(get_current_user)):
    return {
        "user_id": user.user_id,
        "username": user.username,
        "email": user.email,
    }


@router.post("/change-password")
def change_password(
    payload: dict,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    current_password = (payload or {}).get("current_password")
    new_password = (payload or {}).get("new_password")
    if not current_password or not new_password:
        raise HTTPException(status_code=400, detail="Current and new password are required")
    if len(new_password) < 6:
        raise HTTPException(status_code=400, detail="New password must be at least 6 characters")
    if not bcrypt.verify(current_password, user.pass_word):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    user.pass_word = bcrypt.hash(new_password)
    db.add(user)
    db.commit()
    return {"message": "Password updated successfully"}


@router.post("/logout-all")
def logout_all_devices(user=Depends(get_current_user)):
    # Stateless token system: client clears auth on all devices when possible.
    return {"message": "Logged out from all devices (client-side token clear required)."}
