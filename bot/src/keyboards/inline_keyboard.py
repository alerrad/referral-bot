from aiogram.types import InlineKeyboardButton, InlineKeyboardMarkup


links_keyboard = InlineKeyboardMarkup(
    inline_keyboard=[
        [
            InlineKeyboardButton(text="Join our channel", url=""), # Put your URLs here
            InlineKeyboardButton(text="Join our group", url=""),
        ]
    ],
)
