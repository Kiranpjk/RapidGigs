"""Core HTTP client handling authentication and API calls."""

from __future__ import annotations

import asyncio
import re
import urllib.parse
from dataclasses import dataclass
from typing import Any, Dict

import httpx

from .exceptions import CookieExpiredError, GenerationError
from .utils import extract_lsd_token, get_cookie_header


@dataclass
class AuthConfig:
    """Container for Meta AI authentication tokens."""

    datr: str = ""
    abra_sess: str = ""
    ecto_1_sess: str = ""
    rd_challenge: str = ""
    ps_n: str = "1"
    ps_l: str = "1"
    wd: str = "1152x333"
    dpr: str = "1.25"

    @property
    def cookie_header(self) -> str:
        """Build the cookie header from auth tokens."""
        return get_cookie_header(
            datr=self.datr,
            abra_sess=self.abra_sess,
            ecto_1_sess=self.ecto_1_sess,
            rd_challenge=self.rd_challenge,
            ps_n=self.ps_n,
            ps_l=self.ps_l,
            wd=self.wd,
            dpr=self.dpr,
        )


class MetaAI:
    """
    Async client for Meta AI image and video generation.
    Handles cookie auth, GraphQL request construction, and response parsing.
    """

    BASE_URL = "https://www.meta.ai/api/graphql/"
    SESSION_HEADERS = {
        "x-fb-friendly-name": "Fresh",
        "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
        "Referer": "https://www.meta.ai/",
        "User-Agent": (
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
            "AppleWebKit/537.36 (KHTML, like Gecko) "
            "Chrome/144.0.0.0 Safari/537.36"
        ),
    }

    def __init__(self, auth_config: AuthConfig | None = None, max_retries: int = 3):
        """
        Args:
            auth_config: Authentication tokens. If not provided, will try to load from
                environment variables.
            max_retries: Number of retries for network errors.
        """
        if auth_config is None:
            import os

            auth_config = AuthConfig(
                datr=os.getenv("META_AI_DATR", ""),
                abra_sess=os.getenv("META_AI_ABRA_SESS", ""),
                ecto_1_sess=os.getenv("META_AI_ECTO_1_SESS", ""),
                rd_challenge=os.getenv("META_AI_RD_CHALLENGE", ""),
                ps_n=os.getenv("META_AI_PS_N", "1"),
                ps_l=os.getenv("META_AI_PS_L", "1"),
                wd=os.getenv("META_AI_WD", "1152x333"),
                dpr=os.getenv("META_AI_DPR", "1.25"),
            )

        if not all([auth_config.datr, auth_config.abra_sess, auth_config.ecto_1_sess]):
            raise ValueError(
                "Missing required authentication tokens. Set META_AI_DATR, "
                "META_AI_ABRA_SESS, and META_AI_ECTO_1_SESS in your environment."
            )

        self.auth_config = auth_config
        self.max_retries = max_retries
        self.session = httpx.AsyncClient(
            headers={**self.SESSION_HEADERS, "cookie": auth_config.cookie_header},
            timeout=30.0,
        )
        # Store lsd token; will be refreshed on each request if needed
        self._lsd_token: str | None = None

    async def _fetch_lsd_token(self) -> str:
        """
        Fetch the hidden `lsd` token from the main Meta AI page.
        This token is required for all POST requests.
        """
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(
                "https://www.meta.ai/",
                cookies=self.session.cookies,
                headers=self.SESSION_HEADERS,
            )
        resp.raise_for_status()
        lsd_match = re.search(r'"LSD",\[\],\{"token":"([^"]+)"\}', resp.text)
        if not lsd_match:
            raise GenerationError("Failed to extract LSD token from Meta AI page.")
        return lsd_match.group(1)

    def _prepare_form_data(
        self,
        doc_id: str,
        variables: Dict[str, Any],
        operation_name: str,
        fb_api_caller_class: str = "RelayModern",
        fb_api_req_friendly_name: str = "AbraSearchPluginDialogQuery",
    ) -> Dict[str, Any]:
        """
        Build the form-encoded body for GraphQL POST requests.
        Returns a dictionary representing the request payload.
        """
        return {
            "fb_api_graph_version": "2.0",
            "doc_id": doc_id,
            "variables": variables,
            "operationName": operation_name,
            "fb_api_caller_class": fb_api_caller_class,
            "fb_api_req_friendly_name": fb_api_req_friendly_name,
        }

    async def _execute_graphql_request(
        self,
        doc_id: str,
        variables: Dict[str, Any],
        operation_name: str,
        operation_type: str = "image",
    ) -> Dict[str, Any]:
        """
        Core method that executes a GraphQL request and returns parsed JSON.
        Handles retries and cookie expiration detection.
        """
        # Prepare form data payload
        form_data = self._prepare_form_data(
            doc_id=doc_id,
            variables=variables,
            operation_name=operation_name,
        )

        # Encode payload as URL-encoded string
        encoded_body = "&".join(
            f"{urllib.parse.quote_plus(k)}={urllib.parse.quote_plus(str(v))}"
            for k, v in form_data.items()
        )

        # Fetch fresh LSD token for this request
        lsd_token = await self._fetch_lsd_token()

        # Append LSD token to body
        encoded_body += f"&lsd={urllib.parse.quote_plus(lsd_token)}"

        url = self.BASE_URL
        headers = {
            "content-type": "application/x-www-form-urlencoded; charset=UTF-8",
            "Referer": "https://www.meta.ai/",
            **self.SESSION_HEADERS,
        }

        for attempt in range(1, self.max_retries + 1):
            try:
                resp = await self.session.post(url, data=encoded_body, headers=headers)
                resp.raise_for_status()
                json_resp = resp.json()

                # Detect authentication/cookie expiration errors
                if "errors" in json_resp and len(json_resp["errors"]) > 0:
                    error_code = json_resp["errors"][0].get("code")
                    if error_code == 1675030:  # token expired / needs refresh
                        raise CookieExpiredError(
                            "Authentication cookie expired. Refresh your ecto_1_sess token from meta.ai."
                        )
                    else:
                        raise GenerationError(f"GraphQL error: {json_resp}")

                # Validate response shape based on operation type
                if operation_type == "image":
                    # Image generation expects `data.xab_abra_respond.bot_response_message.imagine_card.imagine_media[*].uri`
                    # No immediate validation here; parsing delegated to caller
                    pass
                elif operation_type == "video":
                    # Video generation may return a `conversation_id` or similar for polling
                    # Caller will handle status polling
                    pass
                else:
                    raise GenerationError(f"Unsupported operation_type: {operation_type}")

                return json_resp
            except httpx.HTTPStatusError as http_err:
                if attempt == self.max_retries:
                    raise GenerationError(f"HTTP error after {attempt} attempts: {http_err}")
                await self._delay_backoff(attempt)
            except httpx.RequestError as req_err:
                if attempt == self.max_retries:
                    raise GenerationError(f"Network error after {attempt} attempts: {req_err}")
                await self._delay_backoff(attempt)

    async def _delay_backoff(self, attempt: int) -> None:
        """
        Exponential backoff delay between retry attempts.
        """
        delay = min(2 ** attempt, 60)  # max 60s delay
        await asyncio.sleep(delay)


# Convenience wrapper functions
async def generate_image(
    prompt: str,
    orientation: str = "LANDSCAPE",
    doc_id: str | None = None,
    auth_config: AuthConfig | None = None,
    max_retries: int = 3,
) -> dict:
    """
    Generate an image via Meta AI's GraphQL API.
    This is a synchronous wrapper for demonstration; normally called via an instance method.
    """
    if auth_config is None:
        import os

        auth_config = AuthConfig(
            datr=os.getenv("META_AI_DATR", ""),
            abra_sess=os.getenv("META_AI_ABRA_SESS", ""),
            ecto_1_sess=os.getenv("META_AI_ECTO_1_SESS", ""),
        )
    # NOTE: In a full implementation you would create a MetaAI instance and call its method.
    # Here we leave a placeholder to indicate where manual doc_id update is required.
    raise NotImplementedError(
        "Manual doc_id extraction is required. Intercept the POST request in your browser "
        "when generating an image and replace the placeholder in image.py."
    )


async def generate_video(
    prompt: str,
    orientation: str = "VERTICAL",
    auto_poll: bool = True,
    max_attempts: int = 20,
    poll_interval: int = 5,
    doc_id: str | None = None,
    max_retries: int = 3,
) -> dict:
    """
    Generate a video via Meta AI's GraphQL API.
    """
    if auth_config is None:
        import os

        auth_config = AuthConfig(
            datr=os.getenv("META_AI_DATR", ""),
            aba_sess=os.getenv("META_AI_ABRA_SESS", ""),
            ecto_1_sess=os.getenv("META_AI_ECTO_1_SESS", ""),
        )
    raise NotImplementedError(
        "Manual doc_id extraction is required. Intercept the POST request in your browser "
        "when generating a video and replace the placeholder in video.py."
    )