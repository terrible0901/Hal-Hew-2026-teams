from io import BytesIO
import json
import os
from pathlib import Path
from zipfile import ZipFile

from flask import abort, send_from_directory, session
from PIL import Image, UnidentifiedImageError

from app.common import ROOT, app, event_time, transaction
from datetime import datetime, timezone

STORAGE = Path(os.environ.get("UPLOAD_FOLDER", "kakusyon/art"))
if not STORAGE.is_absolute():
    STORAGE = ROOT / STORAGE
PUBLIC = STORAGE / "preview"
PRIVATE = STORAGE / "original"


def checked_png(file):
    if not file:
        raise ValueError("画像がありません。")
    data = file.read(5 * 1024 * 1024 + 1)
    if len(data) > 5 * 1024 * 1024:
        raise ValueError("PNGは1枚5MiB以内です。")
    try:
        with Image.open(BytesIO(data)) as image:
            if image.format != "PNG" or image.size != (1024, 1024):
                raise ValueError("1024×1024のPNGが必要です。")
            image.load()
    except (OSError, UnidentifiedImageError, Image.DecompressionBombError) as exc:
        raise ValueError("PNGを読み込めません。") from exc
    return data


def write_drawing(key, files, metadata):
    layers = files.getlist("layer")
    if not isinstance(metadata, list) or not 1 <= len(metadata) == len(layers) <= 10:
        raise ValueError("レイヤー構成が不正です。")
    PRIVATE.mkdir(parents=True, exist_ok=True)
    PUBLIC.mkdir(parents=True, exist_ok=True)
    png = checked_png(files.get("image"))
    (PRIVATE / (key + ".png")).write_bytes(png)
    with ZipFile(PRIVATE / (key + ".zip"), "w") as archive:
        manifest = []
        for index, (file, layer) in enumerate(zip(layers, metadata)):
            if (
                not isinstance(layer, dict)
                or not isinstance(layer.get("visible"), bool)
                or not isinstance(layer.get("opacity"), (float, int))
                or not 0 <= layer["opacity"] <= 1
            ):
                raise ValueError("レイヤー設定が不正です。")
            filename = f"layer-{index + 1}.png"
            archive.writestr(filename, checked_png(file))
            manifest.append(
                dict(
                    file=filename,
                    name=str(layer.get("name", ""))[:80],
                    visible=layer["visible"],
                    opacity=layer["opacity"],
                )
            )
        archive.writestr("manifest.json", json.dumps(manifest, ensure_ascii=False))
    with Image.open(BytesIO(png)) as image:
        image.thumbnail((600, 600))
        image.save(PUBLIC / (key + ".png"))


@app.get("/drawings/<filename>")
def get_drawing(filename):
    if (PUBLIC / filename).is_file():
        with transaction() as cur:
            cur.execute(
                "SELECT artist_id, status FROM artworks WHERE image_path=%s LIMIT 1",
                (filename,),
            )
            row = cur.fetchone()
        if (
            not row
            or row["status"] == "draft"
            and row["artist_id"] != session.get("user_id")
        ):
            abort(404)
        return send_from_directory(PUBLIC, filename)
    # Existing installations stored public images here before private originals were introduced.
    return send_from_directory(Path(__file__).parent / "art", filename)


@app.get("/artworks/<int:art_id>/download/<kind>")
def download_art(art_id, kind):
    stop = event_time("APP_STOP")
    if stop and datetime.now(timezone.utc) >= stop:
        abort(410)
    if kind not in ("png", "zip") or not session.get("user_id"):
        abort(403)
    with transaction() as cur:
        cur.execute(
            """SELECT a.image_path FROM artworks a JOIN drawing_files d ON d.artwork_id=a.id
            WHERE a.id=%s AND (artist_id=%s OR EXISTS
            (SELECT 1 FROM auctions WHERE artwork_id=a.id AND status='ended' AND winner_id=%s))""",
            (art_id, session["user_id"], session["user_id"]),
        )
        row = cur.fetchone()
    if not row:
        abort(403)
    return send_from_directory(
        PRIVATE, Path(row["image_path"]).stem + "." + kind, as_attachment=True
    )
