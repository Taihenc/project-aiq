from fastapi import FastAPI

app = FastAPI()


@app.get("/")
async def root():
    return {"message": "AI Service is running"}


@app.post("/chat")
async def chat(message: dict):
    # This is a placeholder for RAG and AI logic
    response = f"AI Service received: {message.get('text', 'no message')}"
    return {"response": response}
