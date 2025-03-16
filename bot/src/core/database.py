from sqlalchemy import Column, BigInteger, String, ForeignKey, func, select
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker
from sqlalchemy.orm import relationship, declarative_base

from .config import Config


Base = declarative_base()

class User(Base):
    __tablename__ = "users"

    tg_id = Column(BigInteger, primary_key=True)
    name = Column(String, nullable=False)
    invited = relationship("Invited", back_populates="inviter")


class Invited(Base):
    __tablename__ = "invited"

    tg_id = Column(BigInteger, primary_key=True)
    invited_by = Column(BigInteger, ForeignKey("users.tg_id"), primary_key=True)
    name = Column(String, nullable=False)

    inviter = relationship("User", back_populates="invited")


engine = create_async_engine(Config.POSTGRESQL_URI)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class DBHandler:
    @staticmethod
    async def get_leaderboard():
        """
        Get the top 10 users by the number of users they invited.
        """
        async with SessionLocal() as session:
            stmt = (
                select(User.tg_id, User.name, func.count(Invited.tg_id).label("invited_count"))
                .join(Invited, User.tg_id == Invited.invited_by)
                .group_by(User.tg_id, User.name)
                .order_by(func.count(Invited.tg_id).desc())
                .limit(10)
            )
            result = await session.execute(stmt)
            return result.all()

    @staticmethod
    async def get_position(user_id: int) -> int | None:
        """
        Get the leaderboard position of a specific user by their ID.
        Return None if the user is not on the leaderboard.
        """
        async with SessionLocal() as session:
            stmt = (
                select(User.tg_id, func.rank().over(
                    order_by=func.count(Invited.tg_id).desc()
                ).label("rank"))
                .join(Invited, User.tg_id == Invited.invited_by)
                .group_by(User.tg_id)
            )

            result = await session.execute(stmt)
            leaderboard = result.fetchall()

            for row in leaderboard:
                if row.tg_id == user_id:
                    return row.rank
            
            return None

    @staticmethod
    async def add_invited(user_id: int, invited_by_id: int, invited_name: str) -> bool:
        """
        Add a user to the "invited" table. Return False if the user was already invited by the same inviter.
        """
        async with SessionLocal() as session:
            # Check if the user was already invited by the same inviter
            existing_invite = await session.get(Invited, {'tg_id': user_id, 'invited_by': invited_by_id})
            
            if existing_invite:
                return False

            new_invite = Invited(tg_id=user_id, invited_by=invited_by_id, name=invited_name)
            session.add(new_invite)
            await session.commit()
            return True

    @staticmethod
    async def add_user(tg_id: int, name: str) -> None:
        """
        Add a new user to the users table.
        """
        async with SessionLocal() as session:
            existing_user = await session.get(User, {'tg_id': tg_id})
            if existing_user:
                return

            new_user = User(tg_id=tg_id, name=name)
            session.add(new_user)
            await session.commit()

    @staticmethod
    async def get_invited(tg_id: int):
        """
        Get a list of users invited by the user with the specified Telegram ID.
        """
        async with SessionLocal() as session:
            stmt = (
                select(Invited.tg_id, Invited.name)
                .where(Invited.invited_by == tg_id)
            )
            result = await session.execute(stmt)
            return result.all()