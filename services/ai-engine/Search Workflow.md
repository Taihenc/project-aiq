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
    "document_search_task",
    "response_synthesis_task"
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

## Jobs2 (Search)
รับหน้าที่ในการค้นหาข้อมูล (Retrieval)
- **Goal**: แปลงคำค้นหาและดึงข้อมูลจาก Knowledge Base

```json
{
  "agent_id": "agent_id_2",
  "name": "document_search_task",
  "task_description": "Generate optimized search queries based on the validated user intent from '{user_query}'. Execute search tools to retrieve the most relevant document chunks from the internal knowledge base.",
  "expected_output": "A collection of relevant document segments and metadata retrieved from the search system.",
  "output_pydantic": {
    "results": "list[str]",
    "citations": "list[str]",
  }
}
```

### Agent2
```json
{
  "backstory": "An expert in information retrieval and search algorithms. Skilled at finding precise information within large datasets.",
  "goal": "Retrieve the most relevant documents based on the user's query: '{user_query}'.",
  "model_id": "model_01",
  "name": "search_retrieval_agent",
  "role": "Search Specialist",
  "tools": [
    "retrieval_tool"
  ]
}
```

(## Jobs3 (Synthesis)
รับหน้าที่สรุปผลข้อมูล (Synthesis)
- **Goal**: สรุปคำตอบจากข้อมูลที่หามาได้ พร้อมอ้างอิงแหล่งที่มา

```json
{
  "agent_id": "agent_id_3",
  "name": "response_synthesis_task",
  "task_description": "Analyze the retrieved documents. Filter out irrelevant information and synthesize a clear, accurate answer to the user's query '{user_query}', citing specific sources.",
  "expected_output": "A final summary answer with inline citations and a list of references.",
  "output_pydantic": {
    "final_answer": "str",
    "citations": "list[str]"
  }
}
```

### Agent3
```json
{
  "backstory": "A data analyst capable of synthesizing checks and balances. Ensures the final output is accurate, coherent, and supported by the retrieved data.",
  "goal": "Synthesize search results into a comprehensive and accurate answer for the query: '{user_query}'.",
  "model_id": "model_01",
  "name": "content_synthesizer_agent",
  "role": "Data Analyst",
  "tools": []
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