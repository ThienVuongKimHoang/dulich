from __future__ import annotations

import json
import re

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from app.routers.chat import TEXT_MODEL, _get_client

router = APIRouter(prefix="/api/v1/vocab", tags=["vocab"])

_EXAMPLES_PROMPT = """Create 3 example sentences using the English word "{word}" (Vietnamese: {vietnamese}).
Return this exact JSON structure:
{{
  "examples": [
    {{"english": "sentence 1", "vietnamese": "bản dịch 1"}},
    {{"english": "sentence 2", "vietnamese": "bản dịch 2"}},
    {{"english": "sentence 3", "vietnamese": "bản dịch 3"}}
  ]
}}
Use B1-B2 level English. Make sentences natural and memorable."""


class ExamplesIn(BaseModel):
    word: str
    vietnamese: str


@router.post("/examples")
async def generate_examples(data: ExamplesIn):
    client = _get_client()
    resp = await client.chat.completions.create(
        model=TEXT_MODEL,
        messages=[
            {
                "role": "system",
                "content": "You are an English teacher. Return ONLY valid JSON, no markdown, no explanation.",
            },
            {"role": "user", "content": _EXAMPLES_PROMPT.format(word=data.word, vietnamese=data.vietnamese)},
        ],
        temperature=0.7,
        max_tokens=400,
    )
    raw = resp.choices[0].message.content.strip()

    # Strip markdown code fences if the model wraps JSON in ```json ... ```
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()

    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Không thể phân tích phản hồi từ AI.")
