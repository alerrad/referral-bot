from aiogram import Dispatcher
from aiogram.fsm.storage.memory import MemoryStorage

from .core import bot, logger, Config, redis_client
from .routers import commands_router


async def start_bot() -> None:
    dp = Dispatcher(storage=MemoryStorage())

    try:
        if await redis_client.ping():
            logger.info("Redis connected")
        else:
            logger.error("Redis not connected")
        
        dp.include_routers(commands_router)
        await bot.set_my_commands(commands=Config.BOT_COMMANDS)
        logger.info("Bot started")
        await dp.start_polling(bot)
    
    except Exception as _:
        await dp.stop_polling()
        logger.error("Bot stopped")