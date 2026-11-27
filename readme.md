# HEW 2026 グループワーク

## 動作環境
python 3.14.6\
xampp V3.3.0 > mariaDB\

## 使用ツール
Ver0.5ではStripe連携・テスト決済・実課金は行いません。

## 設計資料

最新の合意は[仕様決定事項（2026/10/26）](docs/仕様決定事項-2026-10-26.md)を参照してください。
ユーザー名で認証し、メールアドレスは使用しません。1日開催・終了約2時間後の停止を想定しています。仕様は設計段階であり、コード・SQLが対応済みという意味ではありません。

## Flask版の起動とデータベース更新

リポジトリ直下で `python -m pip install -r requirements.txt` を実行します。新規DBは `DB-deploy/deploy.sql`、既存のhewデータベースには `DB-deploy/upgrade-drawing.sql` を適用します。既存DB向けの更新では作品・取引データを保持します。変更前にDBをバックアップしてください。

`DATABASE_URL` はMariaDB接続先、`UPLOAD_FOLDER` は公開プレビュー・非公開原寸・レイヤーZIPの保存先です。`SECRET_KEY` には環境ごとの非公開値を設定してください。サンプル値のままならローカルのinstanceディレクトリに署名鍵を生成します。複数プロセスで公開する場合は共通の非公開鍵を設定してください。

`EVENT_START` と `EVENT_END` が登録・新規制作・出品・入札の受付時間を決めます。`APP_STOP` は利用者に案内するダウンロード終了予定時刻です。ローカル検証では環境変数で検証期間と専用DBを指定できます。日時はUTCオフセットを含むISO 8601形式です。

`python kakusyon/main.py` でローカル起動します。終了した競売を一括確定するコマンドは `python -m flask --app kakusyon/main.py close-auctions` です。開催中と終了後の最終精算時に実行してください。QR画像を別端末で開くには、その端末から到達できるHTTPSのURLで利用してください。
