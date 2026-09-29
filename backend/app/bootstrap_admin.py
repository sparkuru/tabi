"""One-time interactive system administrator bootstrap."""

import argparse
import getpass
import sys

from pydantic import EmailStr, TypeAdapter, ValidationError
from sqlalchemy import func, select
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.security import hash_password
from app.db.session import get_engine
from app.models.tables import User


class CLIStyle:
    """Semantic terminal colors for the bootstrap command."""

    COLORS = {"TITLE": 7, "CONTENT": 3, "ERROR": 2}

    @staticmethod
    def color(text: str, color: int) -> str:
        """Colorize one terminal message."""
        return f"\033[1;3{color}m{text}\033[0m"


class ColoredArgumentParser(argparse.ArgumentParser):
    """Keep bootstrap help readable in a terminal."""

    def format_help(self) -> str:
        """Colorize the usage header."""
        return CLIStyle.color(super().format_help(), CLIStyle.COLORS["TITLE"])


def main() -> int:
    """Create the first system administrator after migrations are applied."""
    parser = ColoredArgumentParser(
        description="Create the first Tabi system administrator",
        epilog="Example: python -m app.bootstrap_admin --email admin@example.com",
    )
    parser.add_argument("--email", required=True, help="Email address for the new administrator")
    args = parser.parse_args()
    try:
        email = str(TypeAdapter(EmailStr).validate_python(args.email)).lower()
    except ValidationError:
        print(CLIStyle.color("Invalid email address", CLIStyle.COLORS["ERROR"]), file=sys.stderr)
        return 2
    password = getpass.getpass("Password (at least 12 characters): ")
    confirmation = getpass.getpass("Repeat password: ")
    if len(password) < 12 or password != confirmation:
        print(
            CLIStyle.color("Password is too short or does not match", CLIStyle.COLORS["ERROR"]),
            file=sys.stderr,
        )
        return 2
    try:
        with Session(get_engine()) as db:
            existing_admins = db.scalar(
                select(func.count()).select_from(User).where(User.role == "system_admin")
            )
            if existing_admins:
                print(
                    CLIStyle.color("System administrator already exists", CLIStyle.COLORS["ERROR"]),
                    file=sys.stderr,
                )
                return 1
            if db.scalar(select(User).where(User.email == email)):
                print(
                    CLIStyle.color("Email already registered", CLIStyle.COLORS["ERROR"]),
                    file=sys.stderr,
                )
                return 1
            db.add(
                User(
                    email=email,
                    password_hash=hash_password(password),
                    display_name="Administrator",
                    role="system_admin",
                )
            )
            db.commit()
    except SQLAlchemyError as exc:
        print(CLIStyle.color(f"Database error: {exc}", CLIStyle.COLORS["ERROR"]), file=sys.stderr)
        return 1
    print(CLIStyle.color("System administrator created", CLIStyle.COLORS["CONTENT"]))
    return 0


if __name__ == "__main__":
    sys.exit(main())
