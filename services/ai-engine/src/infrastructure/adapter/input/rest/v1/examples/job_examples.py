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
                    "error_code": "NOT_FOUND",
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
    },
    404: {
        "description": "Agent not found",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error_code": "NOT_FOUND",
                    "message": "Agent not found: researcher_agent",
                }
            }
        },
    },
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
    },
    404: {
        "description": "Job or Agent not found",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error_code": "NOT_FOUND",
                    "message": "Job not found: job_01",
                }
            }
        },
    },
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
    },
    404: {
        "description": "Job not found",
        "content": {
            "application/json": {
                "example": {
                    "success": False,
                    "error_code": "NOT_FOUND",
                    "message": "Job not found: job_01",
                }
            }
        },
    },
}

EXECUTE_JOB_RESPONSES: Dict[int, Dict[str, Any]] = {
    200: {
        "description": "Successfully executed job",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "result": {
                            "report_title": "Renewable Energy Trends 2024",
                            "technologies": ["Solar", "Wind", "Hydro"],
                            "summary": "Solar is growing fast.",
                        }
                    },
                    "message": "Job executed successfully",
                }
            }
        },
    },
    404: {
        "description": "Job/Agent/Model not found",
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
