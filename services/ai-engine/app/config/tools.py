from typing import Dict, List, Any
from crewai.tools import BaseTool
from pydantic import BaseModel, Field


class DocumentSearchTool(BaseTool):
    name: str = "document_search"
    description: str = (
        "Search for relevant documents using vector similarity search and rerank them. "
        "Use this tool when you need to find documents related to a user's query. "
        "The tool will return the most relevant documents from the vector database "
        "along with their similarity scores, automatically reranked for best results."
    )
    
    class DocumentSearchToolSchema(BaseModel):
        query: str = Field(description="The search query text")
        top_k: int = Field(default=10, description="Number of results from embedding search")
        top_n: int = Field(default=5, description="Number of final results after reranking")
    
    args_schema = DocumentSearchToolSchema

    # Mock data for S.T.A.R.S unit
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

    # Mock data for Nemesis
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

    class SearchOutput(BaseModel):
        """Output schema from Search tool."""

        documents: List[Dict[str, Any]] = Field(
            ..., description="List of documents returned from search"
        )
        query: str = Field(..., description="The search query text that was used")
        total: int = Field(..., description="Total number of documents found")

    def _embedding_search(self, query: str, top_k: int) -> List[Dict[str, Any]]:
        """
        Perform embedding search based on query keywords.

        Args:
            query: Search query text
            top_k: Number of top results to return

        Returns:
            List of documents matching the query
        """
        query_lower = query.lower()

        # Check keywords and select documents
        if "nemesis" in query_lower:
            selected_docs = self.NEMESIS_DOCS
        elif "star" in query_lower:
            selected_docs = self.STARS_DOCS
        else:
            # Case 3: No matching documents
            return []

        # Return top_k documents
        return selected_docs[:top_k]

    def _reranker(
        self, documents: List[Dict[str, Any]], top_n: int, top_k: int
    ) -> List[Dict[str, Any]]:
        """
        Rerank documents and return top N results.

        Args:
            documents: List of documents to rerank
            top_n: Number of top results to return after reranking

        Returns:
            List of reranked documents
        """
        # MOCK: Return documents as-is, just take top_n
        return documents[: min(top_n, top_k)]

    def _run(self, query: str, top_k: int = 10, top_n: int = 5) -> SearchOutput:
        """
        Execute the embedding search and rerank results.

        Args:
            query: The search query text
            top_k: Number of results from embedding search
            top_n: Number of final results after reranking

        Returns:
            SearchOutput containing reranked search results with documents and scores
        """
        # Step 1: Embedding Search
        search_results = self._embedding_search(query, top_k)

        # If no results found
        if not search_results:
            return self.SearchOutput(documents=[], query=query, total=0)

        # Step 2: Rerank
        reranked_docs = self._reranker(search_results, top_n, top_k)

        return self.SearchOutput(
            documents=reranked_docs, query=query, total=len(reranked_docs)
        )


# Tool configurations registry
TOOLS: Dict[str, BaseTool] = {
    "document_search": DocumentSearchTool(),
}
