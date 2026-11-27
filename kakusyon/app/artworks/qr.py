import base64
import hashlib
import re
import secrets
from io import BytesIO
from uuid import UUID

from flask import abort, jsonify, request, send_file, session, url_for
from PIL import Image

from app.common import app, transaction


@app.post("/api/qr-images")
def share_image():
    if not session.get("user_id"):
        return jsonify(error="QR共有にはログインしてください。"), 403
    data = request.get_json(silent=True)
    if not isinstance(data, dict):
        abort(400)
    try:
        key = str(UUID(data["id"]))
        token = data["token"]
        prefix, encoded = data["image"].split(",", 1)
        if (
            not re.fullmatch("[0-9a-f]{64}", token)
            or prefix != "data:image/jpeg;base64"
            or len(encoded) > 137000
        ):
            raise ValueError
        raw = base64.b64decode(encoded, validate=True)
        with Image.open(BytesIO(raw)) as image:
            if image.format != "JPEG" or max(image.size) > 480 or len(raw) > 102400:
                raise ValueError
            image.load()
            clean = BytesIO()
            image.convert("RGB").save(clean, format="JPEG", quality=85)
    except (
        KeyError,
        ValueError,
        AttributeError,
        TypeError,
        OSError,
        Image.DecompressionBombError,
    ):
        return jsonify(error="共有用画像を確認してください。"), 400
    digest = hashlib.sha256(token.encode()).hexdigest()
    with transaction() as cur:
        cur.execute(
            """INSERT INTO qr_previews(id,user_id,token_hash,image) VALUES(%s,%s,%s,%s)
                       ON DUPLICATE KEY UPDATE id=VALUES(id)""",
            (key, session["user_id"], digest, clean.getvalue()),
        )
        cur.execute(
            "SELECT user_id,token_hash,image IS NULL AS revoked FROM qr_previews WHERE id=%s",
            (key,),
        )
        row = cur.fetchone()
        if (
            row["revoked"]
            or row["user_id"] != session["user_id"]
            or not secrets.compare_digest(row["token_hash"], digest)
        ):
            abort(409)
    return jsonify(
        id=key, downloadUrl=url_for("shared_preview", key=key, _external=True)
    )


@app.get("/api/qr-images/<uuid:key>/image")
def shared_preview(key):
    with transaction() as cur:
        cur.execute("SELECT image FROM qr_previews WHERE id=%s", (str(key),))
        row = cur.fetchone()
    if not row or not row["image"]:
        abort(404)
    response = send_file(
        BytesIO(row["image"]), mimetype="image/jpeg", download_name="drawing.jpg"
    )
    response.headers["Cache-Control"] = "private, no-store"
    return response


@app.delete("/api/qr-images/<uuid:key>")
def revoke_preview(key):
    token = request.headers.get("Authorization", "").removeprefix("Bearer ")
    with transaction() as cur:
        cur.execute(
            "SELECT token_hash FROM qr_previews WHERE id=%s FOR UPDATE", (str(key),)
        )
        row = cur.fetchone()
        if not row or not secrets.compare_digest(
            row["token_hash"], hashlib.sha256(token.encode()).hexdigest()
        ):
            abort(403)
        cur.execute("UPDATE qr_previews SET image=NULL WHERE id=%s", (str(key),))
    return jsonify(ok=True)
