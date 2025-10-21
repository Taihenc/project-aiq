from typing import List
from fastapi import HTTPException
from app.services.crews import CrewService
from app.models.completions import Message


class CompletionService:
    def __init__(self):
        self.crew_service = CrewService()

    async def create_crew_completion(self, crew: str, messages: List[Message]):
        # ตรวจสอบว่า crew มีอยู่หรือไม่
        crew_instance = self.crew_service.get_crew(crew)
        if not crew_instance:
            raise HTTPException(status_code=404, detail=f"Crew '{crew}' not found")

        # แยก messages เป็น user_query และ chat_history
        if not messages:
            raise HTTPException(status_code=400, detail="Messages list cannot be empty")

        # ดึง message สุดท้ายเป็น user_query
        last_message = messages[-1]
        if last_message.role.value != "user":
            raise HTTPException(
                status_code=400, detail="Last message must be from user"
            )

        user_query = last_message.content

        # แปลง messages ก่อนหน้าเป็น chat_history
        chat_history = []
        for msg in messages[:-1]:  # ยกเว้น message สุดท้าย
            chat_history.append({"role": msg.role.value, "content": msg.content})

        # เตรียม inputs สำหรับ crew
        inputs = {
            "user_query": user_query,
            "chat_history": chat_history,
            "context": "",
        }

        # เรียก crew.kickoff()
        try:
            result = crew_instance.kickoff(inputs=inputs)
            return {"message": str(result)}
        except Exception as e:
            raise HTTPException(
                status_code=500, detail=f"Error processing crew: {str(e)}"
            )
