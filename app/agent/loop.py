"""
Agent loop using Groq API (OpenAI-compatible client via Groq).
"""
from __future__ import annotations

import json
from typing import Any, Optional

from openai import AsyncOpenAI

from app.agent.thresholds import THRESHOLD_SUMMARY
from app.agent.tools import TOOLS, execute_tool, resolve_location
from app.config import settings
from app.models import AskResponse, ToolCallTrace

MAX_AGENT_TURNS = 6

SYSTEM_PROMPT = f"""You are the Heat Decision Agent for Los Angeles, California — an expert urban heat analyst powered by FortyGuard radiometric data.

You have tools: get_current_heat, get_exceedance, get_forecast, compare_route, and predict_risk.
Decide which ones are needed — do not call every tool by default.

TOOL SELECTION GUIDE:
  - "What's the temp / is it hot?" → get_current_heat for that location
  - "Safe for outdoor event / should I go out?" → get_forecast + get_exceedance
  - "Risk score / ML prediction / what does the model say?" → get_current_heat + get_exceedance, then predict_risk
  - "Which route is cooler / safest?" → compare_route
  - "Will it get hotter?" → get_forecast
  - "How long will it stay hot?" → get_exceedance

RULES:
1. Always use location_label in tool calls so locations are identifiable
2. Always call at least one tool before answering — never guess temperatures
3. When comparing locations, use specific data from tool results
4. Include actual temperature numbers, humidity, and heat index in your reasoning
5. Reference the threshold bands below when classifying risk
6. For route questions, mention specific temperatures along each route

Thresholds:
{THRESHOLD_SUMMARY}

RESPONSE FORMAT — respond with ONLY this JSON (no markdown fences):
{{
  "decision": "Safe" | "Caution" | "Unsafe",
  "reasoning": "<detailed explanation with specific temperatures, locations, and threshold comparisons>",
  "data_used": {{
    "lat": <number>,
    "lon": <number>,
    "location_label": "<location name>",
    "temperature_c": <number>,
    "heat_index_c": <number>,
    "humidity": <number>,
    "tool_results": ["<list of tools called>"]
  }}
}}

IMPORTANT: Always include lat, lon, and location_label in data_used so the frontend can plot your query location on the map."""


class AgentLoopError(Exception):
    pass


async def run_agent(
    question: str,
    groq_api_key: Optional[str] = None,
    fortyguard_api_key: Optional[str] = None,
) -> AskResponse:
    """Run the heat decision agent for a given question.

    Args:
        question: The heat-safety question to answer.
        groq_api_key: Optional per-request Groq API key override (takes precedence
            over the .env / settings value). Allows the frontend to supply a user-
            configured key without restarting the server.
        fortyguard_api_key: Optional per-request FortyGuard API key override.
    """
    # Resolve which Groq key to use (per-request override takes priority)
    effective_groq_key = groq_api_key or settings.groq_api_key

    client = AsyncOpenAI(
        api_key=effective_groq_key,
        base_url="https://api.groq.com/openai/v1",
    )

    messages: list[dict[str, Any]] = [
        {
            "role": "system",
            "content": SYSTEM_PROMPT,
        },
        {
            "role": "user",
            "content": (
                f"{question}\n\n"
                "Active heatmap: cbebf211-2a44-438b-adfa-497400a95d84 (Los Angeles, Aug 27 2026)\n"
                "Known locations in Los Angeles:\n"
                "- Downtown LA (34.0522,-118.2437) — High density commercial, low canopy, hot\n"
                "- Griffith Park (34.1365,-118.2940) — Urban park, high canopy, cooler\n"
                "- Hollywood Blvd (34.1016,-118.3267) — Entertainment district, low canopy, hot\n"
                "- Venice Beach (33.9850,-118.4695) — Coastal, moderate canopy, cooler\n"
                "- Koreatown (34.0578,-118.3015) — Residential commercial, moderate heat\n"
                "- Echo Park (34.0781,-118.2606) — Mixed residential, moderate canopy\n"
                "- Beverly Hills (34.0736,-118.4004) — Commercial residential\n"
                "- Silver Lake (34.0869,-118.2675) — Residential, moderate canopy\n"
                "- Santa Monica (34.0195,-118.4912) — Coastal, coolest area"
            ),
        },
    ]

    trace: list[ToolCallTrace] = []
    step = 0
    final_text = ""

    for _turn in range(MAX_AGENT_TURNS):
        try:
            response = await client.chat.completions.create(
                model=settings.groq_model,
                max_tokens=1500,
                tools=TOOLS,
                messages=messages,
            )
        except Exception as e:
            import logging
            logging.error(f"Groq API call failed: {e}")
            if hasattr(e, 'response'):
                logging.error(f"Response body: {e.response.text}")
            raise e

        msg = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        # Capture text in case this is the final turn
        if msg.content:
            final_text = msg.content

        # No tool calls -> final answer
        if finish_reason != "tool_calls" or not msg.tool_calls:
            break

        # Append assistant message to history safely for Groq
        assistant_dict = msg.model_dump(exclude_unset=True)
        if assistant_dict.get("content") is None:
            assistant_dict["content"] = ""
        messages.append(assistant_dict)

        # Execute each tool call
        tool_results: list[dict[str, Any]] = []
        for tc in msg.tool_calls:
            step += 1
            tool_name = tc.function.name
            try:
                tool_input = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                tool_input = {}

            # Resolve location label to lat/lon if missing
            if "lat" not in tool_input and "location_label" in tool_input:
                coords = resolve_location(tool_input["location_label"])
                if coords:
                    tool_input["lat"], tool_input["lon"] = coords

            try:
                result = await execute_tool(
                    tool_name, tool_input,
                    fortyguard_api_key=fortyguard_api_key,
                )
                error = None
            except NotImplementedError as e:
                result = {"error": str(e), "implemented": False}
                error = str(e)
            except Exception as e:
                result = {"error": str(e)}
                error = str(e)

            trace.append(ToolCallTrace(
                step=step,
                tool_name=tool_name,
                tool_input=tool_input,
                tool_output=result,
                error=error,
            ))

            tool_results.append({
                "role": "tool",
                "tool_call_id": tc.id,
                "name": tc.function.name,
                "content": json.dumps(result, default=str),
            })

        messages.extend(tool_results)

    return _parse_final_response(final_text, trace)


def _parse_final_response(final_text: str, trace: list[ToolCallTrace]) -> AskResponse:
    cleaned = final_text.strip().strip("`")
    if cleaned.lower().startswith("json"):
        cleaned = cleaned[4:].strip()

    try:
        parsed = json.loads(cleaned)
        return AskResponse(
            decision=parsed.get("decision", "Unknown"),
            reasoning=parsed.get("reasoning", cleaned),
            data_used=parsed.get("data_used", {}),
            trace=trace,
            raw_final_text=final_text,
        )
    except (json.JSONDecodeError, TypeError):
        return AskResponse(
            decision="Unknown",
            reasoning=f"Agent did not return valid JSON. Raw: {final_text or '(empty)'}",
            data_used={},
            trace=trace,
            raw_final_text=final_text,
        )
