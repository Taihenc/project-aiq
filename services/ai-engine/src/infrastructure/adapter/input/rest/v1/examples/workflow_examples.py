from src.core.application.dto.workflow import (
    CreateWorkflowRequest,
    UpdateWorkflowRequest,
    WorkflowCompletionRequest,
    WorkflowCompletionResponse,
)

LIST_WORKFLOWS_RESPONSES = {
    200: {
        "description": "Workflows retrieved successfully",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "message": "Workflows retrieved successfully",
                    "data": [
                        {
                            "id": "wf_1",
                            "name": "Content Pipeline",
                            "description": "A workflow for content creation",
                            "process": "sequential",
                            "tasks": ["job_1", "job_2"],
                            "created_at": "2024-01-01T00:00:00Z",
                            "updated_at": "2024-01-01T00:00:00Z",
                        }
                    ],
                }
            }
        },
    }
}

GET_WORKFLOW_RESPONSES = {
    200: {
        "description": "Workflow retrieved successfully",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "message": "Workflow retrieved successfully",
                    "data": {
                        "id": "wf_1",
                        "name": "Content Pipeline",
                        "description": "A workflow for content creation",
                        "process": "sequential",
                        "tasks": ["job_1", "job_2"],
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z",
                    },
                }
            }
        },
    },
    404: {"description": "Workflow not found"},
}

CREATE_WORKFLOW_RESPONSES = {
    201: {
        "description": "Workflow created successfully",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "message": "Workflow created successfully",
                    "data": {
                        "id": "wf_1",
                        "name": "Content Pipeline",
                        "description": "A workflow for content creation",
                        "process": "sequential",
                        "tasks": ["job_1", "job_2"],
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-01T00:00:00Z",
                    },
                }
            }
        },
    },
    409: {"description": "Workflow with same name already exists"},
}

UPDATE_WORKFLOW_RESPONSES = {
    200: {
        "description": "Workflow updated successfully",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "message": "Workflow updated successfully",
                    "data": {
                        "id": "wf_1",
                        "name": "Content Pipeline V2",
                        "description": "Updated workflow",
                        "process": "hierarchical",
                        "tasks": ["job_1", "job_2", "job_3"],
                        "created_at": "2024-01-01T00:00:00Z",
                        "updated_at": "2024-01-02T00:00:00Z",
                    },
                }
            }
        },
    },
    404: {"description": "Workflow not found"},
}

DELETE_WORKFLOW_RESPONSES = {
    200: {
        "description": "Workflow deleted successfully",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "message": "Workflow deleted successfully",
                    "data": True,
                }
            }
        },
    },
    404: {"description": "Workflow not found"},
}

EXECUTE_WORKFLOW_RESPONSES = {
    200: {
        "description": "Workflow executed successfully",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "message": "Workflow executed successfully",
                    "data": {
                        "result": "Final output content...",
                        "usage": {
                            "total_tokens": 500,
                            "prompt_tokens": 200,
                            "completion_tokens": 300,
                            "successful_requests": 3,
                        },
                    },
                }
            }
        },
    },
    404: {"description": "Workflow or related entity not found"},
}
