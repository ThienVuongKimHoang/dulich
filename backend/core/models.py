from __future__ import annotations

from datetime import datetime, timezone
from enum import Enum as PyEnum
from typing import Optional

from sqlalchemy import (
    Boolean, Date, DateTime, Enum, Float, ForeignKey,
    Integer, String, Text, UniqueConstraint, func,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from core.database import Base


def now_utc():
    return datetime.now(timezone.utc)


# ── Users ─────────────────────────────────────────────────────────────────────

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(120))
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True)
    hashed_password: Mapped[str] = mapped_column(String(255))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    is_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    is_super_admin: Mapped[bool] = mapped_column(Boolean, default=False)
    role: Mapped[str] = mapped_column(String(30), default="khach")
    points: Mapped[int] = mapped_column(Integer, default=0)
    gold: Mapped[int] = mapped_column(Integer, default=100)
    avatar_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    equipped_frame: Mapped[Optional[str]] = mapped_column(String(80), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )

    bookings: Mapped[list[Booking]] = relationship("Booking", back_populates="user")
    game_scores: Mapped[list["GameScore"]] = relationship("GameScore", back_populates="user")
    workshop_completions: Mapped[list["WorkshopCompletion"]] = relationship("WorkshopCompletion", back_populates="user")
    achievements: Mapped[list["UserAchievement"]] = relationship("UserAchievement", back_populates="user")
    check_ins: Mapped[list["CheckIn"]] = relationship("CheckIn", back_populates="user")
    personality: Mapped[Optional["UserPersonality"]] = relationship("UserPersonality", back_populates="user", uselist=False)
    community_posts: Mapped[list["Post"]] = relationship("Post", back_populates="author")
    community_reactions: Mapped[list["PostReaction"]] = relationship("PostReaction", back_populates="user")
    community_comments: Mapped[list["PostComment"]] = relationship("PostComment", back_populates="author")
    daily_task_completions: Mapped[list["DailyTaskCompletion"]] = relationship("DailyTaskCompletion", back_populates="user")
    inventory: Mapped[list["UserInventoryItem"]] = relationship("UserInventoryItem", back_populates="user")
    plant_plots: Mapped[list["UserPlantPlot"]] = relationship("UserPlantPlot", back_populates="user")
    facebook_submissions: Mapped[list["FacebookSubmission"]] = relationship("FacebookSubmission", back_populates="user")
    facebook_proofs: Mapped[list["FacebookProof"]] = relationship("FacebookProof", back_populates="user")


# ── GameScores ────────────────────────────────────────────────────────────────

class GameScore(Base):
    __tablename__ = "game_scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    game: Mapped[str] = mapped_column(String(50), default="mai_flower")
    score: Mapped[int] = mapped_column(Integer)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped[User] = relationship("User", back_populates="game_scores")


# ── Locations ─────────────────────────────────────────────────────────────────

class LocationCategory(str, PyEnum):
    mai_village = "mai_village"
    incense_village = "incense_village"
    koi_pond = "koi_pond"
    temple = "temple"
    garden = "garden"
    other = "other"


class Location(Base):
    __tablename__ = "locations"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    name: Mapped[str] = mapped_column(String(200))
    slug: Mapped[str] = mapped_column(String(200), unique=True, index=True)
    description: Mapped[str] = mapped_column(Text)
    category: Mapped[LocationCategory] = mapped_column(
        Enum(LocationCategory), default=LocationCategory.other
    )
    address: Mapped[str] = mapped_column(String(300))
    latitude: Mapped[float] = mapped_column(Float)
    longitude: Mapped[float] = mapped_column(Float)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    qdrant_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    workshops: Mapped[list[Workshop]] = relationship("Workshop", back_populates="location")


# ── Workshops ─────────────────────────────────────────────────────────────────

class Workshop(Base):
    __tablename__ = "workshops"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True)
    title: Mapped[str] = mapped_column(String(250))
    description: Mapped[str] = mapped_column(Text)
    duration_hours: Mapped[float] = mapped_column(Float)
    max_participants: Mapped[int] = mapped_column(Integer, default=10)
    price_vnd: Mapped[int] = mapped_column(Integer, default=0)
    points_reward: Mapped[int] = mapped_column(Integer, default=0)
    location_id: Mapped[int] = mapped_column(ForeignKey("locations.id"))
    is_active: Mapped[bool] = mapped_column(Boolean, default=True)
    qdrant_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    location: Mapped[Location] = relationship("Location", back_populates="workshops")
    bookings: Mapped[list[Booking]] = relationship("Booking", back_populates="workshop")


# ── Bookings ──────────────────────────────────────────────────────────────────

class BookingStatus(str, PyEnum):
    pending = "pending"
    confirmed = "confirmed"
    cancelled = "cancelled"
    completed = "completed"


class Booking(Base):
    __tablename__ = "bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))
    workshop_id: Mapped[int] = mapped_column(ForeignKey("workshops.id"))
    scheduled_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    participants: Mapped[int] = mapped_column(Integer, default=1)
    status: Mapped[BookingStatus] = mapped_column(
        Enum(BookingStatus), default=BookingStatus.pending
    )
    note: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    qr_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )

    user: Mapped[User] = relationship("User", back_populates="bookings")
    workshop: Mapped[Workshop] = relationship("Workshop", back_populates="bookings")


# ── WorkshopCompletions ────────────────────────────────────────────────────────

class WorkshopCompletion(Base):
    __tablename__ = "workshop_completions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    workshop_slug: Mapped[str] = mapped_column(String(100), index=True)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped[User] = relationship("User", back_populates="workshop_completions")


# ── UserAchievements ───────────────────────────────────────────────────────────

class UserAchievement(Base):
    __tablename__ = "user_achievements"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    achievement_id: Mapped[str] = mapped_column(String(100), index=True)
    earned_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped[User] = relationship("User", back_populates="achievements")


# ── CheckIns ──────────────────────────────────────────────────────────────────

class CheckIn(Base):
    __tablename__ = "check_ins"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    location: Mapped[Optional[str]] = mapped_column(String(200), nullable=True)
    checked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped[User] = relationship("User", back_populates="check_ins")


# ── UserPersonality ───────────────────────────────────────────────────────────

class UserPersonality(Base):
    __tablename__ = "user_personalities"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), unique=True, index=True)
    summary: Mapped[str] = mapped_column(Text, default="")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )

    user: Mapped[User] = relationship("User", back_populates="personality")


# ── ActivityLog ────────────────────────────────────────────────────────────────

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, nullable=True, index=True)
    user_name: Mapped[Optional[str]] = mapped_column(String(120), nullable=True)
    user_email: Mapped[Optional[str]] = mapped_column(String(255), nullable=True)
    action: Mapped[str] = mapped_column(String(100))
    detail: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


# ── PageVisit ──────────────────────────────────────────────────────────────────

class PageVisit(Base):
    __tablename__ = "page_visits"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    page: Mapped[str] = mapped_column(String(100), default="home")
    visited_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)


# ── Community Posts ────────────────────────────────────────────────────────────

class Post(Base):
    __tablename__ = "community_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    image_url: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    privacy: Mapped[str] = mapped_column(String(10), default="public")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc, index=True)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )

    author: Mapped["User"] = relationship("User", back_populates="community_posts")
    reactions: Mapped[list["PostReaction"]] = relationship(
        "PostReaction", back_populates="post", cascade="all, delete-orphan"
    )
    comments: Mapped[list["PostComment"]] = relationship(
        "PostComment", back_populates="post", cascade="all, delete-orphan"
    )


class PostReaction(Base):
    __tablename__ = "post_reactions"
    __table_args__ = (
        UniqueConstraint("post_id", "user_id", name="uq_post_reaction_user"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("community_posts.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    emoji: Mapped[str] = mapped_column(String(10), default="👍")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    post: Mapped["Post"] = relationship("Post", back_populates="reactions")
    user: Mapped["User"] = relationship("User", back_populates="community_reactions")


class PostComment(Base):
    __tablename__ = "post_comments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    post_id: Mapped[int] = mapped_column(ForeignKey("community_posts.id"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    content: Mapped[str] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=now_utc, onupdate=now_utc
    )

    post: Mapped["Post"] = relationship("Post", back_populates="comments")
    author: Mapped["User"] = relationship("User", back_populates="community_comments")


# ── DailyTaskCompletions ───────────────────────────────────────────────────────

class DailyTaskCompletion(Base):
    __tablename__ = "daily_task_completions"
    __table_args__ = (
        UniqueConstraint("user_id", "task_id", "date", name="uq_daily_task_user_date"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    task_id: Mapped[str] = mapped_column(String(50), index=True)
    date: Mapped["datetime.date"] = mapped_column(Date, index=True)
    exp_awarded: Mapped[int] = mapped_column(Integer)
    completed_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped[User] = relationship("User", back_populates="daily_task_completions")


# ── UserInventory ──────────────────────────────────────────────────────────────

class UserInventoryItem(Base):
    __tablename__ = "user_inventory"
    __table_args__ = (
        UniqueConstraint("user_id", "item_id", name="uq_inventory_user_item"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    item_id: Mapped[str] = mapped_column(String(80), index=True)
    quantity: Mapped[int] = mapped_column(Integer, default=1)
    acquired_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped[User] = relationship("User", back_populates="inventory")


# ── TourBookings ───────────────────────────────────────────────────────────────

class TourBooking(Base):
    __tablename__ = "tour_bookings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    bid: Mapped[str] = mapped_column(String(60), unique=True, index=True)
    user_id: Mapped[Optional[int]] = mapped_column(Integer, ForeignKey("users.id"), nullable=True, index=True)
    tour_date: Mapped[Optional[str]] = mapped_column(String(20), nullable=True)
    participants: Mapped[int] = mapped_column(Integer, default=1)
    places_json: Mapped[Optional[str]] = mapped_column(Text, nullable=True)  # JSON list of place names
    notes: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    total_vnd: Mapped[int] = mapped_column(Integer, default=0)
    qr_encrypted: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    status: Mapped[str] = mapped_column(String(20), default="confirmed")
    booked_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)


# ── UserPlantPlots ─────────────────────────────────────────────────────────────

class UserPlantPlot(Base):
    __tablename__ = "user_plant_plots"
    __table_args__ = (UniqueConstraint("user_id", "plot_index", name="uq_plant_plot_user_idx"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    plot_index: Mapped[int] = mapped_column(Integer)
    seed_type: Mapped[str] = mapped_column(String(50))
    planted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    stage2_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))   # mam_cay → cay_non
    blooms_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))   # cây nở, sẵn sàng thu hoạch
    is_golden: Mapped[bool] = mapped_column(Boolean, default=False)

    user: Mapped[User] = relationship("User", back_populates="plant_plots")


# ── FacebookSubmission ─────────────────────────────────────────────────────────

class FacebookSubmission(Base):
    __tablename__ = "facebook_submissions"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    fb_url: Mapped[str] = mapped_column(String(500))
    post_title: Mapped[Optional[str]] = mapped_column(String(500), nullable=True)
    reaction_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)
    gold_awarded: Mapped[int] = mapped_column(Integer, default=0)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)
    synced_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    user: Mapped[User] = relationship("User", back_populates="facebook_submissions")


# ── FacebookProof (screenshot-based) ──────────────────────────────────────────

class FacebookProof(Base):
    __tablename__ = "facebook_proofs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    screenshot_path: Mapped[str] = mapped_column(String(500))
    like_count: Mapped[int] = mapped_column(Integer, default=0)
    comment_count: Mapped[int] = mapped_column(Integer, default=0)
    share_count: Mapped[int] = mapped_column(Integer, default=0)
    exp_awarded: Mapped[int] = mapped_column(Integer, default=0)
    submitted_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=now_utc)

    user: Mapped[User] = relationship("User", back_populates="facebook_proofs")