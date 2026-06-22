import os
import uuid
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from core.database import get_db
from core.models import Post, PostComment, PostReaction
from security import get_current_user, get_optional_user

router = APIRouter(prefix="/api/v1/community", tags=["community"])

UPLOAD_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "uploads", "community")
ALLOWED_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif"}
MAX_SIZE = 8 * 1024 * 1024  # 8 MB


# ── Schemas ────────────────────────────────────────────────────────────────────

class PostUpdate(BaseModel):
    content: Optional[str] = Field(None, min_length=1, max_length=5000)
    privacy: Optional[str] = Field(None, pattern="^(public|private)$")


class ReactIn(BaseModel):
    emoji: str = Field("👍", max_length=10)


class CommentIn(BaseModel):
    content: str = Field(..., min_length=1, max_length=2000)


class AuthorOut(BaseModel):
    id: int
    name: str
    avatar_url: Optional[str] = None
    equipped_frame: Optional[str] = None
    model_config = {"from_attributes": True}


class ReactionOut(BaseModel):
    id: int
    user_id: int
    emoji: str
    model_config = {"from_attributes": True}


class CommentOut(BaseModel):
    id: int
    post_id: int
    user_id: int
    author: AuthorOut
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}


class PostOut(BaseModel):
    id: int
    user_id: int
    author: AuthorOut
    content: str
    image_url: Optional[str]
    privacy: str
    reactions: List[ReactionOut]
    comment_count: int
    created_at: datetime
    updated_at: datetime
    model_config = {"from_attributes": True}


# ── Helpers ────────────────────────────────────────────────────────────────────

def _post_to_out(post: Post) -> PostOut:
    return PostOut(
        id=post.id,
        user_id=post.user_id,
        author=AuthorOut(id=post.author.id, name=post.author.name, avatar_url=post.author.avatar_url, equipped_frame=post.author.equipped_frame),
        content=post.content,
        image_url=post.image_url,
        privacy=post.privacy,
        reactions=[ReactionOut(id=r.id, user_id=r.user_id, emoji=r.emoji) for r in post.reactions],
        comment_count=len(post.comments),
        created_at=post.created_at,
        updated_at=post.updated_at,
    )


async def _get_post_or_404(db: AsyncSession, post_id: int) -> Post:
    result = await db.execute(
        select(Post)
        .where(Post.id == post_id)
        .options(
            selectinload(Post.author),
            selectinload(Post.reactions),
            selectinload(Post.comments),
        )
    )
    post = result.scalar_one_or_none()
    if post is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài viết không tồn tại.")
    return post


async def _save_image(image: UploadFile) -> str:
    if image.content_type not in ALLOWED_TYPES:
        raise HTTPException(status_code=400, detail="Chỉ chấp nhận ảnh JPG, PNG, WebP hoặc GIF.")
    data = await image.read()
    if len(data) > MAX_SIZE:
        raise HTTPException(status_code=400, detail="Ảnh tối đa 8 MB.")
    ext = image.filename.rsplit(".", 1)[-1].lower() if image.filename and "." in image.filename else "jpg"
    filename = f"{uuid.uuid4().hex}.{ext}"
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    with open(os.path.join(UPLOAD_DIR, filename), "wb") as f:
        f.write(data)
    return f"/uploads/community/{filename}"


# ── Endpoints ──────────────────────────────────────────────────────────────────

@router.get("/posts", response_model=List[PostOut])
async def list_posts(
    skip: int = 0,
    limit: int = 20,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    stmt = (
        select(Post)
        .options(
            selectinload(Post.author),
            selectinload(Post.reactions),
            selectinload(Post.comments),
        )
        .order_by(Post.created_at.desc())
        .offset(skip)
        .limit(limit)
    )
    if current_user is None:
        stmt = stmt.where(Post.privacy == "public")
    else:
        stmt = stmt.where(or_(Post.privacy == "public", Post.user_id == current_user.id))

    result = await db.execute(stmt)
    return [_post_to_out(p) for p in result.scalars().all()]


@router.post("/posts", response_model=PostOut, status_code=status.HTTP_201_CREATED)
async def create_post(
    content: str = Form(..., min_length=1, max_length=5000),
    privacy: str = Form("public"),
    image: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    if privacy not in ("public", "private"):
        privacy = "public"
    image_url: Optional[str] = None
    if image and image.filename:
        image_url = await _save_image(image)

    post = Post(user_id=current_user.id, content=content, image_url=image_url, privacy=privacy)
    db.add(post)
    await db.flush()
    await db.refresh(post, attribute_names=["author", "reactions", "comments"])
    return _post_to_out(post)


@router.patch("/posts/{post_id}", response_model=PostOut)
async def update_post(
    post_id: int,
    data: PostUpdate,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    post = await _get_post_or_404(db, post_id)
    if post.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền chỉnh sửa bài viết này.")
    if data.content is not None:
        post.content = data.content
    if data.privacy is not None:
        post.privacy = data.privacy
    await db.flush()
    await db.refresh(post, attribute_names=["author", "reactions", "comments"])
    return _post_to_out(post)


@router.delete("/posts/{post_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_post(
    post_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    post = await _get_post_or_404(db, post_id)
    if post.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa bài viết này.")
    # Remove local image file if present
    if post.image_url and post.image_url.startswith("/uploads/community/"):
        local = os.path.join(UPLOAD_DIR, os.path.basename(post.image_url))
        if os.path.exists(local):
            os.remove(local)
    await db.delete(post)
    await db.flush()


@router.post("/posts/{post_id}/react", response_model=PostOut)
async def react_to_post(
    post_id: int,
    data: ReactIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    post = await _get_post_or_404(db, post_id)
    existing_result = await db.execute(
        select(PostReaction).where(
            PostReaction.post_id == post_id,
            PostReaction.user_id == current_user.id,
        )
    )
    existing = existing_result.scalar_one_or_none()
    if existing is not None:
        if existing.emoji == data.emoji:
            await db.delete(existing)
        else:
            existing.emoji = data.emoji
    else:
        db.add(PostReaction(post_id=post_id, user_id=current_user.id, emoji=data.emoji))
    await db.flush()
    await db.refresh(post, attribute_names=["author", "reactions", "comments"])
    return _post_to_out(post)


@router.get("/posts/{post_id}/comments", response_model=List[CommentOut])
async def list_comments(
    post_id: int,
    skip: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    post_check = await db.execute(select(Post.id).where(Post.id == post_id))
    if post_check.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài viết không tồn tại.")
    result = await db.execute(
        select(PostComment)
        .where(PostComment.post_id == post_id)
        .options(selectinload(PostComment.author))
        .order_by(PostComment.created_at.asc())
        .offset(skip)
        .limit(limit)
    )
    return [
        CommentOut(
            id=c.id, post_id=c.post_id, user_id=c.user_id,
            author=AuthorOut(id=c.author.id, name=c.author.name, avatar_url=c.author.avatar_url, equipped_frame=c.author.equipped_frame),
            content=c.content, created_at=c.created_at,
        )
        for c in result.scalars().all()
    ]


@router.post("/posts/{post_id}/comments", response_model=CommentOut, status_code=status.HTTP_201_CREATED)
async def add_comment(
    post_id: int,
    data: CommentIn,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    post_check = await db.execute(select(Post.id).where(Post.id == post_id))
    if post_check.scalar_one_or_none() is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bài viết không tồn tại.")
    comment = PostComment(post_id=post_id, user_id=current_user.id, content=data.content)
    db.add(comment)
    await db.flush()
    await db.refresh(comment, attribute_names=["author"])
    return CommentOut(
        id=comment.id, post_id=comment.post_id, user_id=comment.user_id,
        author=AuthorOut(id=comment.author.id, name=comment.author.name, avatar_url=comment.author.avatar_url, equipped_frame=comment.author.equipped_frame),
        content=comment.content, created_at=comment.created_at,
    )


@router.delete("/comments/{comment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_comment(
    comment_id: int,
    db: AsyncSession = Depends(get_db),
    current_user=Depends(get_current_user),
):
    result = await db.execute(select(PostComment).where(PostComment.id == comment_id))
    comment = result.scalar_one_or_none()
    if comment is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Bình luận không tồn tại.")
    if comment.user_id != current_user.id and not current_user.is_admin:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Bạn không có quyền xóa bình luận này.")
    await db.delete(comment)
    await db.flush()
