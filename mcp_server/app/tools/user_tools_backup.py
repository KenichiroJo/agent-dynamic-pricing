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

# --- ゴルフ場マスタデータのロード ---
_GOLF_COURSES: list[dict] = []
_COURSES_FILE = os.path.join(os.path.dirname(__file__), "golf_courses.json")


def _load_courses() -> list[dict]:
    global _GOLF_COURSES
    if not _GOLF_COURSES:
        with open(_COURSES_FILE, encoding="utf-8") as f:
            _GOLF_COURSES = json.load(f)
    return _GOLF_COURSES


def _is_mock_mode() -> bool:
    return os.environ.get("USE_MOCK", "true").lower() in ("true", "1", "yes")


# =============================================================================
# Tool 1: ゴルフ場マスタ検索
# =============================================================================
@dr_mcp_tool(tags={"golf", "master"})
async def search_golf_courses(
    query: Annotated[str, "ゴルフ場名、エリア名、または都道府県名で検索します。例: '茨城', '美浦', '関東'"],
) -> ToolResult:
    """PGMが運営するゴルフ場を検索します。名称の部分一致、エリア名、都道府県名で検索できます。"""
    if not query or not query.strip():
        raise ToolError("検索キーワードを入力してください。")

    query = query.strip()
    courses = _load_courses()
    results = [
        c for c in courses
        if query in c["name"]
        or query in c["area"]
        or query in c["prefecture"]
    ]

    if not results:
        return ToolResult(structured_content={
            "found": 0,
            "message": f"'{query}' に一致するゴルフ場が見つかりませんでした。",
            "courses": [],
        })

    course_list = [
        {
            "cc_id": c["cc_id"],
            "name": c["name"],
            "prefecture": c["prefecture"],
            "area": c["area"],
            "base_price": c["base_price"],
            "brand": c.get("brand", ""),
            "segment": c.get("segment", ""),
        }
        for c in results[:20]
    ]

    return ToolResult(structured_content={
        "found": len(results),
        "showing": len(course_list),
        "courses": course_list,
    })


# =============================================================================
# Tool 2: 天気情報取得（モック対応）
# =============================================================================
@dr_mcp_tool(tags={"golf", "weather"})
async def get_weather_forecast(
    location: Annotated[str, "天気を取得したい地域名または都道府県名。例: '茨城県', '宮城県仙台市'"],
    target_date: Annotated[str, "天気予報を取得したい日付（YYYY-MM-DD形式）。例: '2026-04-12'"],
) -> ToolResult:
    """指定した地域・日付の天気予報を取得します。直近の天気情報も含めて返します。"""
    if not location or not location.strip():
        raise ToolError("地域名を入力してください。")
    if not target_date or not target_date.strip():
        raise ToolError("日付をYYYY-MM-DD形式で入力してください。")

    try:
        dt = datetime.strptime(target_date.strip(), "%Y-%m-%d")
    except ValueError:
        raise ToolError("日付はYYYY-MM-DD形式で入力してください。例: 2026-04-12")

    if _is_mock_mode():
        forecasts = _generate_mock_weather(location.strip(), dt)
        return ToolResult(structured_content={
            "mode": "demo",
            "location": location.strip(),
            "target_date": target_date.strip(),
            "forecasts": forecasts,
        })

    # 本番モード: OpenWeatherMap API（将来実装）
    return ToolResult(structured_content={
        "mode": "production",
        "error": "本番モードの天気API連携は未設定です。USE_MOCK=true に設定するか、OPENWEATHERMAP_API_KEY を設定してください。",
    })


def _generate_mock_weather(location: str, target_date: datetime) -> list[dict]:
    """季節・日付に基づくリアルなモック天気データを生成"""
    month = target_date.month
    # 季節別の気温レンジと天気パターン
    if month in (3, 4, 5):
        temp_range = (12, 22)
        weather_weights = ["晴れ", "晴れ", "曇り", "曇り", "雨"]
    elif month in (6, 7, 8):
        temp_range = (24, 35)
        weather_weights = ["晴れ", "晴れ", "曇り", "雨", "雨"]
    elif month in (9, 10, 11):
        temp_range = (13, 24)
        weather_weights = ["晴れ", "晴れ", "晴れ", "曇り", "雨"]
    else:
        temp_range = (1, 12)
        weather_weights = ["晴れ", "晴れ", "曇り", "曇り", "雪"]

    forecasts = []
    for offset in range(-3, 8):
        d = target_date + timedelta(days=offset)
        seed = hashlib.md5(f"{location}{d.isoformat()}".encode(), usedforsecurity=False).hexdigest()
        seed_int = int(seed[:8], 16)

        weather = weather_weights[seed_int % len(weather_weights)]
        temp_high = temp_range[0] + (seed_int % (temp_range[1] - temp_range[0]))
        temp_low = max(temp_range[0] - 3, temp_high - 5 - (seed_int % 5))

        precip = {"晴れ": 5 + (seed_int % 10), "曇り": 20 + (seed_int % 30), "雨": 60 + (seed_int % 35), "雪": 50 + (seed_int % 40)}
        precipitation = precip.get(weather, 10)

        forecasts.append({
            "date": d.strftime("%Y-%m-%d"),
            "day_of_week": ["月", "火", "水", "木", "金", "土", "日"][d.weekday()],
            "weather": weather,
            "temperature_high": temp_high,
            "temperature_low": temp_low,
            "precipitation_probability": min(precipitation, 95),
            "is_target_date": offset == 0,
        })

    return forecasts


# =============================================================================
# Tool 3: DataRobot 推奨価格予測（モック対応）
# =============================================================================
@dr_mcp_tool(tags={"golf", "pricing"})
async def predict_dynamic_price(
    course_name: Annotated[str, "ゴルフ場名。例: '美浦ゴルフ倶楽部'"],
    play_date: Annotated[str, "プレー日（YYYY-MM-DD形式）。例: '2026-04-12'"],
    weather: Annotated[str, "天気。'晴れ', '曇り', '雨', '雪' のいずれか。"] = "晴れ",
    temperature: Annotated[int, "予想最高気温（℃）。"] = 20,
) -> ToolResult:
    """DataRobotの予測モデルを使ってゴルフ場の推奨プレーフィ（ダイナミックプライシング）を算出します。"""
    if not course_name or not course_name.strip():
        raise ToolError("ゴルフ場名を入力してください。")
    if not play_date or not play_date.strip():
        raise ToolError("プレー日をYYYY-MM-DD形式で入力してください。")

    try:
        dt = datetime.strptime(play_date.strip(), "%Y-%m-%d")
    except ValueError:
        raise ToolError("プレー日はYYYY-MM-DD形式で入力してください。")

    # ゴルフ場特定
    courses = _load_courses()
    course = next((c for c in courses if course_name.strip() in c["name"]), None)
    if not course:
        raise ToolError(f"ゴルフ場 '{course_name}' が見つかりません。search_golf_courses で正確な名称を確認してください。")

    today = datetime.now()
    lead_days = (dt - today).days

    if _is_mock_mode():
        result = _generate_mock_price(course, dt, weather.strip(), temperature, lead_days)
        return ToolResult(structured_content={
            "mode": "demo",
            "course": course["name"],
            "play_date": play_date.strip(),
            **result,
        })

    # 本番モード: DataRobot Prediction API（将来実装）
    return ToolResult(structured_content={
        "mode": "production",
        "error": "本番モードのDataRobot予測API連携は未設定です。DR_PRICING_DEPLOYMENT_ID を設定してください。",
    })


def _generate_mock_price(course: dict, play_date: datetime, weather: str, temperature: int, lead_days: int) -> dict:
    """ルールベースのモック価格生成"""
    base_price = course["base_price"]
    adjustments = {}

    # 曜日補正
    dow = play_date.weekday()
    if dow == 5:  # 土曜
        dow_factor = 1.40
        adjustments["曜日補正（土曜）"] = "+40%"
    elif dow == 6:  # 日曜
        dow_factor = 1.35
        adjustments["曜日補正（日曜）"] = "+35%"
    elif dow == 4:  # 金曜
        dow_factor = 1.10
        adjustments["曜日補正（金曜）"] = "+10%"
    else:
        dow_factor = 1.0
        adjustments["曜日補正（平日）"] = "±0%"

    # 天候補正
    if weather == "雨":
        weather_factor = 0.78
        adjustments["天候補正（雨）"] = "-22%"
    elif weather == "雪":
        weather_factor = 0.70
        adjustments["天候補正（雪）"] = "-30%"
    elif weather == "曇り":
        weather_factor = 0.93
        adjustments["天候補正（曇り）"] = "-7%"
    else:
        weather_factor = 1.0
        adjustments["天候補正（晴れ）"] = "±0%"

    # 季節補正
    month = play_date.month
    if month in (4, 5, 10, 11):
        season_factor = 1.15
        adjustments["季節補正（ハイシーズン）"] = "+15%"
    elif month in (1, 2, 7, 8):
        season_factor = 0.85
        adjustments["季節補正（オフシーズン）"] = "-15%"
    elif month == 12:
        season_factor = 0.90
        adjustments["季節補正（冬季）"] = "-10%"
    else:
        season_factor = 1.0
        adjustments["季節補正（通常期）"] = "±0%"

    # リードタイム補正
    if lead_days <= 0:
        lead_factor = 0.80
        adjustments["リードタイム補正（当日）"] = "-20%"
    elif lead_days <= 3:
        lead_factor = 0.90
        adjustments["リードタイム補正（直前）"] = "-10%"
    elif lead_days <= 7:
        lead_factor = 1.0
        adjustments["リードタイム補正（1週間前）"] = "±0%"
    elif lead_days <= 14:
        lead_factor = 1.03
        adjustments["リードタイム補正（2週間前）"] = "+3%"
    else:
        lead_factor = 1.05
        adjustments["リードタイム補正（早期予約）"] = "+5%"

    # 気温補正（極端な気温はマイナス要因）
    if temperature >= 35:
        temp_factor = 0.90
        adjustments["気温補正（猛暑）"] = "-10%"
    elif temperature <= 5:
        temp_factor = 0.92
        adjustments["気温補正（厳寒）"] = "-8%"
    else:
        temp_factor = 1.0

    recommended_price = int(base_price * dow_factor * weather_factor * season_factor * lead_factor * temp_factor)
    # 100円単位に丸める
    recommended_price = round(recommended_price / 100) * 100

    diff = recommended_price - base_price
    diff_pct = round((recommended_price / base_price - 1) * 100, 1)

    return {
        "base_price": base_price,
        "recommended_price": recommended_price,
        "price_diff": diff,
        "price_diff_pct": f"{'+' if diff_pct >= 0 else ''}{diff_pct}%",
        "lead_days": max(lead_days, 0),
        "weather": weather,
        "temperature": temperature,
        "day_of_week": ["月", "火", "水", "木", "金", "土", "日"][play_date.weekday()],
        "adjustments": adjustments,
    }


# =============================================================================
# Tool 4: 競合価格情報（モック）
# =============================================================================
@dr_mcp_tool(tags={"golf", "competitor"})
async def get_competitor_prices(
    course_name: Annotated[str, "基準となるPGMゴルフ場名。例: '美浦ゴルフ倶楽部'"],
    play_date: Annotated[str, "プレー日（YYYY-MM-DD形式）。例: '2026-04-12'"],
) -> ToolResult:
    """指定したゴルフ場の近隣エリアにおける競合ゴルフ場の価格情報を取得します。"""
    if not course_name or not course_name.strip():
        raise ToolError("ゴルフ場名を入力してください。")
    if not play_date or not play_date.strip():
        raise ToolError("プレー日をYYYY-MM-DD形式で入力してください。")

    try:
        dt = datetime.strptime(play_date.strip(), "%Y-%m-%d")
    except ValueError:
        raise ToolError("プレー日はYYYY-MM-DD形式で入力してください。")

    courses = _load_courses()
    course = next((c for c in courses if course_name.strip() in c["name"]), None)
    if not course:
        raise ToolError(f"ゴルフ場 '{course_name}' が見つかりません。")

    competitors = _generate_mock_competitors(course, dt)
    return ToolResult(structured_content={
        "mode": "demo",
        "reference_course": course["name"],
        "reference_area": course["area"],
        "play_date": play_date.strip(),
        "competitors": competitors,
    })


def _generate_mock_competitors(course: dict, play_date: datetime) -> list[dict]:
    """同エリアの架空競合ゴルフ場の価格を生成"""
    competitor_names = {
        "北海道": ["北海道クラシックGC", "道央カントリー", "千歳ヒルズCC", "札幌ロイヤルGC"],
        "東北": ["東北グリーンCC", "仙台パインズGC", "みちのくCC", "蔵王カントリー"],
        "関東・甲信越": ["関東グリーンGC", "東京クラシックCC", "つくばリンクスGC", "房総ヒルズCC", "武蔵野フォレストGC"],
        "東海・北陸": ["東海ヒルズCC", "駿河グリーンGC", "浜名湖CC", "三河カントリー"],
        "関西": ["関西クラシックGC", "京阪カントリー", "六甲ヒルズCC", "紀伊グリーンGC"],
        "中国": ["山陽カントリー", "瀬戸内シーサイドGC", "中国ヒルズCC", "備前クラシックGC"],
        "四国": ["四国カントリー", "瀬戸内CC", "讃岐ヒルズGC", "伊予グリーンCC"],
        "九州・沖縄": ["九州クラシックGC", "福岡ヒルズCC", "南国リゾートGC", "有明カントリー"],
    }

    names = competitor_names.get(course["area"], ["近隣ゴルフ場A", "近隣ゴルフ場B", "近隣ゴルフ場C"])
    base = course["base_price"]
    dow = play_date.weekday()
    dow_factor = 1.35 if dow >= 5 else (1.10 if dow == 4 else 1.0)

    competitors = []
    for i, name in enumerate(names[:4]):
        seed = hashlib.md5(f"{name}{play_date.isoformat()}{i}".encode(), usedforsecurity=False).hexdigest()
        seed_int = int(seed[:8], 16)
        variation = 0.75 + (seed_int % 50) / 100  # 0.75 ~ 1.24
        price = int(base * dow_factor * variation)
        price = round(price / 100) * 100

        competitors.append({
            "name": name,
            "price": price,
            "distance": f"約{5 + (seed_int % 30)}km",
            "price_vs_pgm": f"{'+'if price > base else ''}{round((price / base - 1) * 100)}%",
        })

    competitors.sort(key=lambda x: x["price"])
    return competitors


# =============================================================================
# Tool 5: 日付範囲の推奨価格一括算出（モック対応）
# =============================================================================
@dr_mcp_tool(tags={"golf", "pricing"})
async def predict_price_range(
    course_name: Annotated[str, "ゴルフ場名。例: '美浦ゴルフ倶楽部'"],
    start_date: Annotated[str, "開始日（YYYY-MM-DD形式）。例: '2026-04-01'"],
    end_date: Annotated[str, "終了日（YYYY-MM-DD形式）。例: '2026-04-07'"],
) -> ToolResult:
    """指定期間の推奨プレーフィを日別に一括算出します。期間指定の価格査定に使用してください。"""
    if not course_name or not course_name.strip():
        raise ToolError("ゴルフ場名を入力してください。")

    try:
        dt_start = datetime.strptime(start_date.strip(), "%Y-%m-%d")
        dt_end = datetime.strptime(end_date.strip(), "%Y-%m-%d")
    except ValueError:
        raise ToolError("日付はYYYY-MM-DD形式で入力してください。")

    if dt_end < dt_start:
        raise ToolError("終了日は開始日以降にしてください。")
    if (dt_end - dt_start).days > 31:
        raise ToolError("最大31日間まで指定できます。")

    courses = _load_courses()
    course = next((c for c in courses if course_name.strip() in c["name"]), None)
    if not course:
        raise ToolError(f"ゴルフ場 '{course_name}' が見つかりません。search_golf_courses で正確な名称を確認してください。")

    today = datetime.now()
    location = course["prefecture"]

    # 日付ごとにモック天気 + 価格を算出
    daily_prices = []
    current = dt_start
    while current <= dt_end:
        lead_days = (current - today).days
        # モック天気を取得
        seed = hashlib.md5(f"{location}{current.isoformat()}".encode(), usedforsecurity=False).hexdigest()
        seed_int = int(seed[:8], 16)
        month = current.month
        if month in (3, 4, 5):
            temp_range = (12, 22)
            weather_weights = ["晴れ", "晴れ", "曇り", "曇り", "雨"]
        elif month in (6, 7, 8):
            temp_range = (24, 35)
            weather_weights = ["晴れ", "晴れ", "曇り", "雨", "雨"]
        elif month in (9, 10, 11):
            temp_range = (13, 24)
            weather_weights = ["晴れ", "晴れ", "晴れ", "曇り", "雨"]
        else:
            temp_range = (1, 12)
            weather_weights = ["晴れ", "晴れ", "曇り", "曇り", "雪"]

        weather = weather_weights[seed_int % len(weather_weights)]
        temp_high = temp_range[0] + (seed_int % (temp_range[1] - temp_range[0]))

        price_data = _generate_mock_price(course, current, weather, temp_high, lead_days)
        daily_prices.append({
            "date": current.strftime("%Y-%m-%d"),
            "day_of_week": ["月", "火", "水", "木", "金", "土", "日"][current.weekday()],
            "weather": weather,
            "temp_high": temp_high,
            "base_price": price_data["base_price"],
            "recommended_price": price_data["recommended_price"],
            "diff_pct": price_data["price_diff_pct"],
        })
        current += timedelta(days=1)

    prices = [d["recommended_price"] for d in daily_prices]
    summary = {
        "course": course["name"],
        "area": course["area"],
        "period": f"{start_date.strip()} 〜 {end_date.strip()}",
        "days": len(daily_prices),
        "base_price": course["base_price"],
        "avg_price": round(sum(prices) / len(prices) / 100) * 100,
        "min_price": min(prices),
        "max_price": max(prices),
        "min_date": daily_prices[prices.index(min(prices))]["date"],
        "max_date": daily_prices[prices.index(max(prices))]["date"],
    }

    return ToolResult(structured_content={
        "mode": "demo",
        "summary": summary,
        "daily_prices": daily_prices,
    })
