from typing import Dict, Any

LIST_AGENTS_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully retrieved agent list",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": [
                        {
                            "id": "agent_01",
                            "name": "research_agent",
                            "role": "Senior Researcher",
                            "goal": "Uncover groundbreaking concepts in AI",
                            "backstory": "A seasoned researcher with a passion for technology.",
                            "model_id": "model_01",
                            "tools": ["tool_01"],
                            "created_at": "2024-01-20T10:00:00Z",
                            "updated_at": "2024-01-20T10:00:00Z",
                        }
                    ],
                    "message": "Agents retrieved successfully",
                }
            }
        },
    }
}

GET_AGENT_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully retrieved agent information",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "agent_01",
                        "name": "research_agent",
                        "role": "Senior Researcher",
                        "goal": "Uncover groundbreaking concepts in AI",
                        "backstory": "A seasoned researcher with a passion for technology.",
                        "model_id": "model_01",
                        "tools": ["tool_01"],
                        "created_at": "2024-01-20T10:00:00Z",
                        "updated_at": "2024-01-20T10:00:00Z",
                    },
                    "message": "Agent retrieved successfully",
                }
            }
        },
    },
    404: {
        "description": "Agent not found",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error_code": "NOT_FOUND",
                    "message": "Agent not found: agent_01",
                }
            }
        },
    },
}

CREATE_AGENT_RESPONSES: Dict[int, Dict[str, Any]] = {
    201: {
        "description": "Successfully created agent",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "agent_01",
                        "name": "research_agent",
                        "role": "Senior Researcher",
                        "goal": "Uncover groundbreaking concepts in AI",
                        "backstory": "A seasoned researcher with a passion for technology.",
                        "model_id": "model_01",
                        "tools": ["tool_01"],
                        "created_at": "2024-01-20T10:00:00Z",
                        "updated_at": "2024-01-20T10:00:00Z",
                    },
                    "message": "Agent created successfully",
                }
            }
        },
    },
    404: {
        "description": "Model or Tool not found",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error_code": "NOT_FOUND",
                    "message": "Model not found: model_01",
                }
            }
        },
    },
}

UPDATE_AGENT_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully updated agent",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "agent_01",
                        "name": "research_agent",
                        "role": "Principal Researcher",
                        "goal": "Lead the research team to success",
                        "backstory": "A seasoned researcher with a passion for technology.",
                        "model_id": "model_01",
                        "tools": ["tool_01"],
                    },
                    "message": "Agent updated successfully",
                }
            }
        },
    },
    404: {
        "description": "Agent, Model, or Tool not found",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error_code": "NOT_FOUND",
                    "message": "Agent not found: agent_01",
                }
            }
        },
    },
}

DELETE_AGENT_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully deleted agent",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": True,
                    "message": "Agent deleted successfully",
                }
            }
        },
    },
    404: {
        "description": "Agent not found",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error_code": "NOT_FOUND",
                    "message": "Agent not found: agent_01",
                }
            }
        },
    },
}
