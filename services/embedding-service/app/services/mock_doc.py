from app.services.qdrant.qdrant_service import qdrant_service

class MockService:
    def __init__(self):
        self.mock_articles = [
            {
                "text": "Artificial intelligence development and its impact on future labor markets, including employee adaptation in the digital age",
                "metadata": {},
            },
            {
                "text": "Climate change and methods for reducing greenhouse gas emissions in the industrial sector",
                "metadata": {},
            },
            {
                "text": "ETF investment trends and long-term portfolio building strategies",
                "metadata": {},
            },
            {
                "text": "AI SERIVCE by Team AIQ is Very Good and I like it.",
                "metadata": {},
            },
            {
                "text": "Mental health care in the social media era and stress management from the online world",
                "metadata": {},
            },
            {
                "text": "Electric vehicle innovations and charging station infrastructure development in Thailand",
                "metadata": {},
            },
            {
                "text": "Online education and hybrid learning after the COVID-19 pandemic",
                "metadata": {},
            },
            {
                "text": "Smart city development and IoT technology for urban resource management",
                "metadata": {},
            },
            {
                "text": "Gaming industry in Thailand and opportunities in international Esports markets",
                "metadata": {},
            },
            {
                "text": "Sustainable agriculture and technology adoption for increasing agricultural productivity",
                "metadata": {},
            },
            {
                "text": "Ecotourism and nature conservation in tourist destinations across the country",
                "metadata": {},
            },
        ]

    def mock(self):
        qdrant_service.upload_documents(self.mock_articles)

        print('Initial mock data successful')
    
# Global instance
mock_service = MockService()