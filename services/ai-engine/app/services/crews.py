import json
import typing
from crewai import Crew, Task
from typing import Any, Dict, Optional, get_type_hints
from fastapi import HTTPException
from pydantic import BaseModel, create_model
from pathlib import Path

from app.models.crews import CrewConfig
from app.schemas.base import BaseResponse
from app.services.agents import AgentService


class CrewService:

    def __init__(self):
        self.agent_service = AgentService()
        self._crew_configs: Dict[str, CrewConfig] = self._load_crews()

    # ============================================================================
    # Helper Methods
    # ============================================================================

    def _load_crews(self) -> Dict[str, CrewConfig]:
        """Load crews configuration from JSON file."""
        config_path = Path(__file__).parent.parent / "config" / "crews.json"
        with open(config_path, "r", encoding="utf-8") as f:
            crews_data = json.load(f) or {}

        crews = {}
        for name, config_data in crews_data.items():
            crews[name] = CrewConfig(**config_data)

        return crews

    def _json_to_pydantic_class(self, class_name: str, schema_json: str) -> BaseModel:
        try:
            schema = json.loads(schema_json)
        except json.JSONDecodeError as e:
            raise ValueError(f"Invalid JSON: {e}")

        if not isinstance(schema, dict):
            raise TypeError("Schema JSON must represent an object (dict).")

        # ใช้ eval ภายใต้ context ที่ปลอดภัย (แค่ builtins + typing)
        safe_globals = {"__builtins__": {}, **typing.__dict__}

        fields = {}
        for key, type_str in schema.items():
            try:
                py_type = eval(type_str, safe_globals)
            except Exception:
                py_type = Any
            fields[key] = (py_type, ...)

        # สร้าง class runtime
        return create_model(class_name, **fields)

    # ============================================================================
    # Crew Config CRUD Operations
    # ============================================================================

    def create_crew_config(self, config: CrewConfig) -> BaseResponse:
        try:
            if config.name in self._crew_configs:
                raise HTTPException(
                    status_code=409, detail=f"Crew '{config.name}' already exists"
                )
            self._crew_configs[config.name] = config
            return BaseResponse(
                success=True,
                message="Crew config created successfully",
                data={"config": config},
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def get_crews_config(self) -> BaseResponse:
        try:
            return BaseResponse(
                success=True,
                message="Crew configs fetched successfully",
                data={"configs": self._crew_configs, "count": len(self._crew_configs)},
            )
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def get_crew_config(self, crew: str) -> BaseResponse:
        try:
            config = self._crew_configs.get(crew)
            if not config:
                raise HTTPException(status_code=404, detail=f"Crew '{crew}' not found")
            return BaseResponse(
                success=True,
                message="Crew config fetched successfully",
                data={"config": config},
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def update_crew_config(self, config: CrewConfig) -> BaseResponse:
        try:
            if config.name not in self._crew_configs:
                raise HTTPException(
                    status_code=404, detail=f"Crew '{config.name}' not found"
                )
            self._crew_configs[config.name] = config
            return BaseResponse(
                success=True,
                message="Crew config updated successfully",
                data={"config": config},
            )
        except HTTPException:
            raise
        except ValueError as e:
            raise HTTPException(status_code=400, detail=f"Validation error: {str(e)}")
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    def delete_crew_config(self, crew: str) -> BaseResponse:
        try:
            if crew not in self._crew_configs:
                raise HTTPException(status_code=404, detail=f"Crew '{crew}' not found")
            del self._crew_configs[crew]
            return BaseResponse(
                success=True,
                message="Crew config deleted successfully",
                data={"crew": crew},
            )
        except HTTPException:
            raise
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Internal error: {str(e)}")

    # ============================================================================
    # Get Crew Instance
    # ============================================================================

    def get_crew(self, crew: str) -> Optional[Crew]:
        config = self._crew_configs.get(crew)
        if not config:
            return None

        tasks = []
        for task in config.workflow:
            DynamicModel = self._json_to_pydantic_class(
                f"{task.name}_Output", task.output_json
            )

            task_obj = Task(
                name=task.name,
                description=task.description,
                expected_output=task.expected_output,
                agent=self.agent_service.get_agent(task.agent),
                output_pydantic=DynamicModel,
            )
            tasks.append(task_obj)

        return Crew(
            name=config.name,
            description=config.description,
            process=config.process,
            verbose=config.verbose,
            tasks=tasks,
        )
