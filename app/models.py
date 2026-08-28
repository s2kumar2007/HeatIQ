from typing import Any, Literal, Optional

from pydantic import BaseModel, Field


class AskRequest(BaseModel):
    question: str = Field(..., description="Natural-language heat-safety question")


class ToolCallTrace(BaseModel):
    step: int
    tool_name: str
    tool_input: dict[str, Any]
    tool_output: Any
    error: Optional[str] = None


class AskResponse(BaseModel):
    decision: Literal["Safe", "Caution", "Unsafe", "Unknown"]
    reasoning: str
    data_used: dict[str, Any] = Field(default_factory=dict)
    trace: list[ToolCallTrace] = Field(default_factory=list)
    raw_final_text: Optional[str] = None
