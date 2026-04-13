"""Utility functions for cookie parsing and session handling."""
import re
from typing import Dict


def get_cookie_header(datr: str, abra_sess: str, ecto_1_sess: str, rd_challenge: str = "", ps_n: str = "1", ps_l: str = "1", wd: str = "1152x333", dpr: str = "1.25") -> str:
    """Construct the cookie header string for HTTP requests."""
    parts = [
        f"datr={datr}",
        f"abra_sess={abra_sess}",
        f"ecto_1_sess={ecto_1_sess}",
        f"ps_n={ps_n}",
        f"ps_l={ps_l}",
        f"wd={wd}",
        f"dpr={dpr}",
    ]
    if rd_challenge:
        parts.append(f"rd_challenge={rd_challenge}")
    return "; ".join(parts)


def extract_lsd_token(html: str) -> str:
    """Extract the LSD token value from the main Meta AI page HTML."""
    # Look for pattern: "LSD",[],{"token":"<VALUE>"}
    match = re.search(r'"LSD",\[\],\{"token":"([^"]+)"\}', html)
    if not match:
        raise ValueError("LSD token not found in page HTML.")
    return match.group(1)