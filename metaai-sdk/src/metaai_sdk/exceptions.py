"""Custom exception types for Meta AI SDK."""
class MetaAIError(Exception):
    """Base exception for Meta AI SDK."""

class CookieExpiredError(MetaAIError):
    """Raised when authentication cookies are expired or invalid."""

class GenerationError(MetaAIError):
    """Raised when image or video generation fails."""