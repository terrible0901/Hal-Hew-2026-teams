from flask import (
    abort,
    flash,
    jsonify,
    redirect,
    render_template,
    request,
    session,
    url_for,
)
from app.common import app, event_open, transaction


def change_balance(cur, user, delta, kind, auction, bid):
    cur.execute(
        "UPDATE users SET point_balance=point_balance+%s WHERE id=%s AND CAST(point_balance AS SIGNED)+%s >= 0",
        (delta, user, delta),
    )
    if cur.rowcount != 1:
        raise ValueError("ポイントが不足しています。")
    cur.execute(
        """INSERT INTO wallet_transactions(user_id,amount,balance_after,transaction_type,related_auction_id,related_bid_id)
        SELECT id,%s,point_balance,%s,%s,%s FROM users WHERE id=%s""",
        (delta, kind, auction, bid, user),
    )


def notify(cur, user, kind, message, auction, bid=None):
    cur.execute(
        """INSERT INTO notifications(user_id,notification_type,title,message,related_auction_id,related_bid_id)
                   VALUES(%s,%s,%s,%s,%s,%s)""",
        (user, kind, message, message, auction, bid),
    )


def record_bid(cur, row, user, amount, automatic):
    auction = row["id"]
    previous = row["winner_id"]
    cur.execute(
        "INSERT INTO bids(auction_id,bidder_id,bid_amount,is_auto_bid) VALUES(%s,%s,%s,%s)",
        (auction, user, amount, automatic),
    )
    bid = cur.lastrowid
    debit = amount - row["current_price"] if previous == user else amount
    change_balance(cur, user, -debit, "bid", auction, bid)
    if previous and previous != user:
        change_balance(
            cur, previous, row["current_price"], "refund", auction, row["winner_bid_id"]
        )
        notify(
            cur,
            previous,
            "bid_received",
            "最高入札額が更新され、ポイントを返還しました。",
            auction,
            bid,
        )
    cur.execute(
        "UPDATE auctions SET current_price=%s,winner_id=%s,winner_bid_id=%s WHERE id=%s",
        (amount, user, bid, auction),
    )
    notify(
        cur, row["artist_id"], "bid_received", "作品に入札がありました。", auction, bid
    )
    row.update(current_price=amount, winner_id=user, winner_bid_id=bid)


def match_auto_bids(cur, row):
    cur.execute(
        """SELECT s.id,s.user_id,s.max_amount,u.point_balance FROM auto_bid_settings s
        JOIN users u ON u.id=s.user_id WHERE s.auction_id=%s AND s.is_active AND u.is_active
        ORDER BY s.max_amount DESC,s.id FOR UPDATE""",
        (row["id"],),
    )
    candidates = []
    for setting in cur.fetchall():
        leader = setting["user_id"] == row["winner_id"]
        available = setting["point_balance"] + (row["current_price"] if leader else 0)
        if setting["max_amount"] <= row["current_price"]:
            continue
        if available <= row["current_price"] and not leader:
            cur.execute(
                "UPDATE auto_bid_settings SET is_active=0 WHERE id=%s", (setting["id"],)
            )
            notify(
                cur,
                setting["user_id"],
                "bid_received",
                "残高不足のため自動入札を停止しました。",
                row["id"],
            )
            continue
        candidates.append((min(setting["max_amount"], available), setting))
    if not candidates:
        return
    candidates.sort(key=lambda pair: (-pair[0], pair[1]["id"]))
    limit, winner = candidates[0]
    if winner["user_id"] == row["winner_id"] and len(candidates) == 1:
        return
    next_price = row["current_price"] + 1
    if len(candidates) > 1:
        next_price = max(next_price, candidates[1][0] + 1)
    amount = min(limit, next_price)
    if amount > row["current_price"]:
        record_bid(cur, row, winner["user_id"], amount, True)
    for available, setting in candidates:
        if (
            setting["user_id"] != winner["user_id"]
            and available <= amount
            and setting["max_amount"] > available
        ):
            cur.execute(
                "UPDATE auto_bid_settings SET is_active=0 WHERE id=%s", (setting["id"],)
            )
            notify(
                cur,
                setting["user_id"],
                "bid_received",
                "残高不足のため自動入札を停止しました。",
                row["id"],
            )


@app.post("/auction/<int:auction>/auto")
def auto_bid(auction):
    user = session.get("user_id")
    if not user:
        return redirect(url_for("login_page"))
    try:
        with transaction() as cur:
            cur.execute(
                """SELECT a.*,art.artist_id FROM auctions a JOIN artworks art ON art.id=a.artwork_id
                           WHERE a.id=%s FOR UPDATE""",
                (auction,),
            )
            row = cur.fetchone()
            if not row:
                abort(404)
            if request.form.get("stop"):
                cur.execute(
                    "UPDATE auto_bid_settings SET is_active=0 WHERE user_id=%s AND auction_id=%s",
                    (user, auction),
                )
            else:
                cur.execute("SELECT NOW() AS now")
                if (
                    cur.fetchone()["now"] >= row["end_time"]
                    or row["status"] != "active"
                    or not event_open()
                    or row["artist_id"] == user
                ):
                    raise ValueError("この競売では自動入札を設定できません。")
                cap = request.form.get("maximum", type=int)
                if cap is None or not row["current_price"] < cap <= 2147483647:
                    raise ValueError("現在価格を超える上限額を入力してください。")
                cur.execute(
                    "SELECT point_balance FROM users WHERE id=%s AND is_active FOR UPDATE",
                    (user,),
                )
                balance = cur.fetchone()
                if not balance or balance["point_balance"] < (
                    1 if row["winner_id"] == user else row["current_price"] + 1
                ):
                    raise ValueError("次の入札に必要なポイントが不足しています。")
                cur.execute(
                    """INSERT INTO auto_bid_settings(auction_id,user_id,max_amount) VALUES(%s,%s,%s)
                    ON DUPLICATE KEY UPDATE max_amount=VALUES(max_amount),is_active=1""",
                    (auction, user, cap),
                )
                match_auto_bids(cur, row)
        flash("自動入札の設定を更新しました。", "success")
    except ValueError as exc:
        flash(str(exc), "error")
    return redirect(url_for("item_detail", id=auction))


def settle(auction):
    with transaction() as cur:
        cur.execute(
            """SELECT a.*,art.artist_id FROM auctions a JOIN artworks art ON art.id=a.artwork_id
             WHERE a.id=%s AND a.status='active' AND end_time<=NOW() FOR UPDATE""",
            (auction,),
        )
        row = cur.fetchone()
        if not row:
            return
        if row["winner_id"]:
            change_balance(
                cur,
                row["artist_id"],
                row["current_price"],
                "purchase",
                auction,
                row["winner_bid_id"],
            )
            cur.execute(
                "UPDATE artworks SET status='sold' WHERE id=%s", (row["artwork_id"],)
            )
        if row["winner_id"]:
            notify(
                cur, row["winner_id"], "auction_won", "作品を落札しました。", auction
            )
            notify(
                cur,
                row["artist_id"],
                "auction_won",
                "作品が落札され、売上を加算しました。",
                auction,
            )
        cur.execute(
            "UPDATE auto_bid_settings SET is_active=0 WHERE auction_id=%s", (auction,)
        )
        cur.execute(
            """UPDATE auctions SET status='ended',closed_reason='time_expired',
                    final_price=IF(winner_id IS NULL,NULL,current_price) WHERE id=%s""",
            (auction,),
        )


@app.cli.command("close-auctions")
def close_auctions():
    with transaction() as cur:
        cur.execute("SELECT id FROM auctions WHERE status='active' AND end_time<=NOW()")
        ids = cur.fetchall()
    for row in ids:
        settle(row["id"])


@app.get("/item_detail")
def item_detail():
    auction = request.args.get("id", type=int)
    user = session.get("user_id")
    settle(auction)
    with transaction() as cur:
        cur.execute(
            """SELECT art.*,u.disp_name,a.id AS auction_id,a.current_price,a.winner_id,a.status AS auction_status,
            TIMEDIFF(a.end_time,NOW()) AS remaining_time,
            EXISTS(SELECT 1 FROM bookmarks WHERE auction_id=a.id AND user_id=%s) AS favorite,
            EXISTS(SELECT 1 FROM drawing_files WHERE artwork_id=art.id) AS has_files
            FROM auctions a JOIN artworks art ON art.id=a.artwork_id JOIN users u ON u.id=art.artist_id WHERE a.id=%s""",
            (user, auction),
        )
        result = cur.fetchone()
        cur.execute(
            "SELECT max_amount FROM auto_bid_settings WHERE auction_id=%s AND user_id=%s AND is_active",
            (auction, user),
        )
        auto = cur.fetchone()
    return render_template(
        "auction_detail.html", result=result, auto=auto
    ), 200 if result else 404


@app.post("/post_bid")
def post_bid():
    user = session.get("user_id")
    if not user:
        return redirect(url_for("login_page"))
    auction = request.form.get("art_id", type=int)
    amount = request.form.get("bid_amount", type=int)
    try:
        with transaction() as cur:
            # error: cursor.execute("SELECT from auctions")  # SELECT対象がなくSQLエラー。
            cur.execute(
                """SELECT a.*,art.artist_id FROM auctions a JOIN artworks art ON art.id=a.artwork_id
                WHERE a.id=%s FOR UPDATE""",
                (auction,),
            )
            row = cur.fetchone()
            if not row:
                abort(404)
            cur.execute("SELECT NOW() AS now")
            now = cur.fetchone()["now"]
            if row["status"] != "active" or row["end_time"] <= now or not event_open():
                raise ValueError("入札受付は終了しました。")
            if user == row["artist_id"]:
                raise ValueError("自分の作品には入札できません。")
            if row["current_price"] != request.form.get("seen_price", type=int):
                raise ValueError("現在価格が変わりました。金額を再確認してください。")
            if amount is None or not row["current_price"] < amount <= 2147483647:
                raise ValueError("現在価格を超える整数を入力してください。")
            previous = row["winner_id"]
            cur.execute(
                "SELECT id FROM users WHERE id IN (%s,%s) ORDER BY id FOR UPDATE",
                (user, previous or user),
            )
            cur.fetchall()
            record_bid(cur, row, user, amount, False)
            match_auto_bids(cur, row)
        flash("入札しました。", "success")
    except ValueError as exc:
        flash(str(exc), "error")
    return redirect(url_for("item_detail", id=auction))


@app.post("/auction/<int:auction>/cancel")
def cancel_auction(auction):
    with transaction() as cur:
        cur.execute(
            """SELECT a.*,art.artist_id FROM auctions a JOIN artworks art ON art.id=a.artwork_id WHERE a.id=%s FOR UPDATE""",
            (auction,),
        )
        row = cur.fetchone()
        if not row or row["artist_id"] != session.get("user_id"):
            abort(403)
        cur.execute(
            """UPDATE auctions SET status='cancelled',closed_reason='cancelled' WHERE id=%s AND status='active'
                       AND end_time>NOW() AND winner_bid_id IS NULL AND NOT EXISTS(SELECT 1 FROM bids WHERE auction_id=%s AND bid_status='accepted')""",
            (auction, auction),
        )
        if cur.rowcount:
            cur.execute(
                "UPDATE artworks SET status='cancelled' WHERE id=%s",
                (row["artwork_id"],),
            )
            flash("出品を取り消しました。", "success")
        else:
            flash("入札済みまたは終了した出品は取り消せません。", "error")
    return redirect(url_for("item_detail", id=auction))


@app.get("/auction/<int:auction>/state")
def auction_state(auction):
    settle(auction)
    with transaction() as cur:
        cur.execute(
            "SELECT current_price,status,winner_id,TIMESTAMPDIFF(SECOND,NOW(),end_time) AS remaining FROM auctions WHERE id=%s",
            (auction,),
        )
        row = cur.fetchone()
    if not row:
        abort(404)
    return jsonify(row)


@app.post("/auction/<int:auction>/relist")
def relist(auction):
    user = session.get("user_id")
    minutes = request.form.get("minutes", type=int)
    price = request.form.get("price", type=int)
    if not user:
        abort(403)
    if (
        minutes not in (5, 10, 15, 20)
        or price is None
        or not 0 <= price <= 2147483647
        or not event_open(minutes)
    ):
        flash("価格・開催時間・イベント期間を確認してください。", "error")
        return redirect(url_for("item_detail", id=auction))
    settle(auction)
    with transaction() as cur:
        cur.execute(
            """SELECT a.*,art.artist_id,art.status AS art_status FROM auctions a
            JOIN artworks art ON art.id=a.artwork_id WHERE a.id=%s FOR UPDATE""",
            (auction,),
        )
        row = cur.fetchone()
        if not row or row["artist_id"] != user:
            abort(403)
        cur.execute(
            "SELECT id FROM auctions WHERE artwork_id=%s ORDER BY id DESC LIMIT 1 FOR UPDATE",
            (row["artwork_id"],),
        )
        latest = cur.fetchone()["id"]
        if (
            row["status"] == "active"
            or row["winner_id"]
            or latest != auction
            or row["art_status"] == "sold"
        ):
            flash("この競売からは再出品できません。", "error")
            return redirect(url_for("item_detail", id=latest))
        cur.execute(
            """INSERT INTO auctions(artwork_id,start_price,current_price,end_time)
                    VALUES(%s,%s,%s,DATE_ADD(NOW(),INTERVAL %s MINUTE))""",
            (row["artwork_id"], price, price, minutes),
        )
        latest = cur.lastrowid
        cur.execute(
            "UPDATE artworks SET status='listed' WHERE id=%s", (row["artwork_id"],)
        )
    return redirect(url_for("item_detail", id=latest))
