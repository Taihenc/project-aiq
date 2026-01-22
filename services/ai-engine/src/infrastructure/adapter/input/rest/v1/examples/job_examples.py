from typing import Dict, Any

LIST_JOBS_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully retrieved job list",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": [
                        {
                            "id": "job_01",
                            "name": "Market Research Task",
                            "agent": "researcher_agent",
                            "task_description": "Analyze trends",
                            "expected_output": "Report",
                            "context": ["prev_job"],
                            "created_at": "2024-01-20T10:00:00Z",
                            "updated_at": "2024-01-20T10:00:00Z",
                        }
                    ],
                    "message": "Jobs retrieved successfully",
                }
            }
        },
    }
}

GET_JOB_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully retrieved job information",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "job_01",
                        "name": "Market Research Task",
                        "agent": "researcher_agent",
                        "task_description": "Analyze trends",
                        "expected_output": "Report",
                        "context": ["prev_job"],
                        "created_at": "2024-01-20T10:00:00Z",
                        "updated_at": "2024-01-20T10:00:00Z",
                    },
                    "message": "Job retrieved successfully",
                }
            }
        },
    },
    404: {
        "description": "Job not found",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error_code": "RESOURCE_NOT_FOUND",
                    "message": "Job not found: job_01",
                }
            }
        },
    },
}

CREATE_JOB_RESPONSES: Dict[int, Dict[str, Any]] = {
    201: {
        "description": "Successfully created job",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "job_01",
                        "name": "Market Research Task",
                        "agent": "researcher_agent",
                        "task_description": "Analyze trends",
                        "expected_output": "Report",
                        "context": ["prev_job"],
                        "created_at": "2024-01-20T10:00:00Z",
                        "updated_at": "2024-01-20T10:00:00Z",
                    },
                    "message": "Job created successfully",
                }
            }
        },
    }
}

UPDATE_JOB_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully updated job",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "job_01",
                        "name": "Market Research Task",
                        "agent": "researcher_agent",
                        "task_description": "Analyze trends",
                        "expected_output": "Detailed Report",
                    },
                    "message": "Job updated successfully",
                }
            }
        },
    }
}

DELETE_JOB_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully deleted job",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": True,
                    "message": "Job deleted successfully",
                }
            }
        },
    }
}
