from flask import redirect, render_template, request, session, url_for
from app.common import app, transaction


@app.get("/")
def index():
    user = session.get("user_id")
    view = request.args.get("view")
    personal = view in (
        "drafts",
        "favorites",
        "wallet",
        "won",
        "notifications",
        "profile",
        "bids",
    )
    if personal and not user:
        return redirect(url_for("login_page"))
    args = [user]
    conditions = ["a.status='active'", "a.end_time>NOW()"]
    if view == "favorites":
        conditions = [
            "EXISTS (SELECT 1 FROM bookmarks WHERE user_id=%s AND auction_id=a.id)"
        ]
        args.append(user)
    if view == "won":
        conditions = ["a.status='ended'", "a.winner_id=%s"]
        args.append(user)
    for field, predicate in [
        ("category", "art.category=%s"),
        ("search", "(art.title LIKE %s OR u.disp_name LIKE %s)"),
    ]:
        value = request.args.get(field)
        if value:
            conditions.append(predicate)
            args.extend([value] if field == "category" else ["%" + value + "%"] * 2)
    selected_tags = set(request.args.getlist("tag", type=int))
    for tag in selected_tags:
        conditions.append(
            "EXISTS(SELECT 1 FROM artwork_tags WHERE artwork_id=art.id AND tag_id=%s)"
        )
        args.append(tag)
    with transaction() as cur:
        cur.execute(
            """SELECT a.id,art.title,u.disp_name AS artist_name,a.current_price,art.image_path,
            CASE art.draw_time WHEN 'short' THEN '30' WHEN 'mid' THEN '60' WHEN 'long' THEN '3600'
            ELSE REPLACE(art.draw_time,'s','') END AS draw_time, TIMEDIFF(a.end_time,NOW()) AS remaining_time,
            EXISTS(SELECT 1 FROM bookmarks WHERE user_id=%s AND auction_id=a.id) AS favorite
            FROM auctions a JOIN artworks art ON art.id=a.artwork_id JOIN users u ON u.id=art.artist_id WHERE """
            + " AND ".join(conditions)
            + " ORDER BY a.end_time,a.id",
            tuple(args),
        )
        rows = cur.fetchall()
        data = {}
        if not view:
            cur.execute("SELECT id,name FROM tags ORDER BY name")
            data.update(tags=cur.fetchall(), selected_tags=selected_tags)
        if user and view in (
            "mypage",
            "bids",
            "wallet",
            "drafts",
            "favorites",
            "won",
            "notifications",
            "profile",
        ):
            cur.execute(
                """SELECT u.point_balance,(SELECT COUNT(*) FROM bookmarks WHERE user_id=u.id) AS favorites,
                (SELECT COUNT(*) FROM auctions WHERE status='ended' AND winner_id=u.id) AS won
                FROM users u WHERE id=%s""",
                (user,),
            )
            data["account"] = cur.fetchone()
            cur.execute(
                """SELECT DISTINCT a.id AS auction_id,art.image_path,art.title,a.status,a.winner_id,
                TIMEDIFF(a.end_time,NOW()) AS remaining_time FROM bids b JOIN auctions a ON a.id=b.auction_id
                JOIN artworks art ON art.id=a.artwork_id WHERE b.bidder_id=%s ORDER BY a.id DESC""",
                (user,),
            )
            data["user_bids"] = cur.fetchall()
            if view == "notifications":
                cur.execute(
                    "SELECT * FROM notifications WHERE user_id=%s ORDER BY id DESC",
                    (user,),
                )
                data["notices"] = cur.fetchall()
            if view == "wallet":
                cur.execute(
                    "SELECT * FROM wallet_transactions WHERE user_id=%s ORDER BY id DESC",
                    (user,),
                )
                data["ledger"] = cur.fetchall()
            if view == "drafts":
                cur.execute(
                    """SELECT d.drawing_id,a.title,a.image_path FROM drawing_files d JOIN artworks a ON a.id=d.artwork_id
                    WHERE a.artist_id=%s AND a.status='draft' ORDER BY a.id DESC""",
                    (user,),
                )
                data["drafts"] = cur.fetchall()
    return render_template(
        "personal.html" if personal and view != "bids" else "index.html",
        search_result=rows,
        log_in=bool(user),
        username=session.get("username"),
        disp_name=session.get("disp_name"),
        view=view,
        **data,
    )


@app.post("/notifications/read")
def read_notifications():
    user = session.get("user_id")
    if not user:
        return redirect(url_for("login_page"))
    with transaction() as cur:
        cur.execute(
            "UPDATE notifications SET is_read=1 WHERE user_id=%s AND id<=%s",
            (user, request.form.get("through", 0, type=int)),
        )
    return redirect(url_for("index", view="notifications"))
