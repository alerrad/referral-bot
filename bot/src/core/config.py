from os import getenv

from aiogram.types import BotCommand
from dotenv import load_dotenv

load_dotenv()

class Config:
    BOT_TOKEN: str = getenv("BOT_TOKEN")
    POSTGRESQL_URI: str = getenv("POSTGRESQL_URI")
    REDIS_HOST: str = getenv("REDIS_HOST")

    BOT_COMMANDS = [
        BotCommand(command="start", description="Start bot"),
        BotCommand(command="leaderboard", description="List top 10 users"),
        BotCommand(command="ref_link", description="Get your referral link"),
        BotCommand(command="position", description="Get your position in leaderboard"),
    ]