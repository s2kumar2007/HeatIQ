"""
The agent loop: sends the user's question + tool schemas to Claude,
executes whatever tools Claude decides to call, feeds results back, and
repeats until Claude emits a final structured decision.

This is the "agentic" core: nothing here hardcodes which tools get
called or in what order — that's entirely Claude's decision based on the
question and the results it's seen so far.
"""
from __future__ import annotations

import json
from typing import Any

import anthropic

from app.agent.thresholds import THRESHOLD_SUMMARY
from app.agent.tools import TOOLS, execute_tool, resolve_location
from app.config import settings
from app.models import AskResponse, ToolCallTrace

MAX_AGENT_TURNS = 6  # safety cap on tool-call round-trips

SYSTEM_PROMPT = f"""You are the Heat Decision Agent, an autonomous assistant that
answers heat-safety questions about locations in and around Indian cities
(currently Chennai) using the FortyGuard Temperature API.

You have three primary tools: get_current_heat, get_exceedance, and
get_forecast. Decide for yourself which ones are actually needed to
answer the question well — do not call every tool by default. For
example:
  - "Is it hot right now in X?" -> get_current_heat is probably enough.
  - "Is it safe to run an outdoor event in X tomorrow afternoon?" ->
    you likely need get_forecast (future conditions) and get_exceedance
    (sustained exposure over the event window), and possibly
    get_current_heat as a sanity check.
  - Anything mentioning a route or "which way is cooler" -> compare_route
    (note: this tool is not implemented yet; if called it will return an
    error you should explain plainly to the user instead of guessing).

If the user's location is a place name rather than coordinates, use your
own knowledge of the location to estimate a reasonable lat/lon, or note
in your reasoning that you approximated it, unless the location resolver
tool result already gave you exact coordinates.

Reason over tool results against these documented thresholds:

{THRESHOLD_SUMMARY}

Once you have enough data, respond with your FINAL answer as a single
JSON object (and nothing else after it) in this exact shape:

{{
  "decision": "Safe" | "Caution" | "Unsafe",
  "reasoning": "<clear explanation citing the specific data points and thresholds that drove this decision>",
  "data_used": {{"...": "...key data points you relied on..."}}
}}

Do not wrap the JSON in markdown code fences. Only emit this JSON once
you are done calling tools and are ready to give your final answer.
"""


class AgentLoopError(Exception):
    pass


async def run_agent(question: str) -> AskResponse:
    client = anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)

    messages: list[dict[str, Any]] = [
        {
            "role": "user",
            "content": (
                f"{question}\n\n"
                "(Note: a small static location resolver exists for a few "
                "Chennai neighborhoods (Anna Nagar, T Nagar, Adyar, "
                "Velachery) — if the question names one of these, you may "
                "assume approximate coordinates near central Chennai "
                "(13.08, 80.27) and refine with your own knowledge; "
                "otherwise state the approximation clearly in your "
                "reasoning.)"
            ),
        }
    ]

    trace: list[ToolCallTrace] = []
    step = 0
    final_text = ""

    for _turn in range(MAX_AGENT_TURNS):
        response = await client.messages.create(
            model=settings.claude_model,
            max_tokens=1500,
            system=SYSTEM_PROMPT,
            tools=TOOLS,
            messages=messages,
        )

        # Collect any tool_use blocks; also capture plain text in case
        # this is the final turn.
        tool_use_blocks = [b for b in response.content if b.type == "tool_use"]
        text_blocks = [b.text for b in response.content if b.type == "text"]
        if text_blocks:
            final_text = "\n".join(text_blocks)

        if not tool_use_blocks:
            # No more tools requested -> this should be the final answer.
            break

        # Append the assistant turn (with tool_use blocks) to history
        messages.append({"role": "assistant", "content": response.content})

        # Execute every requested tool call and build tool_result blocks
        tool_results: list[dict[str, Any]] = []
        for block in tool_use_blocks:
            step += 1
            tool_input = dict(block.input)

            # If a location_label was given but no lat/lon and it's a
            # known static location, resolve it (small convenience layer;
            # the LLM can also just supply its own estimated lat/lon).
            if "lat" not in tool_input and "location_label" in tool_input:
                coords = resolve_location(tool_input["location_label"])
                if coords:
                    tool_input["lat"], tool_input["lon"] = coords

            try:
                result = await execute_tool(block.name, tool_input)
                error = None
            except NotImplementedError as e:
                result = {"error": str(e), "implemented": False}
                error = str(e)
            except Exception as e:  # noqa: BLE001 — surface any failure to the LLM
                result = {"error": str(e)}
                error = str(e)

            trace.append(
                ToolCallTrace(
                    step=step,
                    tool_name=block.name,
                    tool_input=tool_input,
                    tool_output=result,
                    error=error,
                )
            )

            tool_results.append(
                {
                    "type": "tool_result",
                    "tool_use_id": block.id,
                    "content": json.dumps(result, default=str),
                    "is_error": error is not None,
                }
            )

        messages.append({"role": "user", "content": tool_results})

    return _parse_final_response(final_text, trace)


def _parse_final_response(final_text: str, trace: list[ToolCallTrace]) -> AskResponse:
    cleaned = final_text.strip()
    if cleaned.startswith("```"):
        # Strip accidental code fences defensively
        cleaned = cleaned.strip("`")
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
        # Fall back gracefully rather than crashing the request — the
        # trace is still returned so the UI/judges can see what happened.
        return AskResponse(
            decision="Unknown",
            reasoning=(
                "Agent did not return valid structured JSON. Raw final "
                f"response: {final_text or '(empty)'}"
            ),
            data_used={},
            trace=trace,
            raw_final_text=final_text,
        )
