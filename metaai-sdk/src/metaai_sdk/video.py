"""Video generation logic for Meta AI SDK."""

from __future__ import annotations

import asyncio
from typing import Dict, Any

from .client import MetaAI, GenerationError, CookieExpiredError
from .utils import extract_lsd_token


class VideoGeneration:
    """
    Handles video generation via Meta AI's GraphQL API.
    Video generation is asynchronous, so this class polls until the video is ready.
    """

    # Placeholder doc_id - must be updated manually by intercepting network traffic
    # in browser when generating a video. Find the `doc_id` value from the POST
    # request body and replace this placeholder with the actual value.
    # Example format: "uvwxyz9876543210"
    DOC_ID = "eb4f3a405b85d44a9886c8f57b2aedb1"  # Updated with captured doc_id

    SUPPORTED_ORIENTATIONS = {"VERTICAL", "LANDSCAPE", "SQUARE"}

    def __init__(self, client: MetaAI):
        self.client = client

    async def generate_video(
        self,
        prompt: str,
        orientation: str = "VERTICAL",
        auto_poll: bool = True,
        max_attempts: int = 20,
        poll_interval: int = 5,
        doc_id: str | None = None,
    ) -> Dict[str, Any]:
        """
        Generate a video with Meta AI.

        Args:
            prompt: Text prompt describing the desired video content.
            orientation: Video orientation (VERTICAL, LANDSCAPE, or SQUARE).
            auto_poll: If True, automatically poll for video completion.
                If False, only start the generation job and return the job ID.
            max_attempts: Maximum number of polling attempts before timing out.
            poll_interval: Seconds to wait between polling attempts.
            doc_id: The GraphQL operation doc_id. Must be set manually via
                network interception in the browser when generating a video.
                If None, use the placeholder value and raise if not updated.

        Returns:
            dict with keys:
            - success (bool)
            - video_urls (list of str)
            - prompt (str)
            - job_id (str): The internal job ID if async generation is used.

        Raises:
            CookieExpiredError: If authentication cookies are expired.
            GenerationError: If video generation fails or times out.
        """
        if orientation.upper() not in self.SUPPORTED_ORIENTATIONS:
            raise ValueError(f"Orientation must be one of {self.SUPPORTED_ORIENTATIONS}")

        if doc_id is None:
            if self.DOC_ID == "PLACEHOLDER_DOC_ID":
                raise GenerationError(
                    "Placeholder doc_id not updated. Intercept network request in browser "
                    "and replace the DOC_ID constant with the actual value."
                )
            doc_id = self.DOC_ID

        # Prepare variables payload expected by Meta AI for video generation
        variables = {
            "prompt": prompt,
            "orientation": orientation.upper(),
            "length": "6",  # default length in seconds; can be made configurable
            "quality": "standard",  # could be 'high' or 'standard'
        }

        try:
            # Use the internal helper to execute the GraphQL request.
            # The operation name for video generation is typically
            # "GetVideoResult" or similar - you may need to adjust based on actual network capture.
            result = await self.client._execute_graphql_request(
                doc_id=doc_id,
                variables=variables,
                operation_name="GetVideoResult",  # TODO: verify correct operation name via network tab
                operation_type="video",
            )
        except CookieExpiredError as e:
            raise e
        except Exception as e:
            raise GenerationError(f"Video generation request failed: {str(e)}") from e

        # Extract the job_id or immediate video URL from the response.
        # Depending on the API, the response may either:
        #   1. Return a video URL directly (if generation is fast)
        #   2. Return a `conversation_id` or task ID that needs to be polled.
        try:
            # Look for a job/operation ID that can be used for polling.
            # Example path: result["data"]["xab_abra_respond"]["bot_response_message"]["conversation_id"]
            job_id = (
                result["data"]["xab_abra_respond"]["bot_response_message"]["conversation_id"]
            )
            if not job_id:
                # If there's no conversation_id, maybe the video URL is returned directly.
                # This is less common but possible if the video is ready immediately.
                video_urls = []
                # Try to locate video URLs under imagine_media similar to image generation.
                try:
                    media_edges = result["data"]["xab_abra_respond"]["bot_response_message"]["imagine_card"]["imagine_media"]
                    video_urls = [
                        media["uri"] for media in media_edges
                        if "mp4" in media.get("uri", "")
                    ]
                except KeyError:
                    pass

                return {
                    "success": bool(video_urls),
                    "video_urls": video_urls,
                    "prompt": prompt,
                    "job_id": None,
                }

            # If we have a job_id, start polling for completion.
            return await self._poll_for_video_completion(
                job_id=job_id,
                max_attempts=max_attempts,
                poll_interval=poll_interval,
                doc_id=doc_id,
            )
        except KeyError as e:
            # If the expected keys are missing, try to locate any video URLs directly.
            # This fallback handles cases where the API returns the URL directly.
            try:
                media_edges = result["data"]["xab_abra_respond"]["bot_response_message"]["imagine_card"]["imagine_media"]
                video_urls = [
                    media["uri"] for media in media_edges
                    if "mp4" in media.get("uri", "")
                ]
                return {
                    "success": bool(video_urls),
                    "video_urls": video_urls,
                    "prompt": prompt,
                    "job_id": None,
                }
            except KeyError:
                raise GenerationError("Failed to parse video result from response.") from e

    async def _poll_for_video_completion(
        self,
        job_id: str,
        max_attempts: int,
        poll_interval: int,
        doc_id: str,
    ) -> Dict[str, Any]:
        """
        Poll the Meta AI API for video generation job status until completion or timeout.
        """
        attempt = 0
        while attempt < max_attempts:
            attempt += 1
            await asyncio.sleep(poll_interval)

            # Reuse the same GraphQL request pattern but target the status query.
            # The exact operation name may differ; adjust according to actual network capture.
            variables = {
                "operationName": "CheckJobStatus",
                "variables": {
                    "job_id": job_id,
                },
            }

            try:
                result = await self.client._execute_graphql_request(
                    doc_id=doc_id,
                    variables=variables,
                    operation_name="CheckJobStatus",  # TODO: verify correct operation name via network tab
                    operation_type="video_status",
                )
            except (CookieExpiredError, GenerationError) as e:
                # Propagate errors directly; caller handles them.
                raise e

            # Check the status field in the response.
            status = result.get("data", {}).get("checkJobStatus", {}).get("status")
            if status == "completed":
                # Extract video URLs from the completed job result.
                try:
                    media_edges = result["data"]["checkJobStatus"]["result"]["imagine_card"]["imagine_media"]
                    video_urls = [media["uri"] for media in media_edges if "mp4" in media.get("uri", "")]
                except KeyError:
                    video_urls = []
                if video_urls:
                    return {
                        "success": True,
                        "video_urls": video_urls,
                        "prompt": variables["variables"]["prompt"],
                        "job_id": job_id,
                    }
                else:
                    raise GenerationError("Job completed but no video URLs found.")
            elif status == "failed":
                raise GenerationError(f"Video generation job {job_id} failed.")
            # If status is "processing" or unknown, loop again.

        # If we reach here, we exhausted max_attempts without completing.
        raise GenerationError(f"Video generation job {job_id} timeout after {max_attempts} attempts.")