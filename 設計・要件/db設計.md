# DB設計書

## 1. 目的
HEW Ver0.5のオークションサイトに必要なデータベース構造を定義する。対象はユーザー登録・作品出品・オークション・入札・自動入札・ブックマーク・ポイント/決済・通知である。

対象外はライブ配信、コメント、管理画面の高度な管理、NFT、タイムラプス、印刷機能とする。

DB前提:
- MariaDB（XAMPP）、InnoDB、utf8mb4
- 時刻はUTCで保存し、画面表示時に日本時間へ変換する

## 2. 設計方針
- 1ユーザーは複数の作品・オークション・入札を持てる。
- 作品とオークションは1対1とし、再出品は許可しない。
- オークション終了時に落札入札・落札者・確定額を記録する。
- ポイント残高の変更は履歴と同一トランザクションで処理する。
- 取引履歴を保護するため、ユーザー・作品・オークションは原則として物理削除しない。

命名規則: テーブル名は複数形のsnake_case、主キーは`id`、外部キーは`{対象}_id`、日時は`created_at`、`updated_at`とする。

## 3. エンティティと関係
- users 1 ──< artworks, auctions, bids, auto_bid_settings, bookmarks, wallet_transactions, payment_intents, notifications
- artworks 1 ──1 auctions
- auctions 1 ──< bids, auto_bid_settings, bookmarks, payment_intents
- notifications 1 ──< notification_deliveries

## 4. テーブル定義

### 4.1 users
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | ユーザーID |
| username | VARCHAR(50) | NOT NULL, UNIQUE | ユーザー名 |
| email | VARCHAR(255) | NULL, UNIQUE | 任意のメールアドレス |
| password_hash | VARCHAR(255) | NOT NULL | パスワードハッシュ |
| role | ENUM('user','admin') | NOT NULL DEFAULT 'user' | 権限 |
| point_balance | INT UNSIGNED | NOT NULL DEFAULT 0 | 所持ポイント |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | 有効フラグ |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 登録日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

### 4.2 artworks
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 作品ID |
| seller_id | BIGINT UNSIGNED | NOT NULL, FK -> users(id) | 出品者ID |
| title | VARCHAR(200) | NOT NULL | 作品タイトル |
| description | TEXT | NULL | 作品説明 |
| image_path | VARCHAR(500) | NULL | 画像保存先 |
| status | ENUM('draft','listed','sold','cancelled') | NOT NULL DEFAULT 'draft' | 状態 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

インデックス: `(seller_id)`, `(status)`

### 4.3 auctions
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | オークションID |
| artwork_id | BIGINT UNSIGNED | NOT NULL, UNIQUE, FK -> artworks(id) | 作品ID。再出品を防止する |
| seller_id | BIGINT UNSIGNED | NOT NULL, FK -> users(id) | 出品者ID。artworks.seller_idと一致させる |
| start_price | INT UNSIGNED | NOT NULL | 開始価格 |
| current_price | INT UNSIGNED | NOT NULL | 現在価格 |
| reserve_price | INT UNSIGNED | NULL | 最低落札価格 |
| status | ENUM('scheduled','active','ended','cancelled') | NOT NULL DEFAULT 'scheduled' | 状態 |
| start_time | DATETIME | NULL | 開始日時 |
| end_time | DATETIME | NULL | 終了日時 |
| winner_id | BIGINT UNSIGNED | NULL, FK -> users(id) | 落札者ID |
| winner_bid_id | BIGINT UNSIGNED | NULL, UNIQUE, FK -> bids(id) | 落札を確定した入札ID |
| final_price | INT UNSIGNED | NULL | 確定落札額 |
| closed_reason | ENUM('time_expired','seller_finished','cancelled') | NULL | 終了理由 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

インデックス: `(seller_id)`, `(status, end_time)`, `(winner_id)`

### 4.4 bids
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 入札ID |
| auction_id | BIGINT UNSIGNED | NOT NULL, FK -> auctions(id) | オークションID |
| bidder_id | BIGINT UNSIGNED | NOT NULL, FK -> users(id) | 入札者ID |
| bid_amount | INT UNSIGNED | NOT NULL | 入札額 |
| is_auto_bid | BOOLEAN | NOT NULL DEFAULT FALSE | 自動入札による入札か |
| bid_status | ENUM('accepted','rejected') | NOT NULL | 入札状態 |
| payment_intent_id | BIGINT UNSIGNED | NULL, FK -> payment_intents(id) | 関連決済ID |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 入札日時 |

インデックス: `(auction_id, bid_amount, created_at)`, `(bidder_id, created_at)`

### 4.5 auto_bid_settings
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 自動入札設定ID |
| auction_id | BIGINT UNSIGNED | NOT NULL, FK -> auctions(id) | 対象オークションID |
| user_id | BIGINT UNSIGNED | NOT NULL, FK -> users(id) | 設定ユーザーID |
| max_amount | INT UNSIGNED | NOT NULL | 自動入札の上限額 |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | 有効フラグ |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 設定日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

インデックス: `UNIQUE(auction_id, user_id)`, `(auction_id, is_active)`

### 4.6 payment_intents
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 決済ID |
| user_id | BIGINT UNSIGNED | NOT NULL, FK -> users(id) | 顧客ID |
| auction_id | BIGINT UNSIGNED | NULL, FK -> auctions(id) | 関連オークション |
| provider | ENUM('stripe') | NOT NULL DEFAULT 'stripe' | 決済サービス |
| provider_intent_id | VARCHAR(255) | NULL, UNIQUE | Stripeの外部決済ID |
| amount | INT UNSIGNED | NOT NULL | 決済金額 |
| currency | VARCHAR(10) | NOT NULL DEFAULT 'JPY' | 通貨 |
| status | ENUM('pending','succeeded','failed','cancelled') | NOT NULL DEFAULT 'pending' | 決済状態 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

インデックス: `(user_id)`, `(auction_id)`, `(status)`

### 4.7 wallet_transactions
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 取引ID |
| user_id | BIGINT UNSIGNED | NOT NULL, FK -> users(id) | ユーザーID |
| transaction_type | ENUM('charge','bid','refund','purchase','bonus') | NOT NULL | 取引種別 |
| amount | INT | NOT NULL | 取引額。増加は正、減少は負 |
| balance_after | INT UNSIGNED | NOT NULL | 取引後残高 |
| related_auction_id | BIGINT UNSIGNED | NULL, FK -> auctions(id) | 関連オークション |
| related_bid_id | BIGINT UNSIGNED | NULL, FK -> bids(id) | 関連入札 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 作成日時 |

インデックス: `(user_id, created_at)`, `(related_auction_id)`, `(related_bid_id)`

### 4.8 notifications
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 通知ID |
| user_id | BIGINT UNSIGNED | NOT NULL, FK -> users(id) | 対象ユーザー |
| notification_type | ENUM('bid_received','auction_ending','auction_won','auction_lost','payment_result') | NOT NULL | 通知種別 |
| title | VARCHAR(200) | NOT NULL | タイトル |
| message | TEXT | NOT NULL | 本文 |
| is_read | BOOLEAN | NOT NULL DEFAULT FALSE | 既読フラグ |
| related_auction_id | BIGINT UNSIGNED | NULL, FK -> auctions(id) | 関連オークション |
| related_bid_id | BIGINT UNSIGNED | NULL, FK -> bids(id) | 関連入札 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 生成日時 |

インデックス: `(user_id, is_read, created_at)`, `(related_auction_id)`

### 4.9 bookmarks
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | ブックマークID |
| user_id | BIGINT UNSIGNED | NOT NULL, FK -> users(id) | 登録ユーザーID |
| auction_id | BIGINT UNSIGNED | NOT NULL, FK -> auctions(id) | 対象オークションID |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 登録日時 |

インデックス: `UNIQUE(user_id, auction_id)`, `(auction_id)`

### 4.10 notification_deliveries
メール通知の配信結果を記録する。アプリ内通知は`notifications`で管理し、メール送信の再試行・失敗確認は本テーブルで行う。

| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PK, AUTO_INCREMENT | 配信履歴ID |
| notification_id | BIGINT UNSIGNED | NOT NULL, FK -> notifications(id) | 対象通知ID |
| channel | ENUM('email') | NOT NULL DEFAULT 'email' | 配信チャネル |
| recipient | VARCHAR(255) | NOT NULL | 送信先メールアドレスのスナップショット |
| delivery_status | ENUM('pending','sent','failed') | NOT NULL DEFAULT 'pending' | 配信状態 |
| sent_at | DATETIME | NULL | 送信完了日時 |
| error_message | VARCHAR(500) | NULL | 失敗理由 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

インデックス: `(delivery_status, created_at)`, `(notification_id)`

## 5. 制約と運用ルール
- `auctions.start_price` は0以上、`current_price` は開始価格以上とする。
- `bids.bid_amount` は現在価格より大きい値とする。出品者本人の入札・自動入札設定は不可とする。
- オークションは `scheduled → active → ended`、または `scheduled / active → cancelled` と遷移する。終了・取消済みには入札不可とする。
- 落札時は`winner_id`、`winner_bid_id`、`final_price`を同一トランザクションで確定する。最低落札価格未満なら落札者・落札入札はNULLとする。
- 入札処理では対象`auctions`行と入札者`users`行を`SELECT ... FOR UPDATE`でロックし、最新価格・状態・残高を検証してから、入札・残高・履歴を同一トランザクションで更新する。
- ポイント残高の増減は`users.point_balance`更新と`wallet_transactions`追加を同一トランザクションで行い、残高は負にしない。
- 自動入札は`max_amount`の範囲内で処理し、同額上限なら設定日時が早いものを優先する。
- `bids.payment_intent_id`は内部IDを参照し、StripeのIDは`payment_intents.provider_intent_id`だけに保持する。
- 外部キーの削除動作は原則RESTRICTとする。削除の代わりに`is_active`または`status`で無効化する。
- 通知は`notifications`にアプリ内通知として保存する。メール通知の送信先・配信状態・送信日時は`notification_deliveries`に記録する。メールアドレス未登録のユーザーにはメール配信履歴を作成しない。
