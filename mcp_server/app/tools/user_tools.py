# Copyright 2025 DataRobot, Inc.
#
# Licensed under the Apache License, Version 2.0 (the "License");
# you may not use this file except in compliance with the License.
# You may obtain a copy of the License at
#
#   http://www.apache.org/licenses/LICENSE-2.0
#
# Unless required by applicable law or agreed to in writing, software
# distributed under the License is distributed on an "AS IS" BASIS,
# WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
# See the License for the specific language governing permissions and
# limitations under the License.

import hashlib
import json
import logging
import os
from datetime import datetime, timedelta
from typing import Annotated

from datarobot_genai.drmcp import dr_mcp_tool
from fastmcp.exceptions import ToolError
from fastmcp.tools.tool import ToolResult

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Data Loading
# ---------------------------------------------------------------------------
_GOLF_COURSES: list[dict] = []
_PRICING_DATA: dict[str, dict[str, dict]] = {}
_TOOLS_DIR = os.path.dirname(__file__)
_COURSES_FILE = os.path.join(_TOOLS_DIR, "golf_courses.json")
_PRICING_FILE = os.path.join(_TOOLS_DIR, "pricing_data.json")


def _load_courses() -> list[dict]:
    global _GOLF_COURSES
    if not _GOLF_COURSES:
        with open(_COURSES_FILE, encoding="utf-8") as f:
            _GOLF_COURSES = json.load(f)
    return _GOLF_COURSES


def _load_pricing() -> dict[str, dict[str, dict]]:
    global _PRICING_DATA
    if not _PRICING_DATA:
        with open(_PRICING_FILE, encoding="utf-8") as f:
            _PRICING_DATA = json.load(f)
    return _PRICING_DATA


def _find_course(query: str) -> dict | None:
    courses = _load_courses()
    q = query.strip()
    for c in courses:
        if q == str(c["cc_id"]) or q == c["name"]:
            return c
    for c in courses:
        if q in c["name"] or q in str(c["cc_id"]):
            return c
    return None


# =============================================================================
# Tool 1: ゴルフ場コース一覧
# =============================================================================
@dr_mcp_tool(tags={"golf", "master"})
async def search_golf_courses(
    query: Annotated[str, "GCコード（例: '204'）、コース名（例: 'GC204'）、または 'all' で全コース一覧を取得"],
) -> ToolResult:
    """PGMゴルフ場を検索します。GCコードまたはコース名で検索、'all'で全31コース一覧を取得できます。"""
    if not query or not query.strip():
        raise ToolError("検索キーワードを入力してください。")

    q = query.strip()
    courses = _load_courses()

    if q.lower() == "all":
        results = courses
    else:
        results = [c for c in courses if q in c["name"] or q in str(c["cc_id"])]

    if not results:
        return ToolResult(structured_content={
            "found": 0,
            "message": f"'{q}' に一致するゴルフ場が見つかりませんでした。全コース一覧は query='all' で取得できます。",
            "courses": [],
        })

    course_list = [
        {
            "gc_code": c["cc_id"],
            "name": c["name"],
            "prefecture": c.get("prefecture", ""),
            "brand": c.get("brand", ""),
            "segment": c.get("segment", ""),
            "base_price": c["base_price"],
            "avg_price": c["avg_price"],
            "min_price": c["min_price"],
            "max_price": c["max_price"],
            "capacity": c["capacity"],
        }
        for c in results
    ]

    return ToolResult(structured_content={
        "found": len(results),
        "courses": course_list,
    })


# =============================================================================
# Tool 2: 過去の価格実績データ取得
# =============================================================================
@dr_mcp_tool(tags={"golf", "data", "history"})
async def get_historical_prices(
    gc_code: Annotated[str, "GCコード。例: '204', '347'"],
    start_date: Annotated[str, "開始日（YYYY-MM-DD形式）。例: '2024-10-01'"],
    end_date: Annotated[str, "終了日（YYYY-MM-DD形式）。例: '2024-10-31'"],
) -> ToolResult:
    """指定GCコード・期間の実績価格データ（日別集約）を取得します。データ期間: 2024-05-01〜2025-11-30"""
    if not gc_code or not gc_code.strip():
        raise ToolError("GCコードを入力してください。")

    gc = gc_code.strip()
    pricing = _load_pricing()

    if gc not in pricing:
        available = sorted(pricing.keys(), key=int)
        raise ToolError(f"GCコード '{gc}' のデータがありません。利用可能: {', '.join(available)}")

    try:
        dt_start = datetime.strptime(start_date.strip(), "%Y-%m-%d")
        dt_end = datetime.strptime(end_date.strip(), "%Y-%m-%d")
    except ValueError:
        raise ToolError("日付はYYYY-MM-DD形式で入力してください。")

    if (dt_end - dt_start).days > 365:
        raise ToolError("最大365日間まで指定できます。期間を絞ってください。")

    gc_data = pricing[gc]
    course = _find_course(gc)
    daily = []
    current = dt_start
    while current <= dt_end:
        date_str = current.strftime("%Y-%m-%d")
        if date_str in gc_data:
            entry = gc_data[date_str]
            daily.append({
                "date": date_str,
                "dow": ["月", "火", "水", "木", "金", "土", "日"][current.weekday()],
                "avg_price": entry["avg_price"],
                "min_price": entry["min_price"],
                "max_price": entry["max_price"],
                "start_price": entry["avg_start"],
                "discount_rate": entry["avg_discount"],
                "total_sales": entry["total_sales"],
                "is_holiday": entry["is_holiday"],
                "is_busy": entry["is_busy"],
            })
        current += timedelta(days=1)

    if not daily:
        return ToolResult(structured_content={
            "gc_code": gc, "found": 0,
            "message": "指定期間のデータがありません。データ期間: 2024-05-01〜2025-11-30",
        })

    prices = [d["avg_price"] for d in daily]
    return ToolResult(structured_content={
        "summary": {
            "gc_code": gc,
            "course_name": course["name"] if course else f"GC{gc}",
            "period": f"{start_date.strip()} 〜 {end_date.strip()}",
            "data_days": len(daily),
            "avg_price": round(sum(prices) / len(prices)),
            "min_price": min(prices),
            "max_price": max(prices),
        },
        "daily": daily,
    })


# =============================================================================
# Tool 3: 推奨価格予測（実データパターン分析）
# =============================================================================
@dr_mcp_tool(tags={"golf", "pricing"})
async def predict_dynamic_price(
    gc_code: Annotated[str, "GCコード。例: '204', '347'"],
    play_date: Annotated[str, "プレー日（YYYY-MM-DD形式）。例: '2026-04-12'"],
) -> ToolResult:
    """過去の実績データに基づいて推奨プレーフィを算出します。同月同曜日の過去パターンから予測。"""
    if not gc_code or not gc_code.strip():
        raise ToolError("GCコードを入力してください。")
    if not play_date or not play_date.strip():
        raise ToolError("プレー日をYYYY-MM-DD形式で入力してください。")

    gc = gc_code.strip()
    pricing = _load_pricing()
    if gc not in pricing:
        raise ToolError(f"GCコード '{gc}' のデータがありません。search_golf_courses で確認してください。")

    try:
        target = datetime.strptime(play_date.strip(), "%Y-%m-%d")
    except ValueError:
        raise ToolError("プレー日はYYYY-MM-DD形式で入力してください。")

    course = _find_course(gc)
    result = _predict_from_data(gc, target, pricing[gc], course)
    return ToolResult(structured_content={
        "gc_code": gc,
        "course_name": course["name"] if course else f"GC{gc}",
        "play_date": play_date.strip(),
        **result,
    })


def _predict_from_data(gc, target, gc_data, course):
    target_dow = target.weekday()
    target_month = target.month
    dow_name = ["月", "火", "水", "木", "金", "土", "日"][target_dow]
    is_weekend = target_dow >= 5  # 土日

    same_pattern = []   # 同月同曜日
    same_month = []     # 同月
    same_dow = []       # 同曜日（全期間）
    same_daytype = []   # 同じ日タイプ（平日/土日）
    all_prices = []

    for date_str, entry in gc_data.items():
        dt = datetime.strptime(date_str, "%Y-%m-%d")
        price = entry["avg_price"]
        all_prices.append(price)
        entry_is_weekend = dt.weekday() >= 5

        if dt.weekday() == target_dow:
            same_dow.append({"date": date_str, "price": price,
                             "start_price": entry["avg_start"],
                             "discount": entry["avg_discount"],
                             "is_holiday": entry["is_holiday"],
                             "is_busy": entry["is_busy"]})
        if entry_is_weekend == is_weekend:
            same_daytype.append(price)

        if dt.month == target_month:
            same_month.append(price)
            if dt.weekday() == target_dow:
                same_pattern.append({
                    "date": date_str, "price": price,
                    "start_price": entry["avg_start"],
                    "discount": entry["avg_discount"],
                    "is_holiday": entry["is_holiday"],
                    "is_busy": entry["is_busy"],
                })

    base_price = course["base_price"] if course else round(sum(all_prices) / len(all_prices))

    if same_pattern:
        recommended = round(sum(p["price"] for p in same_pattern) / len(same_pattern))
        p_min = min(p["price"] for p in same_pattern)
        p_max = max(p["price"] for p in same_pattern)
        avg_disc = round(sum(p["discount"] for p in same_pattern) / len(same_pattern), 3)
        method = "同月同曜日パターン"
        sample_n = len(same_pattern)
        ref_data = same_pattern[:5]
    elif same_month:
        recommended = round(sum(same_month) / len(same_month))
        p_min, p_max = min(same_month), max(same_month)
        avg_disc = None
        method = "同月平均"
        sample_n = len(same_month)
        ref_data = []
    elif same_dow:
        prices_dow = [p["price"] for p in same_dow]
        recommended = round(sum(prices_dow) / len(prices_dow))
        p_min, p_max = min(prices_dow), max(prices_dow)
        avg_disc = round(sum(p["discount"] for p in same_dow) / len(same_dow), 3)
        method = f"同曜日({dow_name})パターン"
        sample_n = len(same_dow)
        ref_data = same_dow[:5]
    elif same_daytype:
        recommended = round(sum(same_daytype) / len(same_daytype))
        p_min, p_max = min(same_daytype), max(same_daytype)
        avg_disc = None
        daytype_label = "土日" if is_weekend else "平日"
        method = f"{daytype_label}平均"
        sample_n = len(same_daytype)
        ref_data = []
    else:
        recommended = round(sum(all_prices) / len(all_prices)) if all_prices else base_price
        p_min = min(all_prices) if all_prices else base_price
        p_max = max(all_prices) if all_prices else base_price
        avg_disc = None
        method = "全期間平均"
        sample_n = len(all_prices)
        ref_data = []

    recommended = round(recommended / 100) * 100
    diff = recommended - base_price
    diff_pct = round((recommended / base_price - 1) * 100, 1) if base_price else 0

    return {
        "day_of_week": dow_name,
        "base_price": base_price,
        "recommended_price": recommended,
        "price_diff": diff,
        "price_diff_pct": f"{'+' if diff_pct >= 0 else ''}{diff_pct}%",
        "analysis": {
            "method": method,
            "sample_count": sample_n,
            "pattern_avg": round(sum(p["price"] for p in same_pattern) / len(same_pattern)) if same_pattern else None,
            "pattern_min": p_min,
            "pattern_max": p_max,
            "avg_discount_rate": avg_disc,
            "month_avg": round(sum(same_month) / len(same_month)) if same_month else None,
            "dow_avg": round(sum(p["price"] for p in same_dow) / len(same_dow)) if same_dow else None,
            "overall_avg": round(sum(all_prices) / len(all_prices)) if all_prices else None,
        },
        "reference_data": ref_data,
    }


# =============================================================================
# Tool 4: 日付範囲の推奨価格一括算出
# =============================================================================
@dr_mcp_tool(tags={"golf", "pricing"})
async def predict_price_range(
    gc_code: Annotated[str, "GCコード。例: '204', '347'"],
    start_date: Annotated[str, "開始日（YYYY-MM-DD形式）。例: '2026-04-01'"],
    end_date: Annotated[str, "終了日（YYYY-MM-DD形式）。例: '2026-04-07'"],
) -> ToolResult:
    """指定期間の推奨プレーフィを日別に一括算出。過去の実績データパターンに基づきます。"""
    if not gc_code or not gc_code.strip():
        raise ToolError("GCコードを入力してください。")

    gc = gc_code.strip()
    pricing = _load_pricing()
    if gc not in pricing:
        raise ToolError(f"GCコード '{gc}' のデータがありません。search_golf_courses で確認してください。")

    try:
        dt_start = datetime.strptime(start_date.strip(), "%Y-%m-%d")
        dt_end = datetime.strptime(end_date.strip(), "%Y-%m-%d")
    except ValueError:
        raise ToolError("日付はYYYY-MM-DD形式で入力してください。")

    if dt_end < dt_start:
        raise ToolError("終了日は開始日以降にしてください。")
    if (dt_end - dt_start).days > 31:
        raise ToolError("最大31日間まで指定できます。")

    course = _find_course(gc)
    gc_data = pricing[gc]
    daily_prices = []
    current = dt_start
    while current <= dt_end:
        result = _predict_from_data(gc, current, gc_data, course)
        daily_prices.append({
            "date": current.strftime("%Y-%m-%d"),
            "dow": result["day_of_week"],
            "base_price": result["base_price"],
            "recommended": result["recommended_price"],
            "diff_pct": result["price_diff_pct"],
            "method": result["analysis"]["method"],
            "samples": result["analysis"]["sample_count"],
        })
        current += timedelta(days=1)

    prices = [d["recommended"] for d in daily_prices]
    return ToolResult(structured_content={
        "summary": {
            "gc_code": gc,
            "course_name": course["name"] if course else f"GC{gc}",
            "period": f"{start_date.strip()} 〜 {end_date.strip()}",
            "days": len(daily_prices),
            "base_price": course["base_price"] if course else None,
            "avg_recommended": round(sum(prices) / len(prices) / 100) * 100,
            "min_recommended": min(prices),
            "max_recommended": max(prices),
        },
        "daily_prices": daily_prices,
    })


# =============================================================================
# Tool 5: 天気予報（デモ用モック）
# =============================================================================
@dr_mcp_tool(tags={"golf", "weather"})
async def get_weather_forecast(
    location: Annotated[str, "地域名。例: '茨城県', '千葉県'"],
    target_date: Annotated[str, "日付（YYYY-MM-DD形式）。例: '2026-04-12'"],
) -> ToolResult:
    """指定した地域・日付の天気予報を取得します（デモモード）。"""
    if not location or not location.strip():
        raise ToolError("地域名を入力してください。")
    if not target_date or not target_date.strip():
        raise ToolError("日付をYYYY-MM-DD形式で入力してください。")

    try:
        dt = datetime.strptime(target_date.strip(), "%Y-%m-%d")
    except ValueError:
        raise ToolError("日付はYYYY-MM-DD形式で入力してください。")

    forecasts = _mock_weather(location.strip(), dt)
    return ToolResult(structured_content={
        "location": location.strip(),
        "target_date": target_date.strip(),
        "forecasts": forecasts,
    })


def _mock_weather(location, target_date):
    month = target_date.month
    if month in (3, 4, 5):
        tr, ww = (12, 22), ["晴れ", "晴れ", "曇り", "曇り", "雨"]
    elif month in (6, 7, 8):
        tr, ww = (24, 35), ["晴れ", "晴れ", "曇り", "雨", "雨"]
    elif month in (9, 10, 11):
        tr, ww = (13, 24), ["晴れ", "晴れ", "晴れ", "曇り", "雨"]
    else:
        tr, ww = (1, 12), ["晴れ", "晴れ", "曇り", "曇り", "雪"]

    out = []
    for off in range(-1, 6):
        d = target_date + timedelta(days=off)
        s = int(hashlib.md5(f"{location}{d.isoformat()}".encode(), usedforsecurity=False).hexdigest()[:8], 16)
        out.append({
            "date": d.strftime("%Y-%m-%d"),
            "dow": ["月", "火", "水", "木", "金", "土", "日"][d.weekday()],
            "weather": ww[s % len(ww)],
            "temp_high": tr[0] + (s % (tr[1] - tr[0])),
            "temp_low": max(tr[0] - 3, tr[0] + (s % (tr[1] - tr[0])) - 5 - (s % 5)),
            "is_target": off == 0,
        })
    return out
