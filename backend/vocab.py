from __future__ import annotations

import json
import os
import random
import re

from fastapi import APIRouter, HTTPException
from groq import AsyncGroq
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1/vocab", tags=["vocab"])

TEXT_MODEL = "llama-3.1-8b-instant"
# 8b-instant hay chọn sai đáp án ngữ pháp; 70b chính xác hơn nhiều (TPD thấp → có fallback)
GRAMMAR_MODEL = "llama-3.3-70b-versatile"


def _get_client() -> AsyncGroq:
    api_key = os.environ.get("GROQ_API_KEY", "").strip()
    if not api_key:
        raise HTTPException(status_code=500, detail="GROQ_API_KEY chưa được cấu hình")
    return AsyncGroq(api_key=api_key)


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

# Chủ đề ngẫu nhiên trộn vào prompt để mỗi lần tạo ra bộ câu hỏi khác nhau
_GRAMMAR_THEMES = [
    "daily routines at home",
    "sports and exercise",
    "food and cooking",
    "travel and holidays",
    "school life",
    "work and office life",
    "family and friends",
    "weather and seasons",
    "hobbies and free time",
    "animals and pets",
    "shopping at the market",
    "music and movies",
    "technology and phones",
    "health and the doctor",
    "the city and traffic",
    "nature and the countryside",
]

_GRAMMAR_TOPICS = {
    "present_simple": "the Present Simple tense (thì hiện tại đơn)",
    "present_continuous": "the Present Continuous tense (thì hiện tại tiếp diễn)",
    "mixed": "choosing between Present Simple and Present Continuous (phân biệt hiện tại đơn và hiện tại tiếp diễn)",
}

_GRAMMAR_PROMPT = """Create {count} multiple-choice grammar questions about {topic_label} for A2-B1 level students.

Each question is ONE sentence written entirely in ENGLISH, with a blank "___" where the verb phrase goes.
Return this exact JSON structure:
{{
  "questions": [
    {{
      "question": "She ___ to school every day.",
      "options": ["go", "goes", "is going", "going"],
      "answer": 1,
      "explanation": "Có 'every day' nên dùng hiện tại đơn; chủ ngữ 'she' số ít nên động từ thêm -s."
    }},
    {{
      "question": "Listen! The birds ___ outside.",
      "options": ["sing", "sings", "are singing", "singing"],
      "answer": 2,
      "explanation": "'Listen!' báo hiệu hành động đang diễn ra nên dùng hiện tại tiếp diễn."
    }}
  ]
}}
Rules:
- The two sentences in the JSON structure above are FORMAT examples only — do NOT reuse them. Write completely new sentences.
- Set the sentences in these everyday contexts: {themes}.
- The "question" sentence MUST be 100% in English. Never mix Vietnamese words into it.
- "answer" is the 0-based index of the ONLY correct option. Double-check subject-verb agreement before choosing it.
- Each question has exactly 4 options; the 3 wrong options are common learner mistakes.
- Vary the subjects (I, you, he, she, it, we, they, names) and use clear time signals
  (every day, usually, always, on Sundays, now, at the moment, right now, Look!, Listen!...).
- Use natural English word order: adverbs like "usually"/"always" go before the main verb,
  time phrases like "every day"/"right now" go at the start or the end of the sentence.
- "explanation" is ONE short Vietnamese sentence mentioning the time signal or rule.
- All {count} questions must be different from each other.
- Before returning, re-check every question: Present Simple needs "I/you/we/they + base verb"
  and "he/she/it + verb-s"; Present Continuous needs "am/is/are + verb-ing". Fix any wrong "answer" index."""


def _parse_llm_json(raw: str) -> dict:
    """Strip markdown code fences and parse the model's JSON reply."""
    cleaned = re.sub(r"^```(?:json)?\s*", "", raw.strip(), flags=re.IGNORECASE)
    cleaned = re.sub(r"\s*```$", "", cleaned).strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        raise HTTPException(status_code=502, detail="Không thể phân tích phản hồi từ AI.")


def _is_continuous(option: str) -> bool:
    words = option.lower().split()
    return len(words) >= 2 and words[0] in ("am", "is", "are") and words[-1].endswith("ing")


def _answer_matches_explanation(q: dict) -> bool:
    """Loại câu mà đáp án mâu thuẫn với giải thích (model thỉnh thoảng chọn sai index)."""
    expl = (q.get("explanation") or "").lower()
    continuous_ans = _is_continuous(q["options"][q["answer"]])
    says_continuous = "tiếp diễn" in expl
    says_simple = "hiện tại đơn" in expl
    if says_continuous and not says_simple:
        return continuous_ans
    if says_simple and not says_continuous:
        return not continuous_ans
    return True  # giải thích không rõ thì bỏ qua phép kiểm tra


def _validate_questions(parsed: dict) -> list[dict]:
    """Keep only well-formed questions: 4 distinct options, valid answer, no duplicates."""
    questions = []
    seen = set()
    for q in parsed.get("questions", []):
        opts = q.get("options")
        ans = q.get("answer")
        if (
            isinstance(q.get("question"), str)
            and "___" in q["question"]
            and q["question"].strip().lower() not in seen
            and isinstance(opts, list)
            and len(opts) == 4
            and len({str(o).strip().lower() for o in opts}) == 4
            and isinstance(ans, int)
            and 0 <= ans < 4
        ):
            item = {
                "question": q["question"],
                "options": [str(o) for o in opts],
                "answer": ans,
                "explanation": str(q.get("explanation") or ""),
            }
            if _answer_matches_explanation(item):
                seen.add(q["question"].strip().lower())
                questions.append(item)
    return questions


class ExamplesIn(BaseModel):
    word: str
    vietnamese: str


class GrammarQuizIn(BaseModel):
    topic: str = "mixed"
    count: int = 5


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
    return _parse_llm_json(resp.choices[0].message.content)


@router.post("/grammar-quiz")
async def generate_grammar_quiz(data: GrammarQuizIn):
    topic_label = _GRAMMAR_TOPICS.get(data.topic)
    if not topic_label:
        raise HTTPException(
            status_code=400,
            detail="topic phải là present_simple, present_continuous hoặc mixed",
        )
    count = max(1, min(data.count, 10))

    client = _get_client()

    # JSON hỏng / câu hỏi kém xảy ra ngẫu nhiên → thử 70B hai lần rồi mới rơi về 8B
    for model in (GRAMMAR_MODEL, GRAMMAR_MODEL, TEXT_MODEL):
        messages = [
            {
                "role": "system",
                "content": "You are an English grammar teacher. Return ONLY valid JSON, no markdown, no text outside the JSON.",
            },
            {
                "role": "user",
                "content": _GRAMMAR_PROMPT.format(
                    count=count,
                    topic_label=topic_label,
                    themes=", ".join(random.sample(_GRAMMAR_THEMES, 4)),
                ),
            },
        ]
        try:
            resp = await client.chat.completions.create(
                model=model,
                messages=messages,
                temperature=0.8,
                max_tokens=3000,
            )
            questions = _validate_questions(_parse_llm_json(resp.choices[0].message.content))
        except Exception:
            continue
        # Chấp nhận khi có ít nhất nửa số câu yêu cầu sau khi lọc
        if len(questions) >= max(1, count // 2):
            return {"questions": questions}

    raise HTTPException(status_code=502, detail="AI không tạo được câu hỏi hợp lệ, thử lại nhé.")
