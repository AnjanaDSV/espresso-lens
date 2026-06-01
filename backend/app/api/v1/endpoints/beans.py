from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from app.api.deps import SessionDep
from app.models.bean import Bean, BeanCreate, BeanRead

router = APIRouter()


@router.post("/", response_model=BeanRead, status_code=status.HTTP_201_CREATED)
def create_bean(bean_in: BeanCreate, session: Session = Depends(SessionDep)) -> Bean:
    """Create a new coffee bean profile."""
    db_bean = Bean.model_validate(bean_in)
    session.add(db_bean)
    session.commit()
    session.refresh(db_bean)
    return db_bean


@router.get("/", response_model=List[BeanRead])
def read_beans(
    skip: int = 0, limit: int = 100, session: Session = Depends(SessionDep)
) -> List[Bean]:
    """Retrieve all available coffee bean profiles."""
    statement = select(Bean).offset(skip).limit(limit)
    beans = session.exec(statement).all()
    return list(beans)


@router.get("/{bean_id}", response_model=BeanRead)
def read_bean(bean_id: int, session: Session = Depends(SessionDep)) -> Bean:
    """Retrieve a specific coffee bean profile by its ID."""
    db_bean = session.get(Bean, bean_id)
    if not db_bean:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Coffee bean profile with ID {bean_id} not found",
        )
    return db_bean
