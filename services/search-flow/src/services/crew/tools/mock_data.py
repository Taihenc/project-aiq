from typing import Dict, Optional

# Mock Data Storage - Moved from main script
# In a real app, this would be a database adapter.

MOCK_CHUNKS = {
    "c_1_1": {
        "text": "ไวรัส Zorath-9 (โซราธ-ไนน์) ถูกค้นพบครั้งแรกในปี 2029 ที่ร่องลึกก้นสมุทรมาเรียน่า",
        "page": 1,
        "file": "internal_research_zorath.pdf",
        "next": "c_1_2",
    },
    "c_1_2": {
        "text": "ลักษณะเด่นของ Zorath-9 คือโปรตีนหุ้มเซลล์แบบผลึกเหลว (Liquid Crystal Capsid) ซึ่งไม่เคยพบในไวรัสใดๆ บนโลกมาก่อน",
        "page": 1,
        "file": "internal_research_zorath.pdf",
        "next": "c_2_1",
    },
    "c_2_1": {
        "text": "กลไกการติดเชื้ออาศัยเอนไซม์ Z-Polymerase ที่สามารถเปลี่ยนโครงสร้าง DNA ของโฮสต์ให้กลายเป็นซิลิกอน",
        "page": 2,
        "file": "internal_research_zorath.pdf",
        "next": "c_2_2",
    },
    "c_2_2": {
        "text": "ระยะฟักตัวสั้นเพียง 4 ชั่วโมง โดยผู้ติดเชื้อจะมีอาการผิวหนังเรืองแสงสีฟ้าอ่อน (Bioluminescence Symptoms)",
        "page": 2,
        "file": "internal_research_zorath.pdf",
        "next": "c_3_1",
    },
    "c_3_1": {
        "text": "ปัจจุบันยังไม่มีวัคซีนป้องกัน แต่สารสกัดจากสาหร่ายสีแดง Deep-Red Crypto สามารถยับยั้งการทำงานของ Z-Polymerase ได้ชั่วคราว",
        "page": 3,
        "file": "internal_research_zorath.pdf",
        "next": "c_3_2",
    },
    "c_3_2": {
        "text": "โครงการวิจัยลับ 'Project Abyss' กำลังพัฒนาแอนติบอดีสังเคราะห์ Nano-Bind เพื่อต่อสู้กับ Zorath-9 โดยเฉพาะ",
        "page": 3,
        "file": "internal_research_zorath.pdf",
        "next": None,
    },
}
