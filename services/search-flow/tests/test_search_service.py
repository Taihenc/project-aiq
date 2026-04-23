import pytest
from src.dtos.request import SearchChatRequest, SearchFilter
from src.models.search import FileRef
from src.services.search_service import SearchFlowService

def test_build_search_filter_with_both_in_and_out():
    service = SearchFlowService()
    
    # Setup request with include filters and exclude filters
    request = SearchChatRequest(
        query="test",
        filter=SearchFilter(
            department="AI",
            tags=["important"],
            exclude_file_ids=["file_id_1"],
            exclude=["/path/to/excluded.pdf"]
        ),
        exclude=[FileRef(file_id="file_id_2", file_path="/path/to/other.pdf", chunks=[])]
    )
    
    result = service._build_search_filter(request)
    
    assert result is not None
    assert "filter_in" in result
    assert "filter_out" in result
    
    filter_in = result["filter_in"]
    assert filter_in.get("department") == "AI"
    assert filter_in.get("tags") == ["important"]
    assert "exclude_file_ids" not in filter_in
    assert "exclude" not in filter_in
    
    filter_out = result["filter_out"]
    assert filter_out.get("exclude_file_ids") == ["file_id_1", "file_id_2"]
    assert filter_out.get("exclude") == ["/path/to/excluded.pdf", "/path/to/other.pdf"]

def test_build_search_filter_empty():
    service = SearchFlowService()
    request = SearchChatRequest(query="test")
    
    result = service._build_search_filter(request)
    assert result is None
