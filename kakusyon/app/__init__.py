# 実装予定の概要（実装済みを示すものではありません）
# Flaskアプリ全体を初期化し、各機能を登録する。
# 設計上はcreate_appで設定・拡張機能・Blueprint・CLIを組み立てる。
# 画面HTMLはtemplates、ブラウザ側の描画・復元はstatic/js、見た目はstatic/cssへ配置する予定。
# static/imgには公開素材だけを置き、原寸PNG・レイヤーZIPは認可付きで取得させる。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from . import common

from .home import routes as home_routes
from .artworks import routes as artworks_routes
from .admin import routes as admin_routes
from .auctions import routes as auctions_route
from .comments import routes as comments_route
from .favorites import routes as comments_route
from .search import routes as search_route
from .streams import routes as streams_route