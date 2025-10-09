"""
CrewAI service for processing chat requests using agents
"""

import sys
import os
from typing import List, Dict
import logging


# Import our custom Creawai class
from ..crewai.crew import Creawai

logger = logging.getLogger(__name__)


class CrewAIService:
    def __init__(self):
        """Initialize the CrewAI service"""
        self.crew = Creawai()

    async def process_chat_with_agents(
        self, user_query: str, search_results: List[Dict]
    ) -> str:
        """
        Process chat request using CrewAI agents

        Args:
            user_query: The user's question
            search_results: List of search results from embedding service

        Returns:
            Generated response from agents
        """
        try:
            # Format search results for the crew
            formatted_results = self._format_search_results(search_results)

            # Prepare inputs for the crew
            inputs = {"user_query": user_query, "search_results": formatted_results}

            # Execute the crew
            result = self.crew.crew().kickoff(inputs=inputs)

            logger.info(f"CrewAI processing completed for query: {user_query}")
            return str(result)

        except Exception as e:
            logger.error(f"Error in CrewAI processing: {str(e)}")
            # Re-raise the exception so it can be caught by the calling service
            raise e

    def _format_search_results(self, search_results: List[Dict]) -> str:
        """Format search results for crew input"""
        if not search_results:
            return "ไม่พบข้อมูลที่เกี่ยวข้อง"

        formatted_results = []
        for i, result in enumerate(search_results, 1):
            formatted_results.append(
                f"ผลลัพธ์ที่ {i} (คะแนน: {result['score']:.4f}):\n"
                f"เส้นทาง: {result['path']}\n"
                f"เนื้อหา: {result['content']}\n"
            )
        return "\n".join(formatted_results)
