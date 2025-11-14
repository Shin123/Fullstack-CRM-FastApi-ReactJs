from pathlib import Path
from uuid import UUID

from fastapi import APIRouter, File, HTTPException, UploadFile, status

from app import crud
from app.api.deps import CurrentUser, SessionDep
from app.models import MediaCreate, MediaList, MediaPublic
from app.services.media import process_image_upload

router = APIRouter(prefix="/media", tags=["media"])


@router.get("/", response_model=MediaList)
def list_media(
    session: SessionDep,
    _: CurrentUser,
    skip: int = 0,
    limit: int = 50,
    query: str | None = None,
) -> MediaList:
    data, count = crud.list_media(
        session=session,
        skip=skip,
        limit=min(limit, 100),
        search=query,
    )
    return MediaList(
        data=[MediaPublic.model_validate(item) for item in data],
        count=count,
    )


@router.post(
    "/upload",
    response_model=MediaPublic,
    status_code=status.HTTP_201_CREATED,
)
async def upload_media(
    *,
    session: SessionDep,
    current_user: CurrentUser,
    file: UploadFile = File(...),
) -> MediaPublic:
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail="Only image uploads are supported")

    try:
        processed = await process_image_upload(file)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc

    media_in = MediaCreate(
        file_name=processed["file_name"],
        file_url=processed["file_url"],
        file_path=processed["file_path"],
        mime_type=processed["mime_type"],
        file_size=processed["file_size"],
        width=processed["width"],
        height=processed["height"],
        original_name=processed["original_name"],
        created_by=current_user.id,
    )
    media = crud.create_media_entry(session=session, media_in=media_in)
    return MediaPublic.model_validate(media)


@router.delete("/{media_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_media(
    *,
    session: SessionDep,
    _: CurrentUser,
    media_id: str,
) -> None:
    try:
        media_uuid = UUID(media_id)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Invalid media id") from exc
    media = crud.get_media(session=session, media_id=media_uuid)
    if not media:
        raise HTTPException(status_code=404, detail="Media not found")
    file_path = Path(media.file_path)
    if file_path.exists():
        file_path.unlink(missing_ok=True)
    crud.delete_media(session=session, media=media)
