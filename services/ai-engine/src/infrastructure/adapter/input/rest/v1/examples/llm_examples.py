LIST_MODELS_RESPONSES = {
    200: {
        "description": "List of available models",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": [
                        {
                            "id": "model_123",
                            "name": "gpt-4-turbo",
                            "provider": "openai",
                            "description": "Powerful model",
                            "config": {
                                "context_window": 128000,
                                "temperature": 0.7,
                                "max_tokens": 4096,
                                "top_p": 1.0,
                                "frequency_penalty": 0.0,
                                "presence_penalty": 0.0,
                            },
                            "is_active": True,
                            "created_at": "2024-01-20T10:00:00Z",
                            "updated_at": "2024-01-20T10:00:00Z",
                        }
                    ],
                    "message": None,
                    "meta": None,
                }
            }
        },
    }
}

GET_MODEL_RESPONSES = {
    200: {
        "description": "Model details",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "model_123",
                        "name": "gpt-4-turbo",
                        "provider": "openai",
                        "description": "Powerful model",
                        "config": {
                            "context_window": 128000,
                            "temperature": 0.7,
                            "max_tokens": 4096,
                            "top_p": 1.0,
                            "frequency_penalty": 0.0,
                            "presence_penalty": 0.0,
                        },
                        "is_active": True,
                        "created_at": "2024-01-20T10:00:00Z",
                        "updated_at": "2024-01-20T10:00:00Z",
                    },
                    "message": None,
                    "meta": None,
                }
            }
        },
    },
    404: {
        "description": "Model not found",
        "content": {"application/json": {"example": {"detail": "Model not found"}}},
    },
}

CREATE_MODEL_RESPONSES = {
    200: {
        "description": "Model created successfully",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "model_123",
                        "name": "gpt-4-turbo",
                        "provider": "openai",
                        "description": "Powerful model",
                        "config": {
                            "context_window": 128000,
                            "temperature": 0.7,
                            "max_tokens": 4096,
                            "top_p": 1.0,
                            "frequency_penalty": 0.0,
                            "presence_penalty": 0.0,
                        },
                        "is_active": True,
                        "created_at": "2024-01-20T10:00:00Z",
                        "updated_at": "2024-01-20T10:00:00Z",
                    },
                    "message": None,
                    "meta": None,
                }
            }
        },
    }
}

UPDATE_MODEL_RESPONSES = {
    200: {
        "description": "Model updated successfully",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": {
                        "id": "model_123",
                        "name": "gpt-4-turbo",
                        "provider": "openai",
                        "description": "Updated description",
                        "config": {
                            "context_window": 128000,
                            "temperature": 0.8,
                            "max_tokens": 8192,
                            "top_p": 1.0,
                            "frequency_penalty": 0.0,
                            "presence_penalty": 0.0,
                        },
                        "is_active": False,
                        "created_at": "2024-01-20T10:00:00Z",
                        "updated_at": "2024-01-20T10:05:00Z",
                    },
                    "message": None,
                    "meta": None,
                }
            }
        },
    },
    404: {
        "description": "Model not found",
        "content": {"application/json": {"example": {"detail": "Model not found"}}},
    },
}

DELETE_MODEL_RESPONSES = {
    200: {
        "description": "Model deleted successfully",
        "content": {
            "application/json": {
                "example": {
                    "success": True,
                    "data": True,
                    "message": None,
                    "meta": None,
                }
            }
        },
    },
    404: {
        "description": "Model not found",
        "content": {"application/json": {"example": {"detail": "Model not found"}}},
    },
}
