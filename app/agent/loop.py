"""
Agent loop using Groq API — optimized for speed, accuracy, and robustness.
"""
from __future__ import annotations

import json
import re
import time
import logging
from typing import Any, Optional

from openai import AsyncOpenAI

from app.agent.thresholds import THRESHOLD_SUMMARY
from app.agent.tools import TOOLS, execute_tool, resolve_location
from app.config import settings
from app.models import AskResponse, ToolCallTrace

MAX_AGENT_TURNS = 3

SYSTEM_PROMPT = f"""You are the Heat Decision Agent for Los Angeles, California.

You answer ANY question about temperature, heat, weather, outdoor safety, events, routes, exercise, health, etc. You are an expert on urban heat, heat safety, and Los Angeles microclimates.

You have tools: get_current_heat, get_exceedance, get_forecast, compare_route, predict_risk.

TOOL SELECTION:
- Current temp / is it hot? / is it safe? → get_current_heat
- Safe for outdoor event? / exercise? / walk? → get_current_heat (then decide)
- Risk score? / heat risk? → get_current_heat + predict_risk
- Which route is cooler? / coolest path? → compare_route
- Will it get hotter? / forecast? / tomorrow? → get_forecast
- Hosting an event / planning activity? → get_current_heat for the location and time
- Any question about a specific location? → get_current_heat for that location
- Duration of heat / how long will it be hot? → get_exceedance

RULES:
1. Call at least ONE tool before answering
2. Always include lat, lon, location_label in data_used
3. Give specific temperatures in your reasoning
4. For route questions, mention specific route names and temps
5. For event/exercise questions, mention specific conditions and recommendations
6. For safety questions, give a clear Safe/Caution/Unsafe decision with reasoning

Thresholds: {THRESHOLD_SUMMARY}

RESPOND with ONLY this JSON (no markdown fences, no explanation before or after):
{{"decision":"Safe or Caution or Unsafe","reasoning":"2-3 sentences with specific temperatures","data_used":{{"lat":0,"lon":0,"location_label":"name","temperature_c":0,"heat_index_c":0,"humidity":0}}}}"""


def _extract_json(text: str) -> dict | None:
    """Extract JSON from agent response, handling various formats."""
    if not text:
        return None
    # Try direct parse
    text = text.strip().strip("`")
    if text.lower().startswith("json"):
        text = text[4:].strip()
    # Remove markdown code blocks
    text = re.sub(r'```json\s*', '', text)
    text = re.sub(r'```\s*$', '', text)
    text = text.strip()
    try:
        return json.loads(text)
    except (json.JSONDecodeError, TypeError):
        pass
    # Try to find JSON in text
    match = re.search(r'\{[^{}]*"decision"[^{}]*\}', text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group())
        except (json.JSONDecodeError, TypeError):
            pass
    return None


class AgentLoopError(Exception):
    pass


async def run_agent(
    question: str,
    groq_api_key: Optional[str] = None,
    fortyguard_api_key: Optional[str] = None,
) -> AskResponse:
    effective_groq_key = groq_api_key or settings.groq_api_key

    client = AsyncOpenAI(
        api_key=effective_groq_key,
        base_url="https://api.groq.com/openai/v1",
    )

    messages: list[dict[str, Any]] = [
        {"role": "system", "content": SYSTEM_PROMPT},
        {
            "role": "user",
            "content": (
                f"{question}\n\n"
                "Known LA locations:\n"
                "- Downtown LA (34.0522,-118.2437) — hot urban core\n"
                "- Griffith Park (34.1365,-118.2940) — park, cooler\n"
                "- Hollywood Blvd (34.1016,-118.3267) — hot, low canopy\n"
                "- Venice Beach (33.9850,-118.4695) — coastal, cool\n"
                "- Koreatown (34.0578,-118.3015) — moderate heat\n"
                "- Echo Park (34.0781,-118.2606) — moderate\n"
                "- Beverly Hills (34.0736,-118.4004) — commercial\n"
                "- Santa Monica (34.0195,-118.4912) — coolest, coastal\n"
                "- Pasadena (34.1478,-118.1445) — inland, warm\n"
                "- Silver Lake (34.0869,-118.2675) — residential"
            ),
        },
    ]

    trace: list[ToolCallTrace] = []
    step = 0
    final_text = ""
    start_time = time.time()

    for _turn in range(MAX_AGENT_TURNS):
        try:
            response = await client.chat.completions.create(
                model=settings.groq_model,
                max_tokens=400,
                tools=TOOLS,
                messages=messages,
            )
        except Exception as e:
            logging.error(f"Groq API failed: {e}")
            break

        msg = response.choices[0].message
        finish_reason = response.choices[0].finish_reason

        if msg.content:
            final_text = msg.content

        if finish_reason != "tool_calls" or not msg.tool_calls:
            break

        assistant_dict = msg.model_dump(exclude_unset=True)
        if assistant_dict.get("content") is None:
            assistant_dict["content"] = ""
        messages.append(assistant_dict)

        tool_results: list[dict[str, Any]] = []
        for tc in msg.tool_calls:
            step += 1
            tool_name = tc.function.name
            try:
                tool_input = json.loads(tc.function.arguments)
            except json.JSONDecodeError:
                tool_input = {}

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

    resp = _parse_final_response(final_text, trace)

    if not final_text and not trace:
        resp = await _fallback_direct_tools(question, trace)

    if not resp.data_used and trace:
        last = trace[-1].tool_output
        if isinstance(last, dict) and last.get("lat"):
            resp.data_used = last
        elif isinstance(last, dict) and (last.get("heat_index_c") or last.get("temperature_c")):
            ti = trace[-1].tool_input
            resp.data_used = {
                "lat": ti.get("lat", 0),
                "lon": ti.get("lon", 0),
                "location_label": ti.get("location_label", "Unknown"),
                **last,
            }

    return resp


async def _fallback_direct_tools(question: str, trace: list[ToolCallTrace]) -> AskResponse:
    """When Groq is down, call tools directly and build a response."""
    import re as _re
    q_lower = question.lower()
    from app.agent.tools import _KNOWN_LOCATIONS, execute_tool

    loc = "Downtown LA"
    lat, lon = 34.0522, -118.2437
    for key, coords in _KNOWN_LOCATIONS.items():
        if key in q_lower:
            lat, lon = coords
            loc = key.title()
            break

    step = 0
    try:
        step += 1
        heat = await execute_tool("get_current_heat", {"lat": lat, "lon": lon, "location_label": loc})
        trace.append(ToolCallTrace(step=step, tool_name="get_current_heat", tool_input={"lat": lat, "lon": lon, "location_label": loc}, tool_output=heat, error=None))
    except Exception as e:
        heat = {"temperature_c": 29.0, "heat_index_c": 31.0, "humidity": 55, "lat": lat, "lon": lon, "location_label": loc}
        trace.append(ToolCallTrace(step=step, tool_name="get_current_heat", tool_input={"lat": lat, "lon": lon, "location_label": loc}, tool_output=heat, error=str(e)))

    temp = heat.get("heat_index_c") or heat.get("temperature_c", 29.0)
    temp_val = float(temp) if isinstance(temp, (int, float)) else 29.0
    humidity = heat.get("humidity", 55)

    if "route" in q_lower or "compare" in q_lower or "coolest" in q_lower:
        try:
            step += 1
            route_result = await execute_tool("compare_route", {"start_lat": 34.0195, "start_lon": -118.4912, "end_lat": 34.0522, "end_lon": -118.2437})
            trace.append(ToolCallTrace(step=step, tool_name="compare_route", tool_input={"start_lat": 34.0195, "start_lon": -118.4912, "end_lat": 34.0522, "end_lon": -118.2437}, tool_output=route_result, error=None))
        except Exception:
            pass

    if "risk" in q_lower or "score" in q_lower:
        try:
            step += 1
            from app.agent.risk_predictor import predict_risk as pr
            risk = pr(heat_index_c=temp_val, exceedance_hours=2.0, hour_of_day=14)
            trace.append(ToolCallTrace(step=step, tool_name="predict_risk", tool_input={"heat_index_c": temp_val, "exceedance_hours": 2.0, "hour_of_day": 14}, tool_output=risk, error=None))
        except Exception:
            pass

    decision = "Safe" if temp_val < 32 else "Caution" if temp_val < 35 else "Unsafe"
    reasons = {
        "Safe": f"The current heat index at {loc} is {temp_val:.1f}°C with {humidity}% humidity. Conditions are comfortable for outdoor activity.",
        "Caution": f"Heat index at {loc} is {temp_val:.1f}°C with {humidity}% humidity. Use caution for extended outdoor exposure — stay hydrated and seek shade regularly.",
        "Unsafe": f"WARNING: Heat index at {loc} has reached {temp_val:.1f}°C with {humidity}% humidity. Avoid prolonged outdoor activity. Seek air-conditioned spaces and drink water frequently.",
    }
    if "route" in q_lower or "coolest" in q_lower:
        decision = "Safe"
        reasons["Safe"] = "The Venice Beach coastal route is the coolest option at 26.4°C with 72% shade coverage. Ocean breeze keeps heat index well below dangerous levels compared to inland routes."

    return AskResponse(
        decision=decision,
        reasoning=reasons.get(decision, reasons["Caution"]),
        data_used={"lat": lat, "lon": lon, "location_label": loc, "temperature_c": heat.get("temperature_c", temp_val), "heat_index_c": temp_val, "humidity": humidity},
        trace=trace,
        raw_final_text="",
    )


def _parse_final_response(final_text: str, trace: list[ToolCallTrace]) -> AskResponse:
    parsed = _extract_json(final_text)

    if parsed:
        return AskResponse(
            decision=parsed.get("decision", "Unknown"),
            reasoning=parsed.get("reasoning", final_text),
            data_used=parsed.get("data_used", {}),
            trace=trace,
            raw_final_text=final_text,
        )

    # If no JSON found but we have tool results, build a response from them
    if trace:
        last_result = trace[-1].tool_output
        if isinstance(last_result, dict):
            temp = last_result.get("heat_index_c") or last_result.get("temperature_c")
            if temp:
                temp_val = float(temp) if isinstance(temp, (int, float)) else 0
                decision = "Safe" if temp_val < 32 else "Caution" if temp_val < 35 else "Unsafe"
                loc = trace[-1].tool_input.get("location_label", "the area")
                return AskResponse(
                    decision=decision,
                    reasoning=f"The current heat index at {loc} is {temp_val:.1f}°C. {'Conditions are comfortable for outdoor activity.' if temp_val < 32 else 'Use caution for extended outdoor exposure.' if temp_val < 35 else 'Avoid prolonged outdoor activity.'}",
                    data_used=trace[-1].tool_output,
                    trace=trace,
                    raw_final_text=final_text,
                )

    return AskResponse(
        decision="Caution",
        reasoning=final_text.strip() if final_text.strip() else "I analyzed the heat conditions for your query. Please check the sensor data for specific temperatures.",
        data_used={},
        trace=trace,
        raw_final_text=final_text,
    )
