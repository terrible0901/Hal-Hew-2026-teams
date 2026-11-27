IH22 接続前監査・全質問 / Pre-integration audit and all questions
2026-11-17

状態：未接続・コード/設定/DBの変更なし。ローカル版、IH22優先、レイアウト維持は回答済み。
調査範囲内で確認した51件をすべて記録。実行を伴う問題は承認後の検証で追加します。
Q番号はIH22仕様書内のQ番号とは別です。未回答は承認扱いにしません。
優先度Blockerは静的な接続障害の判定であり、実際のアプリ起動ログではありません。
根拠はC:/hal/IH22基準。work/で始まるパスは現フロントの作業ルート基準。
フロントルート：C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y

========================================================================
Q01 | 起動 / Startup | 接続を妨げる不整合

確認結果・影響：app/__init__.pyがhome.routesをimportしていますが、実ファイルはhome/route.pyです。認証ルートも初期化から読み込まれていません。

変更案・質問：実ファイルに合わせたimport修正と、認証を含むルート登録を行ってよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/__init__.py:10
  - C:/hal/IH22/kakusyon/app/home/route.py:9
  - C:/hal/IH22/kakusyon/app/auth/routes.py:13

回答：
はい
========================================================================
Q02 | 起動 / Startup | 接続を妨げる不整合

確認結果・影響：ホームとお気に入りはcommon.session/request/render_template/redirect/url_forを使いますが、common.pyはそれらを公開していません。

変更案・質問：Flaskの参照元を正しく整理し、未定義参照を修正してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/home/route.py:13
  - C:/hal/IH22/kakusyon/app/home/route.py:41
  - C:/hal/IH22/kakusyon/app/home/route.py:45
  - C:/hal/IH22/kakusyon/app/favorites/routes.py:12
  - C:/hal/IH22/kakusyon/app/favorites/routes.py:24
  - C:/hal/IH22/kakusyon/app/common.py:7

回答：
yes
========================================================================
Q03 | 画面配信 / Page serving | 接続を妨げる不整合

確認結果・影響：Flaskの既定のtemplate/static探索先と実フォルダー配置が一致しません。kakusyon/templates/index.htmlとルートtemplates/index.htmlは0バイトで、呼び出している各画面テンプレートもありません。

変更案・質問：今のページ別HTML/CSS/JSをFlaskから同一オリジン配信し、見た目を再作成せず接続する案でよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/common.py:10
  - C:/hal/IH22/kakusyon/templates/index.html
  - templates/index.html
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:14
  - C:/hal/IH22/kakusyon/app/auth/routes.py:94
  - C:/hal/IH22/kakusyon/app/auctions/routes.py:43

回答：
template/static配置を修正、htmlファイルの中身は空ファイルのままで必要なファイルだけ作成
========================================================================
Q04 | API契約 / API contract | 接続を妨げる不整合

確認結果・影響：既存バックエンドはフォーム・HTML・リダイレクト中心で、現在のフロント用の一覧/本人情報/残高などのJSON APIがありません。

変更案・質問：既存処理の意味を保ち、必要なJSON APIと統一エラー形式を追加してよいですか？ URL・入力・応答は変更案で確定します。

根拠：
  - C:/hal/IH22/kakusyon/app/home/route.py:9
  - C:/hal/IH22/kakusyon/app/auth/routes.py:13
  - C:/hal/IH22/kakusyon/app/auctions/routes.py:46
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/local-storage.js:1552
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/account-identity.js:1952

回答：
はい、ただ実装前に作成する内容とロジックを表示し、許可を求めてください
========================================================================
Q05 | 依存・実行環境 / Dependencies | 重要な未実装・不整合

確認結果・影響：PATHのPythonは3.13.3で、READMEは3.14.6です。このPythonでは指定35依存中25件が未インストール、4件が指定版と不一致、6件が一致しました。別の仮想環境は未検証です。

変更案・質問：使用するPython/仮想環境をどれにしますか？ 既存環境を変更せず専用仮想環境へ依存を入れる案でよいですか？

根拠：
  - C:/hal/IH22/readme.md:5
  - C:/hal/IH22/requireiments.txt
  - 環境確認: python --version / py -0p / importlib.metadata

回答：
3.14.10へ統一します
========================================================================
Q06 | 依存・実行環境 / Dependencies | 重要な未実装・不整合

確認結果・影響：common.pyはmysql.connectorを使用しますが、requireiments.txtにはmysql-connector-pythonがありません。現在のPATH環境には9.5.0がありますが、新規構築時に再現できる定義ではありません。依存ファイル名も通常のrequirements.txtとは異なります。

変更案・質問：不足依存を明記し、requireiments.txtという現名を維持するか、手順と合わせて名称を正すか決めてよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/common.py:8
  - C:/hal/IH22/requireiments.txt

回答：
requirements.txtにmysqlconnectorを追記します
========================================================================
Q07 | DB・登録 / DB and registration | 接続を妨げる不整合

確認結果・影響：仕様はメール不使用ですがusers.emailはNOT NULLです。登録INSERTはemailを渡さず、復旧コードのハッシュ・使用済み状態・再発行情報もありません。

変更案・質問：IH22仕様に合わせるメール必須制約の見直しと復旧コード構造の追加を、既存データを保持する移行として作ってよいですか？

根拠：
  - C:/hal/IH22/DB-deploy/deploy.sql:10
  - C:/hal/IH22/kakusyon/app/auth/routes.py:40
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:9

回答：
mail不使用に統一
仕様決定事項-2026-10-26.mdを参照
========================================================================
Q08 | 出品SQL / Listing SQL | 接続を妨げる不整合

確認結果・影響：作品INSERTのartist/descriptはSQL定義のartist_id/descriptionと一致せず、必須category/draw_timeも渡していません。

変更案・質問：ログイン中の作者ID、カテゴリー、制作情報を使う正しいINSERTへ変更してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:45
  - C:/hal/IH22/DB-deploy/deploy.sql:21
  - C:/hal/IH22/DB-deploy/deploy.sql:23
  - C:/hal/IH22/DB-deploy/deploy.sql:24
  - C:/hal/IH22/DB-deploy/deploy.sql:26

回答：
はい
========================================================================
Q09 | 出品SQL / Listing SQL | 接続を妨げる不整合

確認結果・影響：競売INSERTは列3個に値4個で、列一覧にartwork_idがありません。価格と終了時刻だけquery、その他はformという混在もあります。

変更案・質問：列・値を修正し、開催時間はIH22の選択値からサーバーで終了時刻を計算する入力契約へ統一してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:34
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:47

回答：未回答 / 承認待ち

========================================================================
Q10 | ホームSQL / Home SQL | 重要な未実装・不整合

確認結果・影響：ホームのbids.user_id参照は、実SQLのbidder_idと不一致です。params=(user_id)も単一要素タプルになっていません。

変更案・質問：カラム名と引数の渡し方を修正してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/home/route.py:29
  - C:/hal/IH22/kakusyon/app/home/route.py:32
  - C:/hal/IH22/DB-deploy/deploy.sql:71

回答：未回答 / 承認待ち

========================================================================
Q11 | ID・履歴 / IDs and history | 重要な未実装・不整合

確認結果・影響：入札・お気に入りはart_idをauction_idとして使っています。再出品を含む仕様では作品と競売は別IDであり、フロントの文字列slugとも直接一致しません。

変更案・質問：作品ID・競売ID・既存slugの対応を定義し、APIと画面遷移で明示的に変換してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/auctions/routes.py:48
  - C:/hal/IH22/kakusyon/app/favorites/routes.py:13
  - C:/hal/IH22/DB-deploy/deploy.sql:20
  - C:/hal/IH22/DB-deploy/deploy.sql:40
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/owner-artwork-additions.js:32

回答：未回答 / 承認待ち
はい
========================================================================
Q12 | DB制約 / DB constraints | 接続を妨げる不整合

確認結果・影響：bids.auction_idのUNIQUEにより同じ競売に2件目の入札を保存できません。

変更案・質問：複数入札履歴を保存できる制約・索引へ変更してよいですか？

根拠：
  - C:/hal/IH22/DB-deploy/deploy.sql:70

回答：未回答 / 承認待ち
はい
========================================================================
Q13 | DB制約 / DB constraints | 重要な未実装・不整合

確認結果・影響：auctions.artwork_idのUNIQUEにより、過去の競売を残して同じ作品を再出品できません。

変更案・質問：過去履歴を保持し、同時開催だけ最大1件に制限する設計へ移行してよいですか？

根拠：
  - C:/hal/IH22/DB-deploy/deploy.sql:41
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:73

回答：未回答 / 承認待ち
はい
========================================================================
Q14 | お気に入り / Favorites | 重要な未実装・不整合

確認結果・影響：conn.commitに括弧がなくコミットしていません。解除・一覧APIもなく、競売お気に入りと作品お気に入りを分ける仕様に未対応です。

変更案・質問：コミットを修正し、重複防止・登録/解除・本人一覧を追加してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/favorites/routes.py:20
  - C:/hal/IH22/DB-deploy/deploy.sql:208
  - C:/hal/IH22/DB-deploy/deploy.sql:245

回答：未回答 / 承認待ち
はい
========================================================================
Q15 | 画像HTTP契約 / Upload contract | 重要な未実装・不整合

確認結果・影響：/upload_imageはGET定義ですがtest.jsはPOSTします。test.js内のdataUrlもこのファイル内では定義されていません。自動テストではありません。

変更案・質問：正式保存用のPOST契約へ統一し、断片的なテスト用JSを実際の描画データ送信へ置き換えてよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/services/image_service.py:20
  - C:/hal/IH22/kakusyon/app/artworks/test.js:2
  - C:/hal/IH22/kakusyon/app/artworks/test.js:8

回答：未回答 / 承認待ち
はい
========================================================================
Q16 | 画像保存先 / Upload storage | 重要な未実装・不整合

確認結果・影響：説明はkakusyon/artですが、コードはkakusyon/app/services/artへ保存し、import時にフォルダーを作ります。公開画像と原寸データを分ける構成もありません。

変更案・質問：保存先を設定化し、起動時の明示的な初期化と公開/非公開領域の分離を行ってよいですか？

根拠：
  - C:/hal/IH22/kakusyon/art/README.md:1
  - C:/hal/IH22/kakusyon/app/services/image_service.py:12
  - C:/hal/IH22/kakusyon/app/services/image_service.py:13

回答：未回答 / 承認待ち
はい
========================================================================
Q17 | 失敗時整合性 / Failure consistency | 重要な未実装・不整合

確認結果・影響：画像をDB保存前に書き込み、SQL失敗時に孤立画像が残ります。例外時はcursor/connectionを閉じる行にも到達しません。

変更案・質問：一時保存・確定・失敗時後始末と、DB接続の確実な終了を追加してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:40
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:48
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:52

回答：未回答 / 承認待ち
はい
========================================================================
Q18 | 画像検証・権限 / Image validation and access | 重要な未実装・不整合

確認結果・影響：画像は申告MIMEだけで判定し、PNGの実体・寸法・容量を検証していません。/drawings/<filename>は認可確認なしで原本を返します。

変更案・質問：実PNG検証と、作者・落札確定済み落札者だけの原寸取得を実装してよいですか？ 公開プレビューは別データにします。

根拠：
  - C:/hal/IH22/kakusyon/app/services/image_service.py:10
  - C:/hal/IH22/kakusyon/app/services/image_service.py:25
  - C:/hal/IH22/kakusyon/app/services/image_service.py:38

回答：未回答 / 承認待ち
はい
========================================================================
Q19 | 認証・設定 / Authentication and configuration | 重要な未実装・不整合

確認結果・影響：セッション鍵とDB接続設定がコード内にあり、config/extensionsは説明のみです。.envの読込と除外設定も未実装です。設定値は報告に転載しません。

変更案・質問：設定値を環境設定へ分離し、秘密を含まない設定例と適切なCookie設定を追加してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/common.py:12
  - C:/hal/IH22/kakusyon/app/common.py:14
  - C:/hal/IH22/kakusyon/app/config.py:1
  - C:/hal/IH22/kakusyon/app/extensions.py:1
  - C:/hal/IH22/.gitignore:1

回答：未回答 / 承認待ち
はい
========================================================================
Q20 | 操作権限 / Mutation authorization | 重要な未実装・不整合

確認結果・影響：出品・入札・お気に入りに、ログイン必須・所有権・有効ユーザー・管理者権限・CSRFの検証が不足しています。CORSの明示設定もありません。

変更案・質問：同一オリジンを基本にし、セッション/CSRF/権限検証を追加してよいですか？ 別オリジンが必要な場合は許可先を個別に確認します。

根拠：
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:29
  - C:/hal/IH22/kakusyon/app/auctions/routes.py:46
  - C:/hal/IH22/kakusyon/app/favorites/routes.py:10
  - C:/hal/IH22/kakusyon/app/extensions.py:1

回答：未回答 / 承認待ち
はい
========================================================================
Q21 | 入力検証 / Input validation | 重要な未実装・不整合

確認結果・影響：ユーザー名・パスワードの長さや欠落、数値の整数/範囲、期限、自己入札等をサーバーで十分検証していません。

変更案・質問：IH22仕様とDB長に沿う入力検証・日本語/英語で整理したエラー契約を追加してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/auth/routes.py:16
  - C:/hal/IH22/kakusyon/app/auth/routes.py:71
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:31
  - C:/hal/IH22/kakusyon/app/auctions/routes.py:48

回答：未回答 / 承認待ち
はい
========================================================================
Q22 | 競売・残高 / Auction and balances | 接続を妨げる不整合

確認結果・影響：入札処理はbidsへのINSERTだけで、現在価格・残高・前最高入札者への返還・履歴を更新しません。ロック、確認後の価格変更検知、差額消費もありません。

変更案・質問：入札・差額消費・返還・履歴・価格を同一トランザクションで更新する処理を実装してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/auctions/routes.py:48
  - C:/hal/IH22/kakusyon/app/services/auction_service.py:1
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:44

回答：未回答 / 承認待ち
はい
========================================================================
Q23 | 落札・定期処理 / Settlement and jobs | 重要な未実装・不整合

確認結果・影響：終了処理・未落札判定・出品者への全額加算・落札者ダウンロード許可・再実行の重複防止・定期CLIは未実装です。

変更案・質問：IH22の終了確定処理と、ローカルの手動検証用CLIを実装してよいですか？ OSの定期タスク登録は別途承認とします。

根拠：
  - C:/hal/IH22/kakusyon/app/services/auction_service.py:1
  - C:/hal/IH22/kakusyon/app/commands.py:1
  - C:/hal/IH22/docs/関数定義.md:280

回答：未回答 / 承認待ち

========================================================================
Q24 | 自動入札 / Automatic bidding | 重要な未実装・不整合

確認結果・影響：設定直後判定、1pt刻み、同額なら先設定優先、上限変更/停止、残高不足で停止/通知といった自動入札の実処理がありません。

変更案・質問：初回接続に自動入札まで含めますか？ 含める場合は手動入札と同じトランザクション方針で実装してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/services/auction_service.py:1
  - C:/hal/IH22/docs/関数定義.md:150
  - C:/hal/IH22/DB-deploy/deploy.sql:99

回答：未回答 / 承認待ち

========================================================================
Q25 | 取消・再出品 / Cancellation and relisting | 重要な未実装・不整合

確認結果・影響：本人の条件付き取消、管理者の理由付き取消、未返還額の返還、再出品、非公開/公開復帰と監査は説明のみです。

変更案・質問：これらの追加仕様を今回の接続範囲に含めますか？ 基本取引を先に完成させる段階分けでよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/services/cancellation_service.py:1
  - C:/hal/IH22/kakusyon/app/admin/routes.py:1
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:68

回答：未回答 / 承認待ち

========================================================================
Q26 | 描画セッション / Drawing sessions | 重要な未実装・不整合

確認結果・影響：サーバー管理の開始・期限・完成固定・60秒保存猶予を扱うAPI/DBがありません。draw_timeはshort/mid/longで10/30/60/300秒と不一致です。

変更案・質問：制作セッションを新設し、見た目を保って時間選択をIH22値へ合わせてよいですか？

根拠：
  - C:/hal/IH22/DB-deploy/deploy.sql:26
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:18
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:18
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/drawing-settings-data.js:459

回答：未回答 / 承認待ち

========================================================================
Q27 | 途中復元 / Draft recovery | 重要な未実装・不整合

確認結果・影響：現フロントの内部キャンバス900×900px、完成保存600×600px白背景JPEG、最大4レイヤー、履歴12操作または48MiBは、IH22の1024×1024px・PNG・10レイヤー・全体50操作と異なります。完成時sessionStorage中心で、ペンアップ/レイヤー操作ごとのIndexedDB復元も未実装です。

変更案・質問：キャンバス内部解像度/履歴/保存方式をIH22へ変更し、表示領域の外観と配置を維持する案でよいですか？

根拠：
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:18
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/html/drawing-canvas.html:1254
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/drawing-engine.js:890
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/drawing-engine.js:1223
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/drawing-engine.js:2786
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/pages/drawing-canvas.js:7743
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/pages/drawing-canvas.js:7819

回答：未回答 / 承認待ち

========================================================================
Q28 | 正式保存 / Final artifact saving | 重要な未実装・不整合

確認結果・影響：PNGと全レイヤーZIPの両保存成功を正式保存とする処理、下書き保存状態・保存固定・再送の重複防止がありません。5MiBのリクエスト全体上限もPNG+ZIP送信とは整合しません。

変更案・質問：保存状態とレイヤーZIP処理を追加し、個別/展開後容量とHTTP上限を分けて設計してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/services/image_service.py:10
  - C:/hal/IH22/kakusyon/app/artworks/routes.py:36
  - C:/hal/IH22/DB-deploy/deploy.sql:25
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:30

回答：未回答 / 承認待ち

========================================================================
Q29 | 下書き・モデル / Drafts and models | 重要な未実装・不整合

確認結果・影響：8モデル、設定/拡張初期化/CLIと主要5サービスはコメントのみです。画像なし下書き、正式保存、復旧コード、ボーナス、通知等のモデル/APIも足りません。空のパッケージ__init__.py自体は必ずしも不具合ではありません。

変更案・質問：設計の説明を実装済みと扱わず、機能別に実コードを補完する範囲を承認いただけますか？

根拠：
  - C:/hal/IH22/kakusyon/app/models/*.py:1
  - C:/hal/IH22/kakusyon/app/config.py:1
  - C:/hal/IH22/kakusyon/app/extensions.py:1
  - C:/hal/IH22/kakusyon/app/commands.py:1
  - C:/hal/IH22/kakusyon/app/services/auction_service.py:1

回答：未回答 / 承認待ち

========================================================================
Q30 | DBアクセス設計 / DB access architecture | 仕様・運用の確認

確認結果・影響：現コードはmysql.connectorによるSQL直書きですが、依存/設計にはSQLAlchemy・Flask-Migrate・Application Factory/Blueprintがあり、構成が未統一です。

変更案・質問：既存SQLを活かした最小修正と、IH22設計のORM/マイグレーション構成への整理のどちらで進めますか？

根拠：
  - C:/hal/IH22/kakusyon/app/common.py:8
  - C:/hal/IH22/kakusyon/app/models/user.py:1
  - C:/hal/IH22/docs/ロジック-ファイル構造.md:7
  - C:/hal/IH22/requireiments.txt:16

回答：未回答 / 承認待ち

========================================================================
Q31 | 既存DB・移行 / Existing DB and migrations | 仕様・運用の確認

確認結果・影響：実DBは未接続・未確認です。deploy.sqlは新規CREATEであり差分移行ではなく、既存テーブルへ再実行すると失敗し得ます。マイグレーションもありません。

変更案・質問：既存hewには触れず、新しい専用開発DBで検証してよいですか？ 既存データを使う場合は接続先とバックアップ方針を指定してください。秘密値はチャットへ貼らないでください。

根拠：
  - C:/hal/IH22/DB-deploy/deploy.sql:1
  - C:/hal/IH22/DB-deploy/deploy.sql:5
  - C:/hal/IH22/docs/db設計.md:6

回答：未回答 / 承認待ち

========================================================================
Q32 | DB実行条件 / DB runtime assumptions | 仕様・運用の確認

確認結果・影響：SQLにInnoDB/utf8mb4/UTCの指定がなく、実DBサーバーのバージョン・設定も未検証です。MariaDBクライアント10.4.32とXAMPP管理プログラムの存在だけ確認しました。

変更案・質問：専用DBのエンジン・文字コード・UTC保存を明示し、承認後に接続/トランザクション検証を行ってよいですか？

根拠：
  - C:/hal/IH22/DB-deploy/deploy.sql:1
  - C:/hal/IH22/docs/db設計.md:30
  - C:/hal/IH22/kakusyon/app/common.py:14

回答：未回答 / 承認待ち

========================================================================
Q33 | DB関係・金額 / DB relationships and amounts | 仕様・運用の確認

確認結果・影響：wallet_transactions.artist_idはusers.idではなくartworks.artist_idを参照します。残高/入札はUNSIGNED、履歴amountはSIGNEDで範囲も異なります。勝者・落札入札・対象競売の整合も別途検証が必要です。

変更案・質問：作者IDの意味をusers.idへの関係として整理してよいですか？ 以前の1億上限をptにも維持するか、IH22側の上限を別途定めますか？

根拠：
  - C:/hal/IH22/DB-deploy/deploy.sql:13
  - C:/hal/IH22/DB-deploy/deploy.sql:48
  - C:/hal/IH22/DB-deploy/deploy.sql:72
  - C:/hal/IH22/DB-deploy/deploy.sql:152
  - C:/hal/IH22/DB-deploy/deploy.sql:154
  - C:/hal/IH22/DB-deploy/deploy.sql:166

回答：未回答 / 承認待ち

========================================================================
Q34 | 通知 / Notifications | 重要な未実装・不整合

確認結果・影響：通知一覧/既読APIと生成処理がなく、通知種別が取消・未落札・自動入札停止等を網羅しません。旧メール配送・決済結果テーブルも残っています。

変更案・質問：アプリ内通知に合わせて追加し、旧テーブルはデータ保持のうえ不使用化する案でよいですか？

根拠：
  - C:/hal/IH22/DB-deploy/deploy.sql:184
  - C:/hal/IH22/DB-deploy/deploy.sql:226
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:92

回答：未回答 / 承認待ち

========================================================================
Q35 | ポイント・仮値 / Points and provisional values | 仕様・運用の確認

確認結果・影響：残高取得・取引履歴・登録/初出品/正式保存ボーナスは未実装です。1000/300/100ptや回数条件はIH22でも仮値です。Ver0.5はテスト決済を含むチャージ実行なしで、現フロントの疑似購入と異なります。

変更案・質問：仮ボーナス値を当面採用してよいですか？ 購入パネルの配置は残し、加算できる疑似購入を未提供表示へ変えてよいですか？

根拠：
  - C:/hal/IH22/readme.md:9
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:55
  - C:/hal/IH22/docs/関数定義.md:164
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/coin-wallet.js:1408

回答：未回答 / 承認待ち

========================================================================
Q36 | 認証UIの対応 / Authentication UI mapping | 仕様・運用の確認

確認結果・影響：既存のメール認証・Googleボタン・メール変更/再設定画面はIH22のユーザー名＋復旧コード仕様と異なります。画面配置維持の条件があります。

変更案・質問：入力欄の位置・カード形状を保ち、ラベル/入力内容をユーザー名・復旧コードへ置き換え、Google/メール操作は実行不可にする案でよいですか？

根拠：
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:9
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/account-identity.js:1443
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/account-identity.js:2157
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/account-identity.js:3582

回答：未回答 / 承認待ち

========================================================================
Q37 | 表記・即決 / Labels and buy-now | 仕様・運用の確認

確認結果・影響：IH22はpt、現フロントはCです。IH22の確定事項には現在の即決価格/即決落札が明記されていません。最低落札価格を使わないことと即決価格は別の論点です。

変更案・質問：表記はptへ統一してよいですか？ 即決機能は残す追加仕様としますか、それとも当面無効にしますか？ 配置は維持します。

根拠：
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:41
  - C:/hal/IH22/docs/関数定義.md:145
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/auction-policy.js

回答：未回答 / 承認待ち

========================================================================
Q38 | 開催・出品時間 / Event and auction timing | 仕様・運用の確認

確認結果・影響：イベント開催・終了・停止日時の実設定がありません。既存フロントの出品期限も、IH22の5/10/15/20分とイベント内に収めるルールへ接続していません。

変更案・質問：ローカル検証用の開催日時をどう設定しますか？ 日付未確定なら検証専用の相対時刻設定を用意してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/config.py:1
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:39
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:104

回答：未回答 / 承認待ち

========================================================================
Q39 | 検索・公開状態 / Search and visibility | 重要な未実装・不整合

確認結果・影響：ホームは終了前の競売を列挙するだけで、作品の公開状態/取消履歴/タグAND検索を十分扱いません。検索ルートとタグサービスも説明のみです。

変更案・質問：現在の一覧配置を保ち、公開状態と履歴/タグ条件を正しく取得するAPIへ変更してよいですか？ タグ入力の追加場所は別途確認します。

根拠：
  - C:/hal/IH22/kakusyon/app/home/route.py:69
  - C:/hal/IH22/kakusyon/app/search/routes.py:1
  - C:/hal/IH22/kakusyon/app/services/tag_service.py:1

回答：未回答 / 承認待ち

========================================================================
Q40 | 制作配信 / Production streaming | 仕様・運用の確認

確認結果・影響：配信ルート/サービス/モデルは説明のみで、映像転送方式、共有範囲、切断検知方式/秒数はIH22文書でも未決です。前のフロントも実配信ではありません。

変更案・質問：初回は配信の実接続を別工程にしてよいですか？ 実装する場合、何を共有し、どの方式/切断判定にするか指定してください。

根拠：
  - C:/hal/IH22/kakusyon/app/streams/routes.py:1
  - C:/hal/IH22/kakusyon/app/services/stream_service.py:1
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:89

回答：未回答 / 承認待ち

========================================================================
Q41 | コメント・監査 / Comments and audit | 重要な未実装・不整合

確認結果・影響：コメント投稿/公開履歴、200文字/3秒制限、本人削除、配信者/管理者非表示、暦月1か月での本文消去と監査は未実装です。DB定義もありません。

変更案・質問：配信方式決定前にコメント/監査の業務APIを先行実装しますか、それとも配信工程と一緒にしますか？

根拠：
  - C:/hal/IH22/kakusyon/app/comments/routes.py:1
  - C:/hal/IH22/kakusyon/app/services/comment_service.py:1
  - C:/hal/IH22/kakusyon/app/models/stream_comment.py:1
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:80

回答：未回答 / 承認待ち

========================================================================
Q42 | QR・画像共有 / QR and sharing | 仕様・運用の確認

確認結果・影響：現QRはWorker/D1またはローカルSQLiteの別APIで、IH22には対応APIがありません。既存の匿名JPEG共有と、IH22の原寸PNG/ZIP取得権限を混同できません。

変更案・質問：QRは公開プレビューだけの共有として残しますか？ 原寸データの取得はIH22の作者/落札者認可に従う案でよいですか？ ローカルQRは別スマホへ自動到達しません。

根拠：
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/qr-save-client.js:1638
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/server/qr-save-api.js
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:33
  - C:/hal/IH22/kakusyon/app/services/image_service.py:38

回答：未回答 / 承認待ち

========================================================================
Q43 | 既存作品・データ移行 / Existing data migration | 仕様・運用の確認

確認結果・影響：フロントの作品ID/作者/保存形式はブラウザーや同梱データにあり、MariaDBの数値ID/ユーザー/1024px PNGとは別です。既存絵の作者アカウント対応や旧C残高の正当性は自動判断できません。

変更案・質問：最初は既存作品を表示用に保持し、新しいDBへ自動移行しない案でよいですか？ 移行する場合は作者対応と取込対象を指定してください。

根拠：
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/local-storage.js:1552
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/owner-artwork-additions.js:32
  - C:/hal/IH22/DB-deploy/deploy.sql:20
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:18

回答：未回答 / 承認待ち

========================================================================
Q44 | 未定の補助機能 / Additional frontend features | 仕様・運用の確認

確認結果・影響：現フロントのプロフィール画像・自己紹介・通知設定・閲覧履歴など、IH22にAPI/データ定義がない項目があります。削除するか追加実装するかは勝手に決めません。

変更案・質問：配置を保ち、これらを端末内の補助機能として残しますか？ 本人情報をサーバーで管理する項目はどれですか？

根拠：
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/account-identity.js:2585
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/account-identity.js:2850
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/account-identity.js:3311
  - C:/hal/IH22/kakusyon/app/models/user.py:1

回答：未回答 / 承認待ち

========================================================================
Q45 | 表示・更新 / Presentation and refresh | 重要な未実装・不整合

確認結果・影響：価格/入札/通知3秒以内、コメント約1秒の更新目標に対する通信・再接続・負荷検証がありません。サーバー状態を画面へ反映する取得層が必要です。

変更案・質問：画面の配置を変えず、初回はポーリングで状態を更新する案を検証してよいですか？ 配信映像方式とは別に扱います。

根拠：
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:88
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/javascript/features/live-viewer.js
  - C:/hal/IH22/kakusyon/app/streams/routes.py:1

回答：未回答 / 承認待ち

========================================================================
Q46 | テスト・検証 / Tests and verification | 重要な未実装・不整合

確認結果・影響：バックエンドに自動テスト一式・専用DB構成がありません。既存のフロントテストや過去の成功記録はFlask/MariaDB接続の成功を示しません。今回、実DB接続・起動・ブラウザー検証は未実施です。

変更案・質問：承認された専用環境で、認証・保存・入札/返還・落札・権限・競合・再送・PC/スマホのテストを追加して実行してよいですか？

根拠：
  - C:/hal/IH22/kakusyon/app/artworks/test.js:1
  - C:/hal/IH22/docs/ロジック-ファイル構造.md:136
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/exports/vanilla-ver20261104.2/stage-checks-4.json

回答：未回答 / 承認待ち

========================================================================
Q47 | 原本保護 / Source preservation | 仕様・運用の確認

確認結果・影響：IH22には多数の既存ステージ済み変更があります。フロントは『はじめの状態』を固定保存済みです。両原本への上書きやGitリセットは行っていません。

変更案・質問：元IH22と元フロントを変更せず、別のローカル接続用コピーで承認済み変更を行う案でよいですか？

根拠：
  - C:/hal/IH22: git status --porcelain
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/baselines/initial-state.json
  - work/site: git status --porcelain

回答：未回答 / 承認待ち

========================================================================
Q48 | レイアウトと新機能 / Layout and new functions | 仕様・運用の確認

確認結果・影響：復旧コード、下書き、レイヤーZIP取得、自動入札、再出品などの必要操作には現在の画面に専用入口がないものがあります。単に既存UIへ隠しても機能は使えません。

変更案・質問：既存カード・欄・ポップアップの範囲で入口を置き換える方針でよいですか？ 新規画面や配置変更が必要な箇所は都度案を提示します。

根拠：
  - C:/hal/IH22/docs/関数定義.md:82
  - C:/hal/IH22/docs/関数定義.md:102
  - C:/hal/IH22/docs/関数定義.md:150
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/html/account-auth.html
  - C:/Users/saeki.yusuke.50169/Documents/Codex/2026-09-04/y/work/site/html/account-trades.html

回答：未回答 / 承認待ち

========================================================================
Q49 | 文書・仕様の整合 / Documentation consistency | 資料・監査環境の確認

確認結果・影響：README等の設計・要件/リンクは実docs/配置と異なります。Ver0.5単体の記述と追加仕様の対象範囲にも差があり、仕様決定事項が優先であることを明記する必要があります。

変更案・質問：実装に合わせた日本語/英語の起動・仕様・API文書を更新し、旧設計記録は削除せず区別してよいですか？

根拠：
  - C:/hal/IH22/readme.md:13
  - C:/hal/IH22/kakusyon/main.py:4
  - C:/hal/IH22/docs/要件定義書.md:81
  - C:/hal/IH22/docs/仕様決定事項-2026-10-26.md:3

回答：未回答 / 承認待ち

========================================================================
Q50 | 動作確認環境・公開 / Runtime and publication | 仕様・運用の確認

確認結果・影響：MySQL/Flaskの対象ポートで待受は取得されませんでしたが、別ポート・別環境は未確認です。今回はローカル先行と回答済みで、既存公開サイトへは反映していません。

変更案・質問：使用するDB接続先とローカルポートを指定できますか？ 起動が必要なサービスは、修正案承認後に起動してよいですか？

根拠：
  - 環境確認: Get-NetTCPConnection (3306,5000,4173,4195)
  - ユーザー回答: まずPC内のローカル版

回答：未回答 / 承認待ち

========================================================================
Q51 | 監査時の環境 / Audit environment | 資料・監査環境の確認

確認結果・影響：追加のGit確認で、フロントの元リポジトリにdubious ownership（所有者相違）エラーが実際に出ました。グローバル設定を変更せず、対象パスだけを指定した一回限りの読取確認へ切り替えます。

変更案・質問：今後もグローバルGit設定を変えず、対象パスに限定したコマンド単位の読取確認を使う方針でよいですか？ 所有者の変更は行いません。

根拠：
  - work/site/.git (git status: detected dubious ownership)

回答：未回答 / 承認待ち

