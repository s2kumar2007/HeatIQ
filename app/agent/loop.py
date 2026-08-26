"""
Agent loop using Grok API (OpenAI-compatible client via xAI).
"""
from __future__ import annotations

import json
from typing import Any

from openai import AsyncOpenAI

from app.agent.thresholds import THRESHOLD_SUMMARY
from app.agent.tools import TOOLS, execute_tool, resolve_location
from app.config import settings
from app.models import AskResponse, ToolCallTrace

MAX_AGENT_TURNS = 6

SYSTEM_PROMPT = f"""You are the Heat Decision Agent, an autonomous assistant that
answers heat-safety questions about locations in and around Indian cities
(currently Chennai) using the FortyGuard Temperature API.

You have tools: get_current_heat, get_exceedance, get_forecast, and compare_route.
Decide which ones are needed — do not call every tool by default.
  - "Is it hot right now in X?" -> get_current_heat.
  - "Safe for outdoor event?" -> get_forecast + get_exceedance.
  - "Which route is cooler?" -> compare_route.

If a location is a place name, estimate lat/lon from your knowledge and note it.

Thresholds:
{THRESHOLD_SUMMARY}

Once done calling tools, respond with ONLY this JSON (no markdown fences):

{{
  "decision": "Safe" | "Caution" | "Unsafe",
  "reasoning": "<explanation citing data and thresholds>",
  "data_used": {{"...": "..."}}
}}
"""


class AgentLoopError(Exception):
    pass


async def run_agent(question: str) -> AskResponse:
    client = AsyncOpenAI(
        api_key=settings.grok_api_key,
        base_url="https://api.x.ai/v1",
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
                "(Known locations: Anna Nagar (13.085,80.210), T Nagar (13.042,80.234), "
                "Adyar (13.007,80.257), Velachery (12.979,80.221), Chennai (13.083,80.271))"
            ),
        },
    ]

    trace: list[ToolCallTrace] = []
    step = 0
    final_text = ""

    for _turn in range(MAX_AGENT_TURNS):
        response = await client.chat.completions.create(
            model=settings.grok_model,
            max_tokens=1500,
            tools=TOOLS,
            messages=messages,
        )

        msg = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        # Capture text in case this is the final turn
        if msg.content:
            final_text = msg.content

        # No tool calls -> final answer
        if finish_reason != "tool_calls" or not msg.tool_calls:
            break

        # Append assistant message to history
        messages.append(msg)

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
                result = await execute_tool(tool_name, tool_input)
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
