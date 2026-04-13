"""Image generation logic for Meta AI SDK."""

from __future__ import annotations

import asyncio
from typing import Dict, Any

from .client import MetaAI, GenerationError, CookieExpiredError
from .utils import extract_lsd_token


class ImageGeneration:
    """
    Handles image generation via Meta AI's GraphQL API.
    """

    # Placeholder doc_id - must be updated manually by intercepting network traffic
    # in browser when generating an image. Find the `doc_id` value from the POST
    # request body and replace this with the actual value.
    # Example format: "abcdef1234567890"
    DOC_ID = "PLACEHOLDER_DOC_ID"  # TODO: update this dynamically via network capture

    SUPPORTED_ORIENTATIONS = {"LANDSCAPE", "VERTICAL", "SQUARE"}

    def __init__(self, client: MetaAI):
        self.client = client

    async def generate_image(self, prompt: str, orientation: str = "LANDSCAPE") -> Dict[str, Any]:
        """
        Generate an image with Meta AI.

        Args:
            prompt: Text prompt describing the desired image.
            orientation: Image orientation (LANDSCAPE, VERTICAL, or SQUARE).

        Returns:
            dict with keys:
            - success (bool)
            - image_urls (list of str)
            - prompt (str)

        Raises:
            CookieExpiredError: If authentication cookies are expired.
            GenerationError: If image generation fails or doc_id is invalid.
        """
        if orientation.upper() not in self.SUPPORTED_ORIENTATIONS:
            raise ValueError(f"Orientation must be one of {self.SUPPORTED_ORIENTATIONS}")

        # Prepare the variables payload expected by Meta AI
        variables = {
            "prompt": prompt,
            "orientation": orientation.upper(),
            "scale": "1024",  # default scaling; can be made configurable
        }

        try:
            # The GraphQL operation name used for image generation
            operation_name = "GetImageResult"
            # Note: The actual doc_id must be updated manually after intercepting meta.ai network
            result = await self.client._execute_graphql_request(
                doc_id=self.DOC_ID,
                variables=variables,
                operation_name=operation_name,
                operation_type="image",
            )
        except CookieExpiredError as e:
            raise e
        except Exception as e:
            # Wrap any unexpected errors into GenerationError for clearer feedback
            raise GenerationError(f"Image generation failed: {str(e)}") from e

        # Parse the response to extract image URLs
        # Expected path (based on browser network inspection):
        # result["data"]["xab_abra_respond"]["bot_response_message"]["imagine_card"]["imagine_media"]
        # Each entry's "uri" field contains the image URL.
        try:
            media_edges = (
                result["data"]["xab_abra_respond"]["bot_response_message"]["imagine_card"]["imagine_media"]
            )
            image_urls = [media["uri"] for media in media_edges]
        except (KeyError, TypeError) as e:
            raise GenerationError("Failed to parse image URLs from response.") from e

        return {"success": True, "image_urls": image_urls, "prompt": prompt}