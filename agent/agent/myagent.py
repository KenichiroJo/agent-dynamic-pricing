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
from datetime import datetime
from typing import Any, Optional, Union

from datarobot_genai.core.agents import (
    make_system_prompt,
)
from datarobot_genai.langgraph.agent import LangGraphAgent
from langchain.agents import create_agent
from langchain_core.language_models import BaseChatModel
from langchain_core.prompts import ChatPromptTemplate
from langchain_core.tools import BaseTool
from langchain_litellm.chat_models import ChatLiteLLM
from langgraph.graph import END, START, MessagesState, StateGraph

from agent.config import Config


class MyAgent(LangGraphAgent):
    """MyAgent is a dynamic pricing agent for PGM golf courses.
    It utilizes DataRobot's LLM Gateway and prediction models to recommend
    optimal green fees based on weather, demand, and competitor pricing.
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        api_base: Optional[str] = None,
        model: Optional[str] = None,
        verbose: Optional[Union[bool, str]] = True,
        timeout: Optional[int] = 90,
        *,
        llm: Optional[BaseChatModel] = None,
        workflow_tools: Optional[list[BaseTool]] = None,
        **kwargs: Any,
    ):
        """Initializes the MyAgent class with API key, base URL, model, and verbosity settings.

        Args:
            api_key: Optional[str]: API key for authentication with DataRobot services.
                Defaults to None, in which case it will use the DATAROBOT_API_TOKEN environment variable.
            api_base: Optional[str]: Base URL for the DataRobot API.
                Defaults to None, in which case it will use the DATAROBOT_ENDPOINT environment variable.
            model: Optional[str]: The LLM model to use.
                Defaults to None.
            verbose: Optional[Union[bool, str]]: Whether to enable verbose logging.
                Accepts boolean or string values ("true"/"false"). Defaults to True.
            timeout: Optional[int]: How long to wait for the agent to respond.
                Defaults to 90 seconds.
            llm: Optional[BaseChatModel]: Pre-configured LLM instance provided by NAT.
                When set, llm() returns this directly instead of creating a ChatLiteLLM.
            workflow_tools: Optional[list[BaseTool]]: Additional tools from the workflow config (e.g. A2A client tools). Keyword-only.
            **kwargs: Any: Additional keyword arguments passed to the agent.
                Contains any parameters received in the CompletionCreateParams.

        Returns:
            None
        """
        super().__init__(
            api_key=api_key,
            api_base=api_base,
            model=model,
            verbose=verbose,
            timeout=timeout,
            **kwargs,
        )
        self._nat_llm = llm
        self._workflow_tools = workflow_tools or []
        self.config = Config()
        self.default_model = self.config.llm_default_model
        if model in ("unknown", "datarobot-deployed-llm"):
            self.model = self.default_model

    @property
    def workflow(self) -> StateGraph[MessagesState]:
        langgraph_workflow = StateGraph[
            MessagesState, None, MessagesState, MessagesState
        ](MessagesState)
        langgraph_workflow.add_node("planner_node", self.agent_planner)
        langgraph_workflow.add_node("writer_node", self.agent_writer)
        langgraph_workflow.add_edge(START, "planner_node")
        langgraph_workflow.add_edge("planner_node", "writer_node")
        langgraph_workflow.add_edge("writer_node", END)
        return langgraph_workflow  # type: ignore[return-value]

    @property
    def prompt_template(self) -> ChatPromptTemplate:
        return ChatPromptTemplate.from_messages(
            [
                (
                    "system",
                    "あなたはPGMゴルフ場のダイナミックプライシング専門AIです。"
                    "プライシング担当者がGCコード（例: 204, 347）とプレー日（または日付範囲）を入力すると、"
                    "過去の実績データに基づいた推奨価格を簡潔に提示します。"
                    "担当者は多数のコースを担当しているため、簡潔・表形式での回答が重要です。"
                    "チャット履歴は {chat_history} で参照できます。",
                ),
                (
                    "user",
                    "{topic}",
                ),
            ]
        )

    def llm(
        self,
        auto_model_override: bool = True,
    ) -> BaseChatModel:
        """Returns the LLM to use for agent nodes.

        In NAT mode, returns the pre-configured LLM provided at construction.
        In DRUM mode, creates a ChatLiteLLM using the configured API credentials.

        Args:
            auto_model_override: Optional[bool]: If True, it will try and use the model
                specified in the request but automatically back out if the LLM Gateway is
                not available.

        Returns:
            BaseChatModel: The model to use.
        """
        if self._nat_llm is not None:
            return self._nat_llm

        api_base = self.litellm_api_base(self.config.llm_deployment_id)
        model = self.model or self.default_model
        if auto_model_override and not self.config.use_datarobot_llm_gateway:
            model = self.default_model
        if self.verbose:
            print(f"Using model: {model}")

        config = {
            "model": model,
            "api_base": api_base,
            "api_key": self.api_key,
            "timeout": self.timeout,
            "streaming": True,
            "max_retries": 3,
        }

        if not self.config.use_datarobot_llm_gateway and self._identity_header:
            config["model_kwargs"] = {"extra_headers": self._identity_header}  # type: ignore[assignment]

        return ChatLiteLLM(**config)

    @property
    def agent_planner(self) -> Any:
        return create_agent(
            self.llm(),
            tools=self.mcp_tools + self._workflow_tools,
            system_prompt=make_system_prompt(
                "あなたはPGMゴルフ場のダイナミックプライシング調査担当です。\n"
                "プライシング担当者が入力したGCコードとプレー日（または日付範囲）に基づき、価格算出に必要な情報を収集します。\n"
                "\n"
                "利用可能なツール:\n"
                "- search_golf_courses: GCコードまたは'all'でPGMゴルフ場を検索（31コース）\n"
                "- get_historical_prices: GCコード+期間で過去の実績価格データを取得（最大90日）\n"
                "- get_weather_forecast: プレー日の天気予報を取得\n"
                "\n"
                "実行手順:\n"
                "1. GCコード（例: 204, 347）とプレー日を特定する\n"
                "2. search_golf_courses でコース情報（基準価格・平均価格等）を確認\n"
                "3. get_weather_forecast で天気予報を取得\n"
                "4. 必要に応じて get_historical_prices で過去実績を確認\n"
                "5. 収集した情報を構造化して価格算出ステップに渡す\n"
                "\n"
                "重要:\n"
                "- GCコードは数字3桁（例: 204, 308, 347）。不明な場合は search_golf_courses(query='all')で一覧取得\n"
                "- 実績データ期間: 2024-05-01〜2025-11-30\n"
                "- 必ず日本語で応答\n"
                "\n"
                "出力形式:\n"
                "- コース一覧や数値データは必ずMarkdownテーブルで出力すること\n"
                "- 例: コース一覧\n"
                "| GCコード | コース名 | 基準価格 | 平均価格 | 最安/最高 | 収容 |\n"
                "|---|---|---|---|---|---|\n"
                "| 204 | GC204 | ¥11,000 | ¥9,900 | ¥4,000/¥18,200 | 108 |\n"
                "- 価格は必ず¥とカンマ区切り\n"
                "- 不要な前置き・挨拶は省略",
            ),
            name="planner_agent",
        )

    @property
    def agent_writer(self) -> Any:
        return create_agent(
            self.llm(),
            tools=self.mcp_tools + self._workflow_tools,
            system_prompt=make_system_prompt(
                "あなたはPGMゴルフ場のダイナミックプライシング価格算出担当です。\n"
                "調査担当が収集した情報を基に、実績データに基づく推奨価格を算出して簡潔に提示します。\n"
                "担当者は1人で多数のコースを担当しているため、簡潔さが最優先です。\n"
                "\n"
                "利用可能なツール:\n"
                "- predict_dynamic_price: GCコード+日付で推奨価格を算出（同月同曜日パターン分析）\n"
                "- predict_price_range: GCコード+日付範囲で推奨価格を一括算出（最大31日）\n"
                "\n"
                "回答ルール:\n"
                "\n"
                "[単日の場合]\n"
                "**GCコード（コース名）** | プレー日 | 曜日\n"
                "\n"
                "| 項目 | 値 |\n"
                "|---|---|\n"
                "| 基準価格 | ¥XX,XXX |\n"
                "| **推奨価格** | **¥XX,XXX** |\n"
                "| 差分 | +XX% |\n"
                "| 分析手法 | 同月同曜日パターン（N件） |\n"
                "\n"
                "天気: ☀️晴れ XX°C\n"
                "参考: 過去同条件 最安¥X,XXX / 最高¥X,XXX\n"
                "\n"
                "[日付範囲の場合]\n"
                "**GCコード（コース名）** | 期間: YYYY/MM/DD 〜 YYYY/MM/DD\n"
                "\n"
                "| 日付 | 曜 | 天気 | 基準価格 | 推奨価格 | 差分 | 分析 |\n"
                "|---|---|---|---|---|---|---|\n"
                "| 4/1 | 火 | ☀️ | ¥X,XXX | ¥X,XXX | +X% | 同月同曜日 |\n"
                "| ... | ... | ... | ... | ... | ... | ... |\n"
                "\n"
                "サマリ: 平均¥XX,XXX / 最高¥XX,XXX(X/X) / 最安¥XX,XXX(X/X)\n"
                "\n"
                "厳密なルール:\n"
                "- 必ず上記の表形式（Markdownテーブル）で出力すること\n"
                "- 不要な前置き・挨拶・その他の装飾的な文章は一切不要\n"
                "- 天気は絵文字で表現: ☀️晴れ ☁️曇り 🌧️雨 ❄️雪\n"
                "- 価格は必ず¥とカンマ区切り\n"
                "- 推奨価格の根拠（分析手法とサンプル数）を必ず添える\n"
                "- 日本語で応答",
            ),
            name="writer_agent",
        )
