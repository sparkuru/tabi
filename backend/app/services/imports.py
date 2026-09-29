"""Normalize item identity within a checklist."""

from unicodedata import normalize


def item_dedupe_key(name: str, address: str | None) -> str:
    """Normalize item name and optional address for same-list review."""
    normalized_name = " ".join(normalize("NFKC", name).casefold().split())
    normalized_address = " ".join(normalize("NFKC", address or "").casefold().split())
    return f"{normalized_name}\x1f{normalized_address}"
