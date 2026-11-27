import json
import secrets
import time
from uuid import uuid4

from flask import (
    abort,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)

from app.common import app, event_open, transaction
from app.services.image_service import PRIVATE, PUBLIC, write_drawing

TIMES = {10, 30, 60, 300}
THEMES = {"free", "vehicle", "animal", "insect", "plant", "food", "chara", "domae"}


@app.get("/draw/setup")
def setup():
    return render_template("draw_setup.html")


@app.get("/draw/start")
def start_drawing():
    if not event_open():
        return render_template(
            "canvas_mode_error.html",
            message="イベント期間外のため、新しい描画は開始できません。",
        ), 409
    mode = request.args.get("mode")
    seconds = {"short": 30, "mid": 60}.get(
        request.args.get("time"), request.args.get("time", type=int)
    )
    theme = request.args.get("theme")
    if mode == "normal":
        mode = "simple"
    if mode not in ("simple", "pro") or seconds not in TIMES or theme not in THEMES:
        return render_template("canvas_mode_error.html"), 400
    session["drawing"] = dict(
        id=secrets.token_hex(16),
        mode=mode,
        theme=theme,
        seconds=seconds,
        start=int(time.time() * 1000) + 4000,
    )
    return redirect(url_for("canvas", drawing=session["drawing"]["id"]))


@app.get("/draw/canvas")
def canvas():
    draw = session.get("drawing")
    if "time" in request.args:
        return redirect(url_for("start_drawing", **request.args.to_dict()))
    if not draw or draw["id"] != request.args.get("drawing"):
        return redirect(url_for("setup"))
    if draw.get("saved"):
        return redirect(url_for("complete", drawing=draw["id"]))
    # error: return render_template("canvas_pro.html")  # masterの参照先が存在しない。
    # The original canvas supports both modes through its drawing engine.
    return render_template("canvas.html", draw=draw)


@app.post("/draw/freeze")
def freeze_drawing():
    draw = session.get("drawing", {})
    if not draw or request.form.get("drawing") != draw["id"]:
        abort(409)
    if "finished" not in draw:
        end = draw["start"] + draw["seconds"] * 1000
        session["drawing"] = {**draw, "finished": min(int(time.time() * 1000), end)}
    return jsonify(ok=True)


@app.post("/draw/save")
def save_draft():
    draw = session.get("drawing", {})
    user = session.get("user_id")
    if not user or request.form.get("drawing") != draw.get("id") or not draw:
        return jsonify(error="ログインと描画状態を確認してください。"), 403
    key = uuid4().hex
    try:
        with transaction() as cur:
            cur.execute(
                "SELECT id FROM users WHERE id=%s AND is_active FOR UPDATE", (user,)
            )
            if not cur.fetchone():
                abort(403)
            cur.execute(
                "SELECT artwork_id FROM drawing_files WHERE drawing_id=%s",
                (draw["id"],),
            )
            if not cur.fetchone():
                if (
                    time.time() * 1000
                    > draw.get("finished", draw["start"] + draw["seconds"] * 1000)
                    + 60000
                    or not event_open()
                ):
                    return jsonify(
                        error="正式保存の受付時間を過ぎました。端末に画像を保存できます。"
                    ), 409
                write_drawing(
                    key, request.files, json.loads(request.form.get("metadata", "null"))
                )
                cur.execute(
                    """INSERT INTO artworks (artist_id,title,category,image_path,draw_time)
                    VALUES (%s,'わたしの作品',%s,%s,%s)""",
                    (user, draw["theme"], key + ".png", str(draw["seconds"]) + "s"),
                )
                cur.execute(
                    "INSERT INTO drawing_files VALUES (%s,%s)",
                    (draw["id"], cur.lastrowid),
                )
                cur.execute(
                    """SELECT 1 FROM wallet_transactions WHERE user_id=%s AND transaction_type='bonus'
                    AND amount=100 AND created_at >= CURRENT_DATE LIMIT 1""",
                    (user,),
                )
                if not cur.fetchone():
                    bonus(cur, user, 100)
    except Exception as exc:
        for folder, ext in [(PRIVATE, ".png"), (PRIVATE, ".zip"), (PUBLIC, ".png")]:
            (folder / (key + ext)).unlink(missing_ok=True)
        if isinstance(exc, ValueError):
            return jsonify(error=str(exc)), 400
        raise
    session["drawing"] = {**draw, "saved": True}
    return jsonify(ok=True)


def bonus(cur, user, amount):
    cur.execute(
        "UPDATE users SET point_balance=point_balance+%s WHERE id=%s", (amount, user)
    )
    cur.execute(
        """INSERT INTO wallet_transactions(user_id,transaction_type,amount,balance_after)
                   SELECT id,'bonus',%s,point_balance FROM users WHERE id=%s""",
        (amount, user),
    )


@app.get("/draw/complete")
def complete():
    key = request.args.get("drawing") or session.get("drawing", {}).get("id")
    draft = None
    if key and session.get("user_id"):
        with transaction() as cur:
            cur.execute(
                """SELECT d.drawing_id,a.* FROM drawing_files d JOIN artworks a ON a.id=d.artwork_id
                WHERE drawing_id=%s AND artist_id=%s AND status='draft'""",
                (key, session["user_id"]),
            )
            draft = cur.fetchone()
    tags = []
    if draft:
        with transaction() as cur:
            cur.execute("SELECT id,name FROM tags ORDER BY name")
            tags = cur.fetchall()
    return render_template("complete.html", draft=draft, tags=tags)


@app.post("/post_art")
def post_art():
    user = session.get("user_id")
    if not user:
        abort(403)
    minutes = request.form.get("minutes", type=int)
    price = request.form.get("price", type=int)
    title = request.form.get("title", "").strip()
    description = request.form.get("description", "").strip()
    if (
        minutes not in (5, 10, 15, 20)
        or price is None
        or not 0 <= price <= 2147483647
        or not 1 <= len(title) <= 40
        or len(description) > 100
    ):
        return jsonify(error="作品名・説明・価格・開催時間を確認してください。"), 400
    with transaction() as cur:
        cur.execute(
            "SELECT id FROM users WHERE id=%s AND is_active FOR UPDATE", (user,)
        )
        if not cur.fetchone():
            abort(403)
        cur.execute(
            """SELECT a.id,a.status FROM drawing_files d JOIN artworks a ON a.id=d.artwork_id
            WHERE drawing_id=%s AND artist_id=%s FOR UPDATE""",
            (request.form.get("drawing_id"), user),
        )
        art = cur.fetchone()
        if not art:
            abort(404)
        if art["status"] == "draft":
            if not event_open(minutes):
                return jsonify(error="開催時間がイベント期間外です。"), 409
            cur.execute(
                "UPDATE artworks SET title=%s,description=%s,status='listed' WHERE id=%s",
                (title, description, art["id"]),
            )
            cur.execute(
                """INSERT INTO auctions(artwork_id,start_price,current_price,end_time)
                           VALUES (%s,%s,%s,DATE_ADD(NOW(),INTERVAL %s MINUTE))""",
                (art["id"], price, price, minutes),
            )
            auction = cur.lastrowid
            tag_ids = set(request.form.getlist("tags", type=int))
            for tag_id in tag_ids:
                cur.execute(
                    "INSERT INTO artwork_tags(artwork_id,tag_id) SELECT %s,id FROM tags WHERE id=%s",
                    (art["id"], tag_id),
                )
            cur.execute(
                "SELECT 1 FROM wallet_transactions WHERE user_id=%s AND transaction_type='bonus' AND amount=300 LIMIT 1",
                (user,),
            )
            if not cur.fetchone():
                bonus(cur, user, 300)
        else:
            cur.execute(
                "SELECT id FROM auctions WHERE artwork_id=%s ORDER BY id DESC LIMIT 1",
                (art["id"],),
            )
            auction = cur.fetchone()["id"]
    return jsonify(ok=True, redirect=url_for("item_detail", id=auction))
