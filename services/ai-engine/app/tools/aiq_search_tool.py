from typing import Dict, List, Any
from crewai.tools import BaseTool
from pydantic import BaseModel, Field

STARS_DOCS: List[Dict[str, Any]] = [
    {
        "id": "stars_001",
        "content": "S.T.A.R.S. (Special Tactics And Rescue Service) เป็นหน่วยปฏิบัติการพิเศษของ Raccoon City Police Department ก่อตั้งขึ้นในปี 1996",
        "score": 0.95,
    },
    {
        "id": "stars_002",
        "content": "Alpha Team ของ S.T.A.R.S. นำทีมโดย Albert Wesker มีสมาชิกคือ Chris Redfield, Jill Valentine, Barry Burton และ Brad Vickers",
        "score": 0.92,
    },
    {
        "id": "stars_003",
        "content": "Bravo Team ของ S.T.A.R.S. นำทีมโดย Enrico Marini มีสมาชิกคือ Rebecca Chambers, Forest Speyer, Kenneth Sullivan และ Richard Aiken",
        "score": 0.90,
    },
    {
        "id": "stars_004",
        "content": "S.T.A.R.S. Alpha Team ถูกส่งเข้าไปสืบสวนการหายตัวของ Bravo Team ในป่า Arklay Mountains เมื่อวันที่ 24 กรกฎาคม 1998",
        "score": 0.88,
    },
    {
        "id": "stars_005",
        "content": "Chris Redfield เป็น Point Man ของ Alpha Team มีความเชี่ยวชาญด้านอาวุธปืนและการรบพิเศษ",
        "score": 0.85,
    },
    {
        "id": "stars_006",
        "content": "Jill Valentine เป็น Rear Security ของ Alpha Team เป็นผู้เชี่ยวชาญด้านการเปิดล็อคและการปลดกับระเบิด",
        "score": 0.83,
    },
    {
        "id": "stars_007",
        "content": "Barry Burton เป็น Backup Man ของ Alpha Team เป็นผู้เชี่ยวชาญด้านอาวุธหนักและเครื่องกลไก",
        "score": 0.80,
    },
    {
        "id": "stars_008",
        "content": "Albert Wesker หัวหน้า Alpha Team แอบเป็นสายลับของ Umbrella Corporation และวางแผนทำลายทีม S.T.A.R.S.",
        "score": 0.78,
    },
    {
        "id": "stars_009",
        "content": "Rebecca Chambers เป็น Rear Security และเจ้าหน้าที่การแพทย์ของ Bravo Team อายุเพียง 18 ปีแต่จบการศึกษาระดับปริญญาตรีทางชีวเคมี",
        "score": 0.75,
    },
    {
        "id": "stars_010",
        "content": "หลังเหตุการณ์ Mansion Incident สมาชิก S.T.A.R.S. ที่รอดชีวิตได้ร่วมกันต่อสู้กับ Umbrella Corporation และเผยแพร่ความจริง",
        "score": 0.72,
    },
]
NEMESIS_DOCS: List[Dict[str, Any]] = [
    {
        "id": "nemesis_001",
        "content": "Nemesis-T Type เป็น Bio Organic Weapon ที่พัฒนาโดย Umbrella Corporation เพื่อกำจัดสมาชิก S.T.A.R.S. โดยเฉพาะ",
        "score": 0.95,
    },
    {
        "id": "nemesis_002",
        "content": "Nemesis ได้รับการฝังปรสิต NE-α Type ซึ่งเพิ่มความฉลาดและควบคุมพฤติกรรมให้ปฏิบัติภารกิจได้อย่างมีประสิทธิภาพ",
        "score": 0.92,
    },
    {
        "id": "nemesis_003",
        "content": "ความสูงของ Nemesis อยู่ที่ 2.3 เมตร น้ำหนัก 180 กิโลกรัม มีกล้ามเนื้อที่แข็งแกร่งและระบบการเล็งเป้าขั้นสูง",
        "score": 0.90,
    },
    {
        "id": "nemesis_004",
        "content": "Nemesis สามารถใช้อาวุธต่างๆ ได้อย่างชำนาญ รวมถึง Rocket Launcher และ Flamethrower พร้อมทั้งสามารถวิ่งและกระโดดได้รวดเร็ว",
        "score": 0.88,
    },
    {
        "id": "nemesis_005",
        "content": "Nemesis ได้รับการปล่อยตัวใน Raccoon City เมื่อวันที่ 28 กันยายน 1998 เพื่อทดสอบและกำจัด S.T.A.R.S. ที่เหลืออยู่",
        "score": 0.85,
    },
    {
        "id": "nemesis_006",
        "content": "เป้าหมายหลักของ Nemesis คือ Jill Valentine อดีตสมาชิก S.T.A.R.S. Alpha Team ที่ยังอยู่ใน Raccoon City",
        "score": 0.83,
    },
    {
        "id": "nemesis_007",
        "content": "Nemesis สามารถพูดได้ โดยคำที่พูดบ่อยที่สุดคือ 'S.T.A.R.S.' เมื่อตรวจพบเป้าหมาย",
        "score": 0.80,
    },
    {
        "id": "nemesis_008",
        "content": "แม้จะถูกโจมตีหลายครั้ง Nemesis ก็สามารถฟื้นตัวและกลายพันธุ์เป็นรูปแบบที่แข็งแกร่งขึ้นได้ถึง 3 รูปแบบ",
        "score": 0.78,
    },
    {
        "id": "nemesis_009",
        "content": "ในรูปแบบสุดท้าย Nemesis กลายเป็นก้อนเนื้อขนาดใหญ่ที่มีหนวดและกรดที่สามารถละลายทุกสิ่งได้",
        "score": 0.75,
    },
    {
        "id": "nemesis_010",
        "content": "Nemesis ถูกทำลายในที่สุดโดย Jill Valentine ด้วย Rail Cannon ก่อนที่ Raccoon City จะถูกทำลายด้วยขีปนาวุธนิวเคลียร์",
        "score": 0.72,
    },
]


class AIQSearchToolSchema(BaseModel):
    query: str = Field(description="The search query text")
    top_k: int = Field(
        default=10, description="Number of results from embedding search"
    )
    top_n: int = Field(default=5, description="Number of final results after reranking")


class AIQSearchOutput(BaseModel):
    """Output schema from Search tool."""

    documents: List[Dict[str, Any]] = Field(
        ..., description="List of documents returned from search"
    )
    query: str = Field(..., description="The search query text that was used")
    total: int = Field(..., description="Total number of documents found")


class AIQSearchTool(BaseTool):
    name: str = "aiq_search_tool"
    description: str = "Search tool for retrieving documents from AIQ knowledge base"
    result_as_answer: bool = True

    def _run(self, query: str, top_k: int = 10, top_n: int = 5) -> AIQSearchOutput:
        query_lower = query.lower()
        if "nemesis" in query_lower:
            selected_docs = NEMESIS_DOCS
        elif "star" in query_lower:
            selected_docs = STARS_DOCS
        else:
            # Case 3: No matching documents
            return AIQSearchOutput(documents=[], query=query, total=0)

        # Return top_k documents
        return AIQSearchOutput(
            documents=selected_docs[:top_k], query=query, total=len(selected_docs)
        )
