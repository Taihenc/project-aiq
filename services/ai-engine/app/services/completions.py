from typing import List
from fastapi import HTTPException
from app.services.crews import CrewService
from app.utils.response import Response
from app.schemas.completions import CrewRequest
from app.models.completions import CompletionData, TaskOutputSummary, TokenUsage


class CompletionService:
    def __init__(self):
        self.crew_service = CrewService()

    async def create_crew_completion(self, crew: str, request: CrewRequest):
        try:
            crew_instance = self.crew_service.get_crew(crew)
            if not crew_instance:
                raise HTTPException(status_code=404, detail=f"Crew '{crew}' not found")

            result = crew_instance.kickoff(inputs=request.inputs)

            # Extract only necessary data
            completion_data = CompletionData(
                raw=getattr(result, "raw", ""),
                json_dict=getattr(result, "json_dict", None),
                token_usage=TokenUsage(
                    total_tokens=getattr(result.token_usage, "total_tokens", 0),
                    prompt_tokens=getattr(result.token_usage, "prompt_tokens", 0),
                    cached_prompt_tokens=getattr(
                        result.token_usage, "cached_prompt_tokens", 0
                    ),
                    completion_tokens=getattr(
                        result.token_usage, "completion_tokens", 0
                    ),
                    successful_requests=getattr(
                        result.token_usage, "successful_requests", 0
                    ),
                ),
                tasks_output=[
                    TaskOutputSummary(
                        name=task.name,
                        raw=task.raw,
                    )
                    for task in result.tasks_output
                ],
            )

            return Response(
                success=True,
                message="Crew completion created successfully",
                data=completion_data,
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error processing crew: {str(e)}"
            )
