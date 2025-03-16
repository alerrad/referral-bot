from aiogram import Router, Bot
from aiogram.filters import Command, CommandStart, CommandObject
from aiogram.types import Message
from aiogram.utils.deep_linking import decode_payload, create_start_link

from ..core import logger, DBHandler
from ..lexicon import LEXICON_EN
from ..keyboards import links_keyboard
from ..utils import rate_limited


commands_router = Router()


@commands_router.message(CommandStart())
async def start_command(message: Message, command: CommandObject):
    payload = decode_payload(command.args) if command.args else None
    
    if payload:
        if payload == str(message.from_user.id):
            await message.answer(LEXICON_EN["self_ref"])
            return

        try:
            res = await DBHandler.add_invited(message.from_user.id,
                                              int(payload),
                                              message.from_user.full_name)
            if not res:
                await message.answer(LEXICON_EN["already_invited"])
                return
        
        except Exception as e:
            logger.error(f"Error adding user to invited list: {e}")
            await message.answer(LEXICON_EN["error"])
            return
        
        await message.answer(LEXICON_EN["start_ref"], reply_markup=links_keyboard)
    
    else:
        await message.answer(LEXICON_EN["start_no_ref"], reply_markup=links_keyboard)


@commands_router.message(Command("ref_link"))
async def get_ref_link(message: Message, bot: Bot):
    link = await create_start_link(bot, message.from_user.id, encode=True)
    
    try:
        await DBHandler.add_user(message.from_user.id, message.from_user.full_name)
    except Exception as e:
        logger.error(f"Error adding user to the database: {e}")
        await message.answer(LEXICON_EN["error"])
        return

    await message.answer(LEXICON_EN["ref_link"] + link)


@commands_router.message(Command("leaderboard"))
@rate_limited(10)
async def get_leaderboard(message: Message):
    top_users = []

    try:
        top_users = await DBHandler.get_leaderboard()
    except Exception as e:
        logger.error(f"Error getting leaderboard: {e}")
        await message.answer(LEXICON_EN["error"])
        return

    leaderboard = ""
    for i, user in enumerate(top_users, start=1):
        leaderboard += f"{i}\\. [{user[1]}](tg://user?id={user[0]}) \\- {user[2]}\n"

    await message.answer(LEXICON_EN["leaderboard"] + leaderboard, parse_mode="MarkdownV2")


@commands_router.message(Command("position"))
@rate_limited(10)
async def get_position(message: Message):
    position = await DBHandler.get_position(message.from_user.id)

    if not position:
        await message.answer(LEXICON_EN["no_position"])
        return

    await message.answer(LEXICON_EN["position"] + str(position))