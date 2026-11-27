from flask import abort, redirect, request, session, url_for
from app.common import app, transaction


@app.post("/favorite")
def favorite():
    user = session.get("user_id")
    if not user:
        return redirect(url_for("login_page"))
    auction = request.form.get("art_id", type=int)
    with transaction() as cur:
        cur.execute("SELECT id FROM auctions WHERE id=%s", (auction,))
        if not cur.fetchone():
            abort(404)
        if request.form.get("action") == "remove":
            cur.execute(
                "DELETE FROM bookmarks WHERE user_id=%s AND auction_id=%s",
                (user, auction),
            )
        else:
            cur.execute(
                """INSERT INTO bookmarks(user_id,auction_id) VALUES(%s,%s)
                           ON DUPLICATE KEY UPDATE user_id=VALUES(user_id)""",
                (user, auction),
            )
    return redirect(url_for("item_detail", id=auction))
