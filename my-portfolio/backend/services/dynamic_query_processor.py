"""
Simple dynamic query processor
"""
import logging
from typing import Dict, Any
from dataclasses import dataclass

logger = logging.getLogger(__name__)

@dataclass
class QueryClassification:
    is_portfolio_related: bool
    confidence: float
    query_type: str = "unknown"

class DynamicQueryProcessor:
    """Simple query processor"""
    
    def __init__(self):
        self.portfolio_keywords = [
            'adil', 'portfolio', 'project', 'skill', 'education', 
            'contact', 'experience', 'work', 'programming'
        ]

    def classify_query(self, query: str, language: str = "en") -> QueryClassification:
        """Simple query classification"""
        query_lower = query.lower()
        
        # Check for portfolio keywords
        portfolio_matches = sum(1 for keyword in self.portfolio_keywords if keyword in query_lower)
        
        is_portfolio = portfolio_matches > 0
        confidence = 0.8 if is_portfolio else 0.3
        
        return QueryClassification(
            is_portfolio_related=is_portfolio,
            confidence=confidence,
            query_type="portfolio" if is_portfolio else "out_of_scope"
        )

    def process_out_of_scope_query(self, query: str, language: str = "en") -> Dict[str, Any]:
        """Handle out-of-scope queries"""
        if language == "ur":
            message = "میں صرف عادل سعید کے portfolio کے بارے میں معلومات دے سکتا ہوں۔"
        else:
            message = "I can only provide information about Adil Saeed's portfolio."
        
        return {
            "should_redirect": True,
            "answer": message,
            "sources": ["Assistant"],
            "query_type": "out_of_scope",
            "confidence": 0.8
        }