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

from typing import Any, Optional

from datarobot_genai.drmcp import (
    RUNTIME_PARAM_ENV_VAR_NAME_PREFIX,
    extract_datarobot_runtime_param_payload,
)
from pydantic import AliasChoices, Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class UserAppConfig(BaseSettings):
    """User-specific application configuration."""

    user_name: str = Field(
        default="default-user",
        validation_alias=AliasChoices(
            RUNTIME_PARAM_ENV_VAR_NAME_PREFIX + "USER_NAME",
            "USER_NAME",
        ),
        description="Name of the user being used",
    )

    use_mock: str = Field(
        default="true",
        validation_alias=AliasChoices(
            RUNTIME_PARAM_ENV_VAR_NAME_PREFIX + "USE_MOCK",
            "USE_MOCK",
        ),
        description="デモモード（true）/ 本番モード（false）",
    )

    dr_pricing_deployment_id: str = Field(
        default="",
        validation_alias=AliasChoices(
            RUNTIME_PARAM_ENV_VAR_NAME_PREFIX + "DR_PRICING_DEPLOYMENT_ID",
            "DR_PRICING_DEPLOYMENT_ID",
        ),
        description="DataRobot価格予測モデルのデプロイメントID",
    )

    openweathermap_api_key: str = Field(
        default="",
        validation_alias=AliasChoices(
            RUNTIME_PARAM_ENV_VAR_NAME_PREFIX + "OPENWEATHERMAP_API_KEY",
            "OPENWEATHERMAP_API_KEY",
        ),
        description="OpenWeatherMap APIキー",
    )

    @field_validator(
        "user_name",
        "use_mock",
        "dr_pricing_deployment_id",
        "openweathermap_api_key",
        mode="before",
    )
    @classmethod
    def validate_user_runtime_params(cls, v: Any) -> Any:
        """Validate user runtime parameters."""
        result = extract_datarobot_runtime_param_payload(v)
        if isinstance(result, bool):
            return str(result).lower()
        return result

    model_config = SettingsConfigDict(
        env_file=".env",
        case_sensitive=False,
        env_file_encoding="utf-8",
        extra="ignore",
    )


# Global configuration instance
_user_config: Optional[UserAppConfig] = None


def get_user_config() -> UserAppConfig:
    """Get the global user configuration instance."""
    global _user_config
    if _user_config is None:
        _user_config = UserAppConfig()
    return _user_config
