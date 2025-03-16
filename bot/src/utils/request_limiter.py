from functools import wraps

from aiogram.types import Message

from ..core import logger, redis_client
from ..lexicon import LEXICON_EN


def rate_limited(max_requests: int = 10):
    def decorator(func):
        @wraps(func)
        async def wrapper(message: Message, *args, **kwargs):
            user_id: int = message.from_user.id
            request_count = await redis_client.get(user_id)

            if request_count and request_count >= max_requests:
                logger.warning(f'User {user_id} exceeded limit')
                await message.reply(LEXICON_EN['limit_exceeded'])
                return
            
            await redis_client.incr(user_id)
            await redis_client.expire(user_id, 1200)

            return await func(message, *args, **kwargs)

        return wrapper

    return decorator