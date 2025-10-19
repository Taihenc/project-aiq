import re
from fastapi import APIRouter
from app.services import CrewService

router = APIRouter()

crew_service = CrewService()


@router.post(f"/")
async def create_crew():
    return crew_service.create_crew()


@router.get(f"/")
async def get_crews():
    return crew_service.get_crews()


@router.get("/{crew_id}")
async def get_crew(crew_id: str):
    return crew_service.get_crew(crew_id)


@router.put("/{crew_id}")
async def update_crew(crew_id: str):
    return crew_service.update_crew(crew_id)


@router.delete("/{crew_id}")
async def delete_crew(crew_id: str):
    return crew_service.delete_crew(crew_id)
