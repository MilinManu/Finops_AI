import os
import re
from typing import Optional, Any
from pydantic import BaseModel, EmailStr, Field
from fastapi import APIRouter, HTTPException, Depends, status
from fastapi.responses import JSONResponse

from backend.auth.db import (
    find_user_by_email,
    find_user_by_id,
    create_user,
    create_history_entry,
    get_user_history,
    delete_history_entry,
    clear_user_history,
)
from backend.auth.security import (
    hash_password,
    verify_password,
    generate_token,
    get_current_user,
)

router = APIRouter(tags=["Authentication & History"])

class RegisterRequest(BaseModel):
    fullName: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6, max_length=100)

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

@router.post("/register", status_code=status.HTTP_201_CREATED)
def register(request: RegisterRequest):
    clean_email = request.email.lower().strip()
    clean_full_name = request.fullName.strip()

    existing_user = find_user_by_email(clean_email)
    if existing_user:
        return JSONResponse(
            status_code=status.HTTP_409_CONFLICT,
            content={
                "status": "error",
                "message": "An account with this email address already exists.",
            },
        )

    pwd_hash = hash_password(request.password)
    user = create_user(
        full_name=clean_full_name,
        email=clean_email,
        password_hash=pwd_hash,
        role="USER",
    )

    token = generate_token(user["id"], user["email"], user["role"])

    return {
        "status": "success",
        "message": "User registered successfully",
        "data": {
            "token": token,
            "user": {
                "id": user["id"],
                "fullName": user["fullName"],
                "email": user["email"],
                "role": user["role"],
            },
        },
    }

@router.post("/login", status_code=status.HTTP_200_OK)
def login(request: LoginRequest):
    clean_email = request.email.lower().strip()
    user = find_user_by_email(clean_email)

    if not user:
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "status": "error",
                "message": "Invalid email address or password.",
            },
        )

    if not user["isActive"]:
        return JSONResponse(
            status_code=status.HTTP_403_FORBIDDEN,
            content={
                "status": "error",
                "message": "Your account has been disabled.",
            },
        )

    if not user.get("passwordHash") or not verify_password(request.password, user["passwordHash"]):
        return JSONResponse(
            status_code=status.HTTP_401_UNAUTHORIZED,
            content={
                "status": "error",
                "message": "Invalid email address or password.",
            },
        )

    token = generate_token(user["id"], user["email"], user["role"])

    return {
        "status": "success",
        "message": "Logged in successfully",
        "data": {
            "token": token,
            "user": {
                "id": user["id"],
                "fullName": user["fullName"],
                "email": user["email"],
                "role": user["role"],
            },
        },
    }

@router.get("/me", status_code=status.HTTP_200_OK)
def get_me(current_user: dict = Depends(get_current_user)):
    return {
        "status": "success",
        "data": {
            "user": {
                "id": current_user["id"],
                "fullName": current_user["fullName"],
                "email": current_user["email"],
                "role": current_user["role"],
                "isActive": current_user["isActive"],
                "createdAt": current_user["createdAt"],
            }
        },
    }

class HistoryCreateRequest(BaseModel):
    type: str  # 'prediction', 'zip_analysis', 'git_analysis'
    title: str
    summary: str
    inputs: Any
    results: Any

@router.get("/history", status_code=status.HTTP_200_OK)
def list_history(current_user: dict = Depends(get_current_user)):
    items = get_user_history(current_user["id"])
    return {"status": "success", "data": items}

@router.post("/history", status_code=status.HTTP_201_CREATED)
def create_history(request: HistoryCreateRequest, current_user: dict = Depends(get_current_user)):
    created = create_history_entry(
        user_id=current_user["id"],
        entry_type=request.type,
        title=request.title,
        summary=request.summary,
        inputs=request.inputs,
        results=request.results,
    )
    return {"status": "success", "data": created}

@router.delete("/history/{history_id}", status_code=status.HTTP_200_OK)
def delete_history(history_id: str, current_user: dict = Depends(get_current_user)):
    success = delete_history_entry(current_user["id"], history_id)
    return {"status": "success", "deleted": success}

@router.delete("/history", status_code=status.HTTP_200_OK)
def clear_all_history(current_user: dict = Depends(get_current_user)):
    success = clear_user_history(current_user["id"])
    return {"status": "success", "cleared": success}
