# Referral Telegram Bot 🤖

Open-source referral telegram bot with leaderboard mini-app. Feel free to use this minimal version for your own projects or to extend logic of this one for your needs.

![](https://img.shields.io/badge/license-MIT-blue) ![](https://flat.badgen.net/github/stars/alerrad/referral-bot)

## Key Features 🚀

- **Secure Invite Links**: Generate unique, secure invite links to accurately track referrals.
- **Leaderboard Mini-App**: Visual leaderboard with real-time updates to enhance user engagement.
- **Pagination & Search**: Quickly search participants by name and paginate results efficiently.
- **Anti-Flood Protection**: Uses Redis caching to prevent spam and abuse.
- **Personal Position Tracking**: Allows users to monitor their referral ranking easily.
- **Scalable & Maintainable**: Structured codebase that's easy to extend or adapt.

## To-do 📝

- Add admin panel
- Complete multi-language support

## Quick Start 🛠

1. Clone this repo
2. Configure .env(s) as in .example
3. Run bot's compose ```docker-compose up --build -d```
4. Host the mini-app on any provider & copy link
5. Embed the link to your bot through [@BotFather](https://t.me/BotFather) on Telegram

## Contribution 🤝
Contributions are welcome! Feel free to open issues or submit pull requests.

1) Fork the project
2) Create your Feature Branch
3) Commit your Changes & push to the Branch
4) Open a Pull Request

## License

Distributed under [MIT License](./LICENSE).