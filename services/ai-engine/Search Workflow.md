# AingoSearch Workflow
workflowสำหรับRAGเอกสารภายในองค์กร ที่จะค้นหาเอกสาร และ นำเอกสารที่หามาสรุป

```json
{
  "description": "A hierarchical RAG workflow acting as an internal search engine with validation, retrieval, and synthesis steps.",
  "name": "Internal Search RAG",
  "process": "hierarchical",
  "manager_agent_id": "workflow_manager_agent",
  "tasks": [
    "input_validation_task",
    "document_search_task"
  ]
}
```

## Agent Manager
Receives the initial request and supervises the entire operation. It delegates tasks to the appropriate agents based on the workflow state.
```json
{
  "backstory": "An experienced project manager responsible for coordinating the document retrieval process. Ensures that user queries are valid, search is executed correctly, and the final answer is accurate.",
  "goal": "Oversee the end-to-end execution of the search workflow for the query '{user_query}', ensuring high-quality results.",
  "model_id": "model_01",
  "name": "workflow_manager_agent",
  "role": "Project Manager",
  "tools": []
}
```

## Jobs1 (Validation)
ทำหน้าที่เป็นด่านหน้า ตรวจสอบความถูกต้องของคำสั่ง
- **Validation**: ตรวจสอบว่าคำถามชัดเจนและเกี่ยวข้องกับเอกสารภายใน
- **Output**: ส่งผลการตรวจ (Pass/Fail) เพื่อให้ Manager นำไปบริหารต่อ

```json
{
  "agent_id": "agent_id_1",
  "expected_output": "A validation result indicating if the query is clear and in-scope, along with a refined intent if approved.",
  "name": "input_validation_task",
  "task_description": "Assess the users query '{user_query}' for clarity and relevance to internal documentation. If the query is ambiguous or unrelated, reject it with a reason. If valid, approve it for the search phase.",
  "output_pydantic": {
    "status": "str",
    "refined_intent": "str",
    "rejection_reason": "str"
  }
}
```

### Agent1
```json
{
  "backstory": "A specialist in query understanding and requirements analysis. Ensures that only valid and clear requests are processed by the system.",
  "goal": "Validate user queries like '{user_query}' to prevent resource waste on invalid or out-of-scope requests.",
  "model_id": "model_01",
  "name": "input_validator_agent",
  "role": "Input Validator",
  "tools": []
}
```

## Jobs2 (Search & Synthesis)
รับหน้าที่ในการค้นหาข้อมูล (Retrieval) และสรุปผล (Synthesis)
- **Goal**: ดึงข้อมูลจาก Knowledge Base และสรุปคำตอบให้ผู้ใช้

```json
{
  "agent_id": "agent_id_2",
  "name": "document_search_task",
  "task_description": "Search for relevant documents using the retrieval tool based on the user's query '{user_query}'. Then, analyze the retrieved information to synthesize a clear and accurate final answer.",
  "expected_output": "A final summary answer derived from the retrieved documents, along with their source file paths.",
  "output_pydantic": {
    "final_answer": "str",
    "file_path": "list[str]",
  }
}
```

### Agent2
```json
{
  "backstory": "An expert in information retrieval and data synthesis. Skilled at finding precise information within large datasets and summarizing it into actionable answers.",
  "goal": "Retrieve relevant documents and provide a synthesized answer for the user's query: '{user_query}'.",
  "model_id": "model_01",
  "name": "search_retrieval_agent",
  "role": "Search Specialist",
  "tools": [
    "retrieval_tool"
  ]
}
```

## Tools
```json
{
  "name": "retrieval_tool",
  "description": "Retrieve relevant document chunks from the knowledge base using semantic search and reranking.",
  "type": "REST",
  "endpoint": "http://localhost:8003/v1/search",
  "auth_config": {},
  "parameters": {
    "query": "str"
  },
  "default_parameters": {
    "top_k": 10,
    "top_n": 5,
  }
}
```