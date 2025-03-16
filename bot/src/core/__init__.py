from aiogram import Bot
from redis.asyncio import Redis

from .config import Config
from .logger import logger
from .database import DBHandler


bot = Bot(Config.BOT_TOKEN)
redis_client = Redis(host=Config.REDIS_HOST, port=6379, db=0)