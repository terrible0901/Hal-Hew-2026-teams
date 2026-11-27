import secrets
# 実装予定の概要（実装済みを示すものではありません）
# ユーザー名とパスワードによる登録・ログイン・ログアウトを受け付ける。メールは一切使用しない。
# ユーザー名重複・入力検証、パスワード照合、ログイン状態、本人の表示名変更を扱う。
# 復旧コードでの再設定と、現在のパスワード確認付きコード再発行を提供する。
# コードはハッシュ保存し、使用・再発行時に旧コードを無効化する。イベント終了後は新規登録不可。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from flask import flash, redirect, render_template, request, session, url_for
from werkzeug.security import check_password_hash, generate_password_hash

from app.common import app, connect_sql, transaction, event_open
from app.artworks.routes import bonus
from mysql.connector import IntegrityError


@app.route("/sign_up", methods=["POST"])  # signup
def sign_up():
    # email = request.args.get('email') #いる？要らない？
    password = request.form.get("password")
    confirmation = request.form.get("confirmation")
    # ユーザー名とディスプレイ名追加
    username = request.form.get("username")
    disp_name = request.form.get("display_name")

    if not event_open():
        flash("イベント期間外のため登録できません。", "error")
        return redirect(url_for("signup_page"))
    if not username or len(username) > 20 or len(disp_name or "") > 50:
        flash("ユーザー名は1〜20文字、表示名は50文字以内で入力してください。", "error")
        return redirect(url_for("signup_page"))
    username_double = username_check(username)
    if username_double:
        flash("Username already taken.", "error")
        return redirect(url_for("signup_page"))  # expect bug

    if not disp_name:
        disp_name = username

    if not password:
        flash("Please fill in the password.", "error")
        return redirect(url_for("signup_page"))  # expect bug
    elif password != confirmation:
        flash("Passwords do not match. Please try again.", "error")
        return redirect(url_for("signup_page"))  # expect bug

    recovery = secrets.token_urlsafe(18)
    hashed_password = generate_password_hash(password)
    try:
        with transaction() as cur:
            cur.execute(
                "INSERT INTO users(username,disp_name,password_hash,recovery_hash) VALUES(%s,%s,%s,%s)",
                (
                    username,
                    disp_name,
                    hashed_password,
                    generate_password_hash(recovery),
                ),
            )
            user_id = cur.lastrowid
            bonus(cur, user_id, 1000)
    except IntegrityError:
        flash("Username already taken.", "error")
        return redirect(url_for("signup_page"))
    session.clear()
    session["user_id"] = user_id
    session["username"] = username
    session["disp_name"] = disp_name

    return (
        render_template("recovery.html", code=recovery),
        200,
        {"Cache-Control": "no-store"},
    )


def username_check(username):
    conn = connect_sql()
    cursor = conn.cursor()
    query = "SELECT username FROM users where username = %s"
    params = (username,)
    cursor.execute(query, params)
    result = cursor.fetchone()
    cursor.close()
    conn.close()
    value = False
    if result:
        value = True
    return value


@app.route("/log_in", methods=["POST"])
def log_in():
    username = request.form.get("username")
    password = request.form.get("password")

    conn = connect_sql()
    cursor = conn.cursor()
    query = "SELECT id, username, disp_name, password_hash FROM users WHERE username = %s AND is_active"
    cursor.execute(query, (username,))
    result = cursor.fetchone()
    cursor.close()
    conn.close()

    if (not result) or (not check_password_hash(result[3], password or "")):  # pyright: ignore[reportArgumentType]
        flash("Invalid username or Password", "error")
        return redirect(url_for("login_page"))

    session.clear()
    session["user_id"] = result[0]  # pyright: ignore[reportArgumentType]
    session["username"] = result[1]  # pyright: ignore[reportArgumentType]
    session["disp_name"] = result[2]  # pyright: ignore[reportArgumentType]

    flash("Log in success!", "success")

    return redirect(url_for("index"))


@app.route("/login_page")
def login_page():
    return render_template("login.html")


@app.route("/signup_page")
def signup_page():
    return render_template("signup.html")


@app.post("/logout")
def logout():
    session.clear()
    return redirect(url_for("index"))


@app.post("/profile")
def profile():
    if not session.get("user_id"):
        return redirect(url_for("login_page"))
    name = request.form.get("display_name", "").strip()
    if 1 <= len(name) <= 50:
        with transaction() as cur:
            cur.execute(
                "UPDATE users SET disp_name=%s WHERE id=%s", (name, session["user_id"])
            )
        session["disp_name"] = name
        flash("表示名を変更しました。", "success")
    else:
        flash("表示名は1〜50文字で入力してください。", "error")
    return redirect(url_for("index", view="profile"))


@app.route("/recover", methods=["GET", "POST"])
def recover():
    if request.method == "GET":
        return render_template("recovery.html")
    name = request.form.get("username", "")
    password = request.form.get("password", "")
    with transaction() as cur:
        cur.execute(
            "SELECT id,recovery_hash FROM users WHERE username=%s AND is_active FOR UPDATE",
            (name,),
        )
        user = cur.fetchone()
        if (
            not password
            or not user
            or not user["recovery_hash"]
            or not check_password_hash(
                user["recovery_hash"], request.form.get("code", "")
            )
        ):
            flash(
                "ユーザー名・復旧コード・新しいパスワードを確認してください。", "error"
            )
            return render_template("recovery.html"), 400
        cur.execute(
            "UPDATE users SET password_hash=%s,recovery_hash=NULL WHERE id=%s",
            (generate_password_hash(password), user["id"]),
        )
    session.clear()
    flash(
        "パスワードを再設定しました。ログイン後に復旧コードを再発行できます。",
        "success",
    )
    return redirect(url_for("login_page"))


@app.post("/profile/recovery")
def reissue():
    if not session.get("user_id"):
        return redirect(url_for("login_page"))
    with transaction() as cur:
        cur.execute(
            "SELECT password_hash FROM users WHERE id=%s FOR UPDATE",
            (session["user_id"],),
        )
        if not check_password_hash(
            cur.fetchone()["password_hash"], request.form.get("password", "")
        ):
            flash("現在のパスワードを確認してください。", "error")
            return redirect(url_for("index", view="profile"))
        code = secrets.token_urlsafe(18)
        cur.execute(
            "UPDATE users SET recovery_hash=%s WHERE id=%s",
            (generate_password_hash(code), session["user_id"]),
        )
    return (
        render_template("recovery.html", code=code),
        200,
        {"Cache-Control": "no-store"},
    )
