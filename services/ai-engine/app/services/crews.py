import json
import typing
from crewai import Crew, Task
from typing import Any, Dict, Optional, get_type_hints
from pydantic import BaseModel, create_model

from app.config import settings
from app.models import CrewConfig
from app.services import AgentService


class CrewService:

    def __init__(self):
        self.agent_service = AgentService()
        self._crew_configs: Dict[str, CrewConfig] = settings.CREWS

    # ============================================================================
    # Crew Config CRUD Operations
    # ============================================================================

    def create_crew_config(self, config: CrewConfig) -> bool:
        if config.name in self._crew_configs:
            return False
        self._crew_configs[config.name] = config
        return True

    def get_crews_config(self) -> Dict[str, CrewConfig]:
        return self._crew_configs

    def get_crew_config(self, crew: str) -> Optional[CrewConfig]:
        return self._crew_configs.get(crew)

    def update_crew_config(self, crew: str, config: CrewConfig) -> bool:
        if crew not in self._crew_configs:
            return False
        self._crew_configs[crew] = config
        return True

    def delete_crew_config(self, crew: str) -> bool:
        if crew not in self._crew_configs:
            return False
        del self._crew_configs[crew]
        return True

    # ============================================================================
    # Crew Runtime Operations
    # ============================================================================

    def get_crew(self, crew: str) -> Optional[Crew]:
        config = self.get_crew_config(crew)
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
