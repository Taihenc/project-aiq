from typing import List
from fastapi import HTTPException
from app.services.crews import CrewService
from app.models.completions import Message
import json


class CompletionService:
    def __init__(self):
        self.crew_service = CrewService()

    async def create_crew_completion(self, crew: str, messages: List[Message]):
        try:
            crew_instance = self.crew_service.get_crew(crew)
            if not crew_instance:
                raise HTTPException(status_code=404, detail=f"Crew '{crew}' not found")

            if not messages or not isinstance(messages, list):
                raise HTTPException(status_code=400, detail="Invalid messages")

            last_message = messages[-1]
            if not hasattr(last_message, "role") or not hasattr(
                last_message, "content"
            ):
                raise HTTPException(status_code=400, detail="Invalid message format")

            if last_message.role != "user":
                raise HTTPException(
                    status_code=400, detail="Last message must be from user"
                )

            user_query = last_message.content
            if not user_query or not isinstance(user_query, str):
                raise HTTPException(
                    status_code=400, detail="User query cannot be empty"
                )

            chat_history = []
            for msg in messages[:-1]:
                if not hasattr(msg, "role") or not hasattr(msg, "content"):
                    raise HTTPException(
                        status_code=400, detail="Invalid message format in chat history"
                    )
                chat_history.append({"role": msg.role, "content": msg.content})

            inputs = {
                "user_query": user_query,
                "chat_history": chat_history,
                "context": "",
            }

            result = crew_instance.kickoff(inputs=inputs)

            if hasattr(result, "tasks_output") and result.tasks_output:
                last_task = result.tasks_output[-1]
                if hasattr(last_task, "raw") and last_task.raw:
                    try:
                        return json.loads(last_task.raw)
                    except json.JSONDecodeError:
                        pass

            return {"message": str(result)}
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error processing crew: {str(e)}"
            )
