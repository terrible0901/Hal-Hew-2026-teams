# 実装予定の概要（実装済みを示すものではありません）
# 現行のFlaskアプリ生成・MariaDB接続などの共通処理を置く。
# 設計に合わせて設定・拡張機能・アプリ生成の責務を分離する。
# 秘密情報は環境設定で管理し、業務処理はサービスへ分ける。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from contextlib import contextmanager
from datetime import datetime, timedelta, timezone
from hashlib import sha256
import os
from pathlib import Path
from urllib.parse import urlsplit, unquote

from dotenv import load_dotenv
from flask import Flask, abort, request
import mysql.connector

ROOT = Path(__file__).resolve().parents[2]
# A tracked example key cannot authenticate users. Prefer the deployment-provided key.
load_dotenv(ROOT / ".env")
app = Flask(__name__)
deployment_key = os.environ.get("SECRET_KEY", "")
if (
    not deployment_key
    or sha256(deployment_key.encode()).hexdigest()
    == "2f2f1edb844e34419c1509f7ee94ed6ccb6bed3e39951bc57df639770e34eed9"
):
    import secrets

    instance = Path(app.instance_path)
    instance.mkdir(parents=True, exist_ok=True)
    key_path = instance / "session.key"
    try:
        with key_path.open("x", encoding="ascii") as key_file:
            key_file.write(secrets.token_hex(32))
    except FileExistsError:
        pass
    deployment_key = key_path.read_text("ascii").strip()
app.config["SECRET_KEY"] = deployment_key
app.config["MAX_CONTENT_LENGTH"] = 57 * 1024 * 1024


def connect_sql():
    url = urlsplit(os.environ["DATABASE_URL"])
    return mysql.connector.connect(
        host=url.hostname,
        port=url.port or 3306,
        user=unquote(url.username or ""),
        password=unquote(url.password or ""),
        database=unquote(url.path.lstrip("/")),
        time_zone="+09:00",
    )


@contextmanager
def transaction():
    with connect_sql() as conn, conn.cursor(dictionary=True) as cursor:
        try:
            yield cursor
            conn.commit()
        except Exception:
            conn.rollback()
            raise


def event_time(name):
    value = os.environ.get(name)
    if value:
        dt = datetime.fromisoformat(value)
        return dt if dt.tzinfo else dt.replace(tzinfo=timezone(timedelta(hours=9)))


def event_open(minutes=0):
    now = datetime.now(timezone.utc)

    start, end = event_time("EVENT_START"), event_time("EVENT_END")
    return (not start or start <= now) and (
        not end or now < end and now + timedelta(minutes=minutes) <= end
    )


@app.before_request
def reject_cross_site_posts():
    if request.method == "POST" and (
        request.headers.get("Sec-Fetch-Site") == "cross-site"
        or request.origin
        and request.origin != request.host_url.rstrip("/")
    ):
        abort(403)


@app.context_processor
def operational_times():
    return {"app_stop": event_time("APP_STOP")}


@app.errorhandler(mysql.connector.Error)
def database_error(exc):
    app.logger.error("MariaDB error %s on %s", exc.errno, request.endpoint)
    message = "データベースに接続できません。時間をおいてもう一度お試しください。"
    if request.endpoint in ("save_draft", "post_art", "share_image", "auction_state"):
        return {"error": message}, 503
    from flask import render_template

    return render_template("canvas_mode_error.html", message=message), 503
