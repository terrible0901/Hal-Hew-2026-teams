# 実装予定の概要（実装済みを示すものではありません）
# 開発サーバーを起動する入口。
# 画面受付・DB処理・入札の業務処理は各機能へ分ける。
# 詳細は「設計・要件/関数定義.md」と「設計・要件/仕様決定事項-2026-10-26.md」を参照。

from kakusyon.app import common

if __name__ == '__main__':
    common.app.run(debug=True)