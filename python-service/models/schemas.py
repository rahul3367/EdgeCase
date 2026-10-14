from typing import List, Optional, Literal
from pydantic import BaseModel, Field


class ProcessResponse(BaseModel):
    chunksCount: int
    collectionId: str
    riskSummary: Optional[dict] = None


class ChatTurn(BaseModel):
    role: Literal["user", "assistant"]
    content: str


class QueryRequest(BaseModel):
    document_id: str
    query: str
    history: List[ChatTurn] = Field(default_factory=list)


class SourceChunk(BaseModel):
    chunk_id: str
    text: str
    page: Optional[int] = None
    score: Optional[float] = None


class QueryResponse(BaseModel):
    answer: str
    sources: List[SourceChunk] = Field(default_factory=list)


class RiskItem(BaseModel):
    category: Literal[
        "renewal", "termination", "penalty", "one_sided", "payment"
    ]
    severity: Literal["low", "medium", "high"]
    clause_excerpt: str
    explanation: str
    page: Optional[int] = None


class RiskSummary(BaseModel):
    risks: List[RiskItem] = Field(default_factory=list)
    overall_risk_level: Literal["low", "medium", "high"] = "low"
