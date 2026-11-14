from fastapi import APIRouter, Depends, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.deps import get_current_user, get_db
from app.core.errors import AuthenticationError, ConflictError
from app.core.security import create_access_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import Token, UserLogin, UserRegister, UserResponse

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post(
    "/register",
    response_model=Token,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new user account",
)
async def register(payload: UserRegister, db: AsyncSession = Depends(get_db)) -> Token:
    # Check if user with email already exists
    stmt = select(User).where(User.email == payload.email)
    existing_user = (await db.execute(stmt)).scalar_one_or_none()
    if existing_user:
        raise ConflictError(f"User with email '{payload.email}' already exists.")

    hashed_pw = hash_password(payload.password)
    new_user = User(
        email=payload.email,
        hashed_password=hashed_pw,
        is_active=True,
    )
    db.add(new_user)
    await db.flush()
    await db.refresh(new_user)

    token_str = create_access_token(data={"sub": str(new_user.id), "email": new_user.email})

    return Token(
        access_token=token_str,
        token_type="bearer",
        user=UserResponse.model_validate(new_user),
    )


@router.post(
    "/login", response_model=Token, summary="Authenticate user and return JWT access token"
)
async def login(payload: UserLogin, db: AsyncSession = Depends(get_db)) -> Token:
    stmt = select(User).where(User.email == payload.email)
    user = (await db.execute(stmt)).scalar_one_or_none()

    if not user or not verify_password(payload.password, user.hashed_password):
        raise AuthenticationError("Incorrect email or password.")

    if not user.is_active:
        raise AuthenticationError("Account is inactive.")

    token_str = create_access_token(data={"sub": str(user.id), "email": user.email})

    return Token(
        access_token=token_str,
        token_type="bearer",
        user=UserResponse.model_validate(user),
    )


@router.get(
    "/me", response_model=UserResponse, summary="Retrieve current authenticated user profile"
)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
) -> UserResponse:
    return UserResponse.model_validate(current_user)
