from fastapi import APIRouter, HTTPException, Path, Body
from app.services import CrewService
from app.models import CrewConfig
from app.schemas import BaseResponse

router = APIRouter()

crew_service = CrewService()


@router.post(
    "/",
    response_model=BaseResponse,
    summary="Create New Crew Configuration",
    description="Create a new crew configuration with specified workflow, process, and agents",
    responses={
        200: {
            "description": "Successfully created crew configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Crew config created successfully",
                        "data": {
                            "config": {
                                "name": "document_search_crew",
                                "description": "Crew for RAG-based document retrieval and response generation",
                                "process": "sequential",
                                "verbose": False,
                                "workflow": [
                                    {
                                        "name": "validate_and_route",
                                        "description": "Analyze user query and determine routing decision",
                                        "expected_output": "OrchestratorOutput (decision, reasoning, relevant fields)",
                                        "agent": "orchestrator",
                                        "output_json": '{"decision": "str", "reasoning": "str"}',
                                        "context": [],
                                    },
                                    {
                                        "name": "search_and_analyze",
                                        "description": "Perform semantic search based on orchestrator decision",
                                        "expected_output": "RAGAnalyzerOutput (search_result or skip flag)",
                                        "agent": "rag_analyzer",
                                        "output_json": '{"decision": "str", "reasoning": "str", "search_attempts": "List[str]", "search_result": "dict", "search_success": "bool"}',
                                        "context": ["validate_and_route"],
                                    },
                                    {
                                        "name": "generate_response",
                                        "description": "Generate final response based on search results",
                                        "expected_output": "ChatResponderOutput (response, type, sources, language)",
                                        "agent": "chat_responder",
                                        "output_json": '{"response": "str", "response_type": "str", "sources_used": "List[str]", "language": "str"}',
                                        "context": [
                                            "validate_and_route",
                                            "search_and_analyze",
                                        ],
                                    },
                                ],
                            }
                        },
                    }
                }
            },
        },
        400: {
            "description": "Failed to create crew configuration",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to create crew config"}
                }
            },
        },
        409: {
            "description": "Crew already exists",
            "content": {
                "application/json": {
                    "example": {"detail": f"Crew 'document_search_crew' already exists"}
                }
            },
        },
    },
)
async def create_crew_config(
    config: CrewConfig = Body(
        example={
            "name": "document_search_crew",
            "description": "Crew for RAG-based document retrieval and response generation",
            "process": "sequential",
            "verbose": False,
            "workflow": [
                {
                    "name": "validate_and_route",
                    "description": "Analyze user query and determine routing decision",
                    "expected_output": "OrchestratorOutput (decision, reasoning, relevant fields)",
                    "agent": "orchestrator",
                    "output_json": '{"decision": "str", "reasoning": "str"}',
                    "context": [],
                },
                {
                    "name": "search_and_analyze",
                    "description": "Perform semantic search based on orchestrator decision",
                    "expected_output": "RAGAnalyzerOutput (search_result or skip flag)",
                    "agent": "rag_analyzer",
                    "output_json": '{"decision": "str", "reasoning": "str", "search_attempts": "List[str]", "search_result": "dict", "search_success": "bool"}',
                    "context": ["validate_and_route"],
                },
                {
                    "name": "generate_response",
                    "description": "Generate final response based on search results",
                    "expected_output": "ChatResponderOutput (response, type, sources, language)",
                    "agent": "chat_responder",
                    "output_json": '{"response": "str", "response_type": "str", "sources_used": "List[str]", "language": "str"}',
                    "context": ["validate_and_route", "search_and_analyze"],
                },
            ],
        },
    )
):
    if crew_service.get_crew_config(config.name):
        raise HTTPException(
            status_code=409, detail=f"Crew '{config.name}' already exists"
        )
    if not crew_service.create_crew_config(config):
        raise HTTPException(status_code=400, detail="Failed to create crew config")
    return BaseResponse(
        success=True,
        message="Crew config created successfully",
        data={
            "config": config,
        },
    )


@router.get(
    "/",
    response_model=BaseResponse,
    summary="Get All Available Crew Configurations",
    description="Retrieve all available crew configurations in the system with their details",
    responses={
        200: {
            "description": "Successfully retrieved crew configurations list",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Crew configs fetched successfully",
                        "data": {
                            "configs": {
                                "document_search_crew": {
                                    "name": "document_search_crew",
                                    "description": "Crew for RAG-based document retrieval and response generation",
                                    "process": "sequential",
                                    "verbose": False,
                                    "workflow": [
                                        {
                                            "name": "validate_and_route",
                                            "description": "Analyze user query and determine routing decision",
                                            "expected_output": "OrchestratorOutput (decision, reasoning, relevant fields)",
                                            "agent": "orchestrator",
                                            "output_json": '{"decision": "str", "reasoning": "str"}',
                                            "context": [],
                                        },
                                        {
                                            "name": "search_and_analyze",
                                            "description": "Perform semantic search based on orchestrator decision",
                                            "expected_output": "RAGAnalyzerOutput (search_result or skip flag)",
                                            "agent": "rag_analyzer",
                                            "output_json": '{"decision": "str", "reasoning": "str", "search_attempts": "List[str]", "search_result": "dict", "search_success": "bool"}',
                                            "context": ["validate_and_route"],
                                        },
                                        {
                                            "name": "generate_response",
                                            "description": "Generate final response based on search results",
                                            "expected_output": "ChatResponderOutput (response, type, sources, language)",
                                            "agent": "chat_responder",
                                            "output_json": '{"response": "str", "response_type": "str", "sources_used": "List[str]", "language": "str"}',
                                            "context": [
                                                "validate_and_route",
                                                "search_and_analyze",
                                            ],
                                        },
                                    ],
                                }
                            },
                            "count": 1,
                        },
                    }
                }
            },
        }
    },
)
async def get_crews_config():
    configs = crew_service.get_crews_config()
    return BaseResponse(
        success=True,
        message="Crew configs fetched successfully",
        data={
            "configs": configs,
            "count": len(configs),
        },
    )


@router.get(
    "/{crew}",
    response_model=BaseResponse,
    summary="Get Specific Crew Configuration",
    description="Retrieve configuration details for a specific crew",
    responses={
        200: {
            "description": "Successfully retrieved crew configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Crew config fetched successfully",
                        "data": {
                            "config": {
                                "name": "document_search_crew",
                                "description": "Crew for RAG-based document retrieval and response generation",
                                "process": "sequential",
                                "verbose": False,
                                "workflow": [
                                    {
                                        "name": "validate_and_route",
                                        "description": "Analyze user query and determine routing decision",
                                        "expected_output": "OrchestratorOutput (decision, reasoning, relevant fields)",
                                        "agent": "orchestrator",
                                        "output_json": '{"decision": "str", "reasoning": "str"}',
                                        "context": [],
                                    },
                                    {
                                        "name": "search_and_analyze",
                                        "description": "Perform semantic search based on orchestrator decision",
                                        "expected_output": "RAGAnalyzerOutput (search_result or skip flag)",
                                        "agent": "rag_analyzer",
                                        "output_json": '{"decision": "str", "reasoning": "str", "search_attempts": "List[str]", "search_result": "dict", "search_success": "bool"}',
                                        "context": ["validate_and_route"],
                                    },
                                    {
                                        "name": "generate_response",
                                        "description": "Generate final response based on search results",
                                        "expected_output": "ChatResponderOutput (response, type, sources, language)",
                                        "agent": "chat_responder",
                                        "output_json": '{"response": "str", "response_type": "str", "sources_used": "List[str]", "language": "str"}',
                                        "context": [
                                            "validate_and_route",
                                            "search_and_analyze",
                                        ],
                                    },
                                ],
                            }
                        },
                    }
                }
            },
        },
        404: {
            "description": "Crew not found",
            "content": {
                "application/json": {
                    "example": {"detail": f"Crew 'document_search_crew' not found"}
                }
            },
        },
    },
)
async def get_crew_config(
    crew: str = Path(
        ...,
        description="Name of the crew to retrieve configuration for",
        example="document_search_crew",
        min_length=1,
        max_length=50,
    )
):
    config = crew_service.get_crew_config(crew)
    if not config:
        raise HTTPException(status_code=404, detail=f"Crew '{crew}' not found")
    return BaseResponse(
        success=True,
        message="Crew config fetched successfully",
        data={
            "config": config,
        },
    )


@router.put(
    "/",
    response_model=BaseResponse,
    summary="Update Crew Configuration",
    description="Update configuration for an existing crew using name from request body",
    responses={
        200: {
            "description": "Successfully updated crew configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Crew config updated successfully",
                        "data": {
                            "config": {
                                "name": "document_search_crew",
                                "description": "Enhanced crew for RAG-based document retrieval and response generation",
                                "process": "sequential",
                                "verbose": True,
                                "workflow": [
                                    {
                                        "name": "validate_and_route",
                                        "description": "Analyze user query and determine routing decision",
                                        "expected_output": "OrchestratorOutput (decision, reasoning, relevant fields)",
                                        "agent": "orchestrator",
                                        "output_json": '{"decision": "str", "reasoning": "str"}',
                                        "context": [],
                                    },
                                    {
                                        "name": "search_and_analyze",
                                        "description": "Perform semantic search based on orchestrator decision",
                                        "expected_output": "RAGAnalyzerOutput (search_result or skip flag)",
                                        "agent": "rag_analyzer",
                                        "output_json": '{"decision": "str", "reasoning": "str", "search_attempts": "List[str]", "search_result": "dict", "search_success": "bool"}',
                                        "context": ["validate_and_route"],
                                    },
                                    {
                                        "name": "generate_response",
                                        "description": "Generate final response based on search results",
                                        "expected_output": "ChatResponderOutput (response, type, sources, language)",
                                        "agent": "chat_responder",
                                        "output_json": '{"response": "str", "response_type": "str", "sources_used": "List[str]", "language": "str"}',
                                        "context": [
                                            "validate_and_route",
                                            "search_and_analyze",
                                        ],
                                    },
                                ],
                            }
                        },
                    }
                }
            },
        },
        400: {
            "description": "Failed to update crew configuration",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to update crew config"}
                }
            },
        },
        404: {
            "description": "Crew not found",
            "content": {
                "application/json": {
                    "example": {"detail": f"Crew 'document_search_crew' not found"}
                }
            },
        },
    },
)
async def update_crew_config(
    config: CrewConfig = Body(
        example={
            "name": "document_search_crew",
            "description": "Enhanced crew for RAG-based document retrieval and response generation",
            "process": "sequential",
            "verbose": True,
            "workflow": [
                {
                    "name": "validate_and_route",
                    "description": "Analyze user query and determine routing decision",
                    "expected_output": "OrchestratorOutput (decision, reasoning, relevant fields)",
                    "agent": "orchestrator",
                    "output_json": '{"decision": "str", "reasoning": "str"}',
                    "context": [],
                },
                {
                    "name": "search_and_analyze",
                    "description": "Perform semantic search based on orchestrator decision",
                    "expected_output": "RAGAnalyzerOutput (search_result or skip flag)",
                    "agent": "rag_analyzer",
                    "output_json": '{"decision": "str", "reasoning": "str", "search_attempts": "List[str]", "search_result": "dict", "search_success": "bool"}',
                    "context": ["validate_and_route"],
                },
                {
                    "name": "generate_response",
                    "description": "Generate final response based on search results",
                    "expected_output": "ChatResponderOutput (response, type, sources, language)",
                    "agent": "chat_responder",
                    "output_json": '{"response": "str", "response_type": "str", "sources_used": "List[str]", "language": "str"}',
                    "context": ["validate_and_route", "search_and_analyze"],
                },
            ],
        },
    ),
):
    existing_crew = crew_service.get_crew_config(config.name)
    if not existing_crew:
        raise HTTPException(status_code=404, detail=f"Crew '{config.name}' not found")

    if not crew_service.update_crew_config(config.name, config):
        raise HTTPException(status_code=400, detail="Failed to update crew config")
    return BaseResponse(
        success=True,
        message="Crew config updated successfully",
        data={
            "config": config,
        },
    )


@router.delete(
    "/{crew}",
    response_model=BaseResponse,
    summary="Delete Crew Configuration",
    description="Delete an existing crew configuration",
    responses={
        200: {
            "description": "Successfully deleted crew configuration",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "message": "Crew config deleted successfully",
                        "data": {"crew": "document_search_crew"},
                    }
                }
            },
        },
        400: {
            "description": "Failed to delete crew configuration",
            "content": {
                "application/json": {
                    "example": {"detail": "Failed to delete crew config"}
                }
            },
        },
        404: {
            "description": "Crew not found",
            "content": {
                "application/json": {
                    "example": {"detail": f"Crew 'document_search_crew' not found"}
                }
            },
        },
    },
)
async def delete_crew_config(
    crew: str = Path(
        ...,
        description="Name of the crew to delete",
        example="document_search_crew",
        min_length=1,
        max_length=50,
    )
):
    existing_crew = crew_service.get_crew_config(crew)
    if not existing_crew:
        raise HTTPException(status_code=404, detail=f"Crew '{crew}' not found")

    if not crew_service.delete_crew_config(crew):
        raise HTTPException(status_code=400, detail="Failed to delete crew config")
    return BaseResponse(
        success=True,
        message="Crew config deleted successfully",
        data={
            "crew": crew,
        },
    )
