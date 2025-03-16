from aiogram.types import KeyboardButton, ReplyKeyboardMarkup


languages_keyboard = ReplyKeyboardMarkup(
    keyboard=[
        [
            KeyboardButton(text="EN English"),
            KeyboardButton(text="RU Русский"),
        ],
    ],
    resize_keyboard=True,
    one_time_keyboard=True,
)