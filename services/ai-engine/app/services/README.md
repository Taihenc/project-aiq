# AI Engine Services

ระบบจัดการ Agents และ Crews แบบ Config-based สำหรับ CrewAI

## ภาพรวม

ระบบนี้แยก **Configuration** (metadata) ออกจาก **Runtime** (actual instances) เพื่อให้:
- สร้าง config ครั้งเดียว ใช้ซ้ำได้หลายครั้ง
- จัดการ configs แบบรวมศูนย์
- ยืดหยุ่น ไม่ hardcode
- แยก concerns ชัดเจน

## Architecture

```
┌────────────────────────────────────────────────────────────┐
│                       AI Engine                             │
├────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌──────────────┐                                          │
│  │ ModelService │ Pre-configured LLM Models                │
│  │              │ • gpt-4o-mini                            │
│  │ • get_model  │ • gpt-4o                                 │
│  └──────────────┘ • creative/precise variants              │
│         │                                                   │
│         │ LLM                                               │
│         ▼                                                   │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  AgentService   │         │   CrewService    │          │
│  │                 │         │                  │          │
│  │  • create_config│         │  • create_config │          │
│  │  • get_agent    │────────▶│  • get_crew      │          │
│  │                 │ agents  │                  │          │
│  └─────────────────┘         └──────────────────┘          │
│         │                             │                    │
│         │ Agent + LLM                 │ Tasks              │
│         ▼                             ▼                    │
│  ┌─────────────────┐         ┌──────────────────┐          │
│  │  CrewAI Agent   │         │   CrewAI Crew    │          │
│  └─────────────────┘         └──────────────────┘          │
│                                                             │
└────────────────────────────────────────────────────────────┘
```

## Services

### 1. Model Service

จัดการ pre-configured LLM Models

**Features:**
- ✅ Pre-configured models (gpt-4o-mini, gpt-4o)
- ✅ Specialized variants (creative, precise)
- ✅ Simple API (get_model, get_models)
- ✅ No configuration needed

**Files:**
- `models/models.py` - ModelService class
- `models/README.md` - เอกสารละเอียด

### 2. Agent Service

จัดการ Agent configurations และสร้าง CrewAI Agent (ใช้ Model จาก ModelService)

**Features:**
- ✅ CRUD operations สำหรับ agent configs
- ✅ Model integration (ดึงจาก ModelService)
- ✅ Tools integration (พร้อมเชื่อม tool service)
- ✅ Agent behavior control (verbose, delegation, max_iter)

**Files:**
- `agents/agents.py` - AgentService class
- `agents/models/agent_base.py` - Config models
- `agents/README.md` - เอกสารละเอียด

### 3. Crew Service

จัดการ Crew configurations และสร้าง Sequential/Hierarchical Crews

**Features:**
- ✅ CRUD operations สำหรับ crew configs
- ✅ Sequential และ Hierarchical process
- ✅ Task context (ใช้ผลจาก tasks ก่อนหน้า)
- ✅ Output types (Pydantic, JSON, File)
- ✅ Integration กับ Agent Service

**Files:**
- `crews/crews.py` - CrewService class
- `crews/models/crew_base.py` - Config models
- `crews/README.md` - เอกสารละเอียด

## Quick Start

### 1. ดู Models ที่มี

```python
from app.services.models import ModelService

model_service = ModelService()

# ดู models
models = model_service.get_models()
# Available: gpt-4o-mini, gpt-4o, gpt-4o-mini-creative, gpt-4o-mini-precise
```

### 2. สร้าง Agents

```python
from app.services.agents import AgentService, AgentConfig

agent_service = AgentService()

# สร้าง researcher agent
researcher = AgentConfig(
    name="researcher",
    role="Research Specialist",
    goal="Find accurate information",
    backstory="Expert researcher with 10 years experience",
    model_name="gpt-4o-mini"  # จาก ModelService
)

agent_service.create_agent_config(researcher)
```

### 3. สร้าง Crew

```python
from app.services.crews import CrewService, CrewConfig, TaskConfig

crew_service = CrewService()

# สร้าง crew config
config = CrewConfig(
    name="research_crew",
    tasks=[
        TaskConfig(
            description="Research topic: {topic}",
            expected_output="Research report",
            agent_name="researcher"  # ใช้ agent ที่สร้างไว้
        )
    ]
)

crew_response = crew_service.create_crew_config(config)
```

### 4. รัน Crew

```python
# ดึง crew มาใช้งาน (agent จะถูกดึงมาอัตโนมัติ)
crew = crew_service.get_crew(crew_response.id)

# รัน
result = crew.kickoff(inputs={"topic": "AI in Healthcare"})
print(result)
```

## ตัวอย่างแบบเต็ม

### Document Search System

```python
from app.services.agents import AgentService, AgentConfig
from app.services.crews import CrewService, CrewConfig, TaskConfig, ProcessType

# ============================================================================
# 1. สร้าง Agents
# ============================================================================
agent_service = AgentService()

# Orchestrator - วิเคราะห์ query
orchestrator = AgentConfig(
    name="orchestrator",
    role="Query Orchestrator",
    goal="Analyze queries and route appropriately",
    backstory="Expert in understanding user intent",
    model_name="gpt-4o-mini-precise"  # ใช้ precise สำหรับ orchestration
)

# RAG Analyzer - ค้นหา documents
rag_analyzer = AgentConfig(
    name="rag_analyzer",
    role="RAG Specialist",
    goal="Search and retrieve relevant documents",
    backstory="Expert in document retrieval",
    model_name="gpt-4o-mini",
    tool_names=["document_search"]
)

# Chat Responder - สร้าง response
chat_responder = AgentConfig(
    name="chat_responder",
    role="Response Generator",
    goal="Generate helpful responses",
    backstory="Expert communicator",
    model_name="gpt-4o-mini-creative"  # ใช้ creative สำหรับ response
)

agent_service.create_agent_config(orchestrator)
agent_service.create_agent_config(rag_analyzer)
agent_service.create_agent_config(chat_responder)

# ============================================================================
# 2. สร้าง Crew
# ============================================================================
crew_service = CrewService()

crew_config = CrewConfig(
    name="document_search_crew",
    description="RAG-based document search",
    tasks=[
        TaskConfig(
            description="Analyze query: {query}. Decide: SEARCH/DIRECT/CLARIFICATION",
            expected_output="Decision with reasoning",
            agent_name="orchestrator"
        ),
        TaskConfig(
            description="Search documents if needed",
            expected_output="Search results",
            agent_name="rag_analyzer",
            context_task_indices=[0]  # ใช้ผลจาก task 0
        ),
        TaskConfig(
            description="Generate final response in user language",
            expected_output="Response with sources",
            agent_name="chat_responder",
            context_task_indices=[0, 1]  # ใช้ผลจาก task 0 และ 1
        )
    ],
    process=ProcessType.SEQUENTIAL,
    verbose=True
)

crew_response = crew_service.create_crew_config(crew_config)

# ============================================================================
# 3. ใช้งาน
# ============================================================================
crew = crew_service.get_crew(crew_response.id)

result = crew.kickoff(inputs={
    "query": "What are the benefits of AI in healthcare?"
})

print(result)
```

## Configuration Management

### Agent Configs

```python
# ดึงทั้งหมด
all_agents = agent_service.get_agents_config()

# ดึงตาม ID
agent = agent_service.get_agent_config("researcher")

# อัพเดท
updated_config = AgentConfig(...)
agent_service.update_agent_config("researcher", updated_config)

# ลบ
agent_service.delete_agent_config("researcher")
```

### Crew Configs

```python
# ดึงทั้งหมด
all_crews = crew_service.get_crews_config()

# ดึงตาม ID
crew = crew_service.get_crew_config(crew_id)

# อัพเดท
updated_config = CrewConfig(...)
crew_service.update_crew_config(crew_id, updated_config)

# ลบ
crew_service.delete_crew_config(crew_id)
```

## Environment Variables

```bash
# Azure OpenAI (ถ้าไม่ระบุใน config)
AZURE_API_KEY=your-api-key
AZURE_API_BASE=https://your-endpoint.openai.azure.com/
AZURE_API_VERSION=2024-02-15-preview
```

## Integration Patterns

### Pattern 1: Single Crew with Multiple Agents

```python
# สร้าง agents หลายตัว
agent_service.create_agent_config(researcher_config)
agent_service.create_agent_config(analyst_config)
agent_service.create_agent_config(writer_config)

# สร้าง crew ที่ใช้ agents ทั้งหมด
crew_config = CrewConfig(
    name="analysis_crew",
    tasks=[
        TaskConfig(..., agent_name="researcher"),
        TaskConfig(..., agent_name="analyst"),
        TaskConfig(..., agent_name="writer")
    ]
)
```

### Pattern 2: Multiple Crews Sharing Agents

```python
# สร้าง shared agents
agent_service.create_agent_config(researcher_config)
agent_service.create_agent_config(writer_config)

# Crew 1: Research + Write
crew_config_1 = CrewConfig(
    name="research_crew",
    tasks=[
        TaskConfig(..., agent_name="researcher"),
        TaskConfig(..., agent_name="writer")
    ]
)

# Crew 2: Write only
crew_config_2 = CrewConfig(
    name="writing_crew",
    tasks=[
        TaskConfig(..., agent_name="writer")
    ]
)
```

### Pattern 3: Dynamic Crew Creation

```python
def create_crew_for_topic(topic: str, num_researchers: int):
    """สร้าง crew แบบ dynamic based on parameters"""
    
    # สร้าง agents
    for i in range(num_researchers):
        agent_config = AgentConfig(
            name=f"researcher_{i}",
            role=f"Researcher {i}",
            goal=f"Research aspect {i} of {topic}",
            ...
        )
        agent_service.create_agent_config(agent_config)
    
    # สร้าง tasks
    tasks = []
    for i in range(num_researchers):
        tasks.append(TaskConfig(
            description=f"Research aspect {i}",
            agent_name=f"researcher_{i}"
        ))
    
    # สร้าง crew
    crew_config = CrewConfig(
        name=f"{topic}_crew",
        tasks=tasks
    )
    return crew_service.create_crew_config(crew_config)
```

## Benefits

### ✅ Config-based
- สร้าง config ครั้งเดียว ใช้ซ้ำได้
- Version control สำหรับ configs
- Easy to manage and update

### ✅ Separation of Concerns
- Agent Service จัดการ agents + LLM
- Crew Service จัดการ crews + tasks
- ไม่ผูกติดกัน แก้ไขง่าย

### ✅ Flexibility
- ไม่ hardcode agents/tasks
- รองรับ dynamic creation
- เปลี่ยนแปลงได้ง่าย

### ✅ Reusability
- Agents ใช้ร่วมกันได้หลาย crews
- Configs เก็บไว้ใช้ซ้ำได้
- DRY principle

### ✅ Scalability
- เพิ่ม agents/crews ได้ง่าย
- พร้อม migrate เป็น database
- Support production use

## Migration Path

### Current: In-memory Storage

```python
self._agent_configs: Dict[str, AgentConfigResponse] = {}
self._crew_configs: Dict[str, CrewConfigResponse] = {}
```

### Future: Database Storage

```python
# PostgreSQL/MongoDB
class AgentService:
    def create_agent_config(self, config):
        # Save to database
        db.agents.insert_one(config.dict())
    
    def get_agent_config(self, agent_id):
        # Load from database
        return db.agents.find_one({"id": agent_id})
```

## TODO

### Agent Service
- [ ] เชื่อมต่อ tool service
- [ ] Database storage
- [ ] Caching
- [ ] Validation

### Crew Service  
- [ ] Database storage
- [ ] Hierarchical process support
- [ ] Advanced task dependencies
- [ ] Parallel execution

### General
- [ ] API endpoints (FastAPI)
- [ ] Authentication
- [ ] Rate limiting
- [ ] Monitoring & logging
- [ ] Testing suite

## API Preview

```python
# FastAPI endpoints (future)
POST   /api/v1/agents                  # Create agent config
GET    /api/v1/agents                  # List agents
GET    /api/v1/agents/{id}             # Get agent config
PUT    /api/v1/agents/{id}             # Update agent
DELETE /api/v1/agents/{id}             # Delete agent

POST   /api/v1/crews                   # Create crew config
GET    /api/v1/crews                   # List crews
GET    /api/v1/crews/{id}              # Get crew config
PUT    /api/v1/crews/{id}              # Update crew
DELETE /api/v1/crews/{id}              # Delete crew

POST   /api/v1/crews/{id}/run          # Run crew
GET    /api/v1/crews/{id}/status       # Check status
```

## File Structure

```
app/services/
├── README.md                          # เอกสารนี้
├── __init__.py
│
├── models/                            # Model Service
│   ├── __init__.py
│   ├── models.py                      # ModelService
│   └── README.md
│
├── agents/                            # Agent Service
│   ├── __init__.py
│   ├── agents.py                      # AgentService
│   ├── README.md
│   └── models/
│       ├── __init__.py
│       └── agent_base.py              # AgentConfig, AgentConfigResponse
│
├── crews/                             # Crew Service
│   ├── __init__.py
│   ├── crews.py                       # CrewService
│   ├── README.md
│   └── models/
│       ├── __init__.py
│       └── crew_base.py               # CrewConfig, TaskConfig
│
└── tools/                             # Tool Service (future)
    └── ...
```

## Resources

- [ModelService README](./models/README.md)
- [AgentService README](./agents/README.md)
- [CrewService README](./crews/README.md)
- [CrewAI Documentation](https://docs.crewai.com/)

## Support

สำหรับคำถามหรือปัญหา:
1. อ่าน README ของแต่ละ service
2. ดูตัวอย่างใน README
3. ตรวจสอบ docstrings ใน code

