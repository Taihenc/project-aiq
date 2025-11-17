from typing import List
from fastapi import HTTPException
from app.services.crews import CrewService
from app.schemas.base import BaseResponse
from app.schemas.completions import CrewRequest


class CompletionService:
    def __init__(self):
        self.crew_service = CrewService()

    async def create_crew_completion(self, crew: str, request: CrewRequest):
        try:
            crew_instance = self.crew_service.get_crew(crew)
            if not crew_instance:
                raise HTTPException(status_code=404, detail=f"Crew '{crew}' not found")
            result = crew_instance.kickoff(inputs=request.inputs)
            return BaseResponse(
                success=True,
                message="Crew completion created successfully",
                data=result,
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error processing crew: {str(e)}"
            )
