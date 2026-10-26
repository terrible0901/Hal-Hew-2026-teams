# 実装予定の概要（実装済みを示すものではありません）
# 現行のFlaskアプリ生成・MariaDB接続などの共通処理を置く。
# 設計に合わせて設定・拡張機能・アプリ生成の責務を分離する。
# 秘密情報は環境設定で管理し、業務処理はサービスへ分ける。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from flask import Flask, render_template, request, redirect, url_for, flash
from werkzeug.security import generate_password_hash
import mysql.connector

app = Flask(__name__)

app.config['SECRET_KEY'] = 'korehahimituki-dayo'

def connect_sql() :
    return mysql.connector.connect(
        host = "localhost",
        user = "root",
        password = "",
        database = "hew"
    )