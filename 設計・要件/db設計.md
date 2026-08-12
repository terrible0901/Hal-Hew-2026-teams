# DB設計書

## 1. 目的
この設計書は、HEW Ver0.5 の要件定義書をもとに、オークションサイトのデータベース構造を定義する。
Ver0.5 では、サイト上で絵を描いて出品し、入札・落札・通知を行う機能を中心に実装する。

対象範囲:
- ユーザー登録・ログイン
- 作品の出品
- オークションの開始・終了管理
- 入札履歴の記録
- 取引通知
- ポイント/課金履歴の管理

対象外:
- ライブ配信
- 配信画面・コメント
- 管理画面の高度な管理操作
- NFT発行
- タイムラプス・印刷機能

DB 前提:
- XAMPP で提供される MariaDB
- InnoDB 互換ストレージエンジン
- UTF8MB4

---

## 2. 設計方針
- 1ユーザーは複数の作品を出品できる
- 1作品は1つのオークションに紐づく
- 1オークションは複数の入札を持つ
- オークション終了時に最高額入札者を落札者とする
- 通知はユーザー単位で保持し、既読管理を行う
- ポイントや決済は履歴として記録し、残高整合性を担保する

命名規則:
- テーブル名: snake_case の複数形
- カラム名: snake_case
- 主キー: id
- 外部キー: {対象}_id
- 日時: created_at, updated_at

---

## 3. エンティティと関係
### 3.1 エンティティ
- users: ユーザー情報
- artworks: 出品作品情報
- auctions: オークション情報
- bids: 入札情報
- wallet_transactions: ポイント/課金履歴
- payment_intents: 外部決済トランザクション
- notifications: 通知情報

### 3.2 関係
- users 1 ──< artworks
- users 1 ──< auctions
- users 1 ──< bids
- users 1 ──< wallet_transactions
- users 1 ──< notifications
- artworks 1 ──1 auctions
- auctions 1 ──< bids
- auctions 1 ──0..1 payment_intents

---

## 4. テーブル定義

### 4.1 users
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PRIMARY KEY AUTO_INCREMENT | ユーザーID |
| username | VARCHAR(50) | NOT NULL UNIQUE | ユーザー名 |
| email | VARCHAR(255) | NULL UNIQUE | メールアドレス（任意） |
| password_hash | VARCHAR(255) | NOT NULL | パスワードハッシュ |
| role | ENUM('user','admin') | NOT NULL DEFAULT 'user' | 権限 |
| point_balance | INT UNSIGNED | NOT NULL DEFAULT 0 | 所持ポイント |
| is_active | BOOLEAN | NOT NULL DEFAULT TRUE | 有効フラグ |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 登録日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

インデックス:
- username UNIQUE
- email UNIQUE

---

### 4.2 artworks
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PRIMARY KEY AUTO_INCREMENT | 作品ID |
| seller_id | BIGINT UNSIGNED | NOT NULL FOREIGN KEY -> users(id) | 出品者ID |
| title | VARCHAR(200) | NOT NULL | 作品タイトル |
| description | TEXT | NULL | 作品説明 |
| image_path | VARCHAR(500) | NULL | 画像保存先 |
| status | ENUM('draft','listed','sold','cancelled') | NOT NULL DEFAULT 'draft' | 状態 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

インデックス:
- seller_id
- status

---

### 4.3 auctions
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PRIMARY KEY AUTO_INCREMENT | オークションID |
| artwork_id | BIGINT UNSIGNED | NOT NULL UNIQUE FOREIGN KEY -> artworks(id) | 作品ID |
| seller_id | BIGINT UNSIGNED | NOT NULL FOREIGN KEY -> users(id) | 出品者ID |
| start_price | INT UNSIGNED | NOT NULL | 開始価格 |
| current_price | INT UNSIGNED | NOT NULL | 現在価格 |
| reserve_price | INT UNSIGNED | NULL | 最低落札価格 |
| status | ENUM('scheduled','active','ended','cancelled') | NOT NULL DEFAULT 'scheduled' | 状態 |
| start_time | DATETIME | NULL | 開始日時 |
| end_time | DATETIME | NULL | 終了日時 |
| winner_id | BIGINT UNSIGNED | NULL FOREIGN KEY -> users(id) | 落札者ID |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

インデックス:
- artwork_id UNIQUE
- seller_id
- status
- end_time
- winner_id

---

### 4.4 bids
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PRIMARY KEY AUTO_INCREMENT | 入札ID |
| auction_id | BIGINT UNSIGNED | NOT NULL FOREIGN KEY -> auctions(id) | オークションID |
| bidder_id | BIGINT UNSIGNED | NOT NULL FOREIGN KEY -> users(id) | 入札者ID |
| bid_amount | INT UNSIGNED | NOT NULL | 入札額 |
| is_auto_bid | BOOLEAN | NOT NULL DEFAULT FALSE | 自動入札フラグ |
| bid_status | ENUM('pending','accepted','rejected') | NOT NULL DEFAULT 'pending' | 入札状態 |
| payment_intent_id | VARCHAR(255) | NULL | Stripe PaymentIntent ID |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 入札日時 |

インデックス:
- auction_id
- bidder_id
- auction_id, bid_amount

---

### 4.5 payment_intents
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PRIMARY KEY AUTO_INCREMENT | 決済ID |
| user_id | BIGINT UNSIGNED | NOT NULL FOREIGN KEY -> users(id) | 顧客ID |
| auction_id | BIGINT UNSIGNED | NULL FOREIGN KEY -> auctions(id) | 関連オークション |
| provider | ENUM('stripe') | NOT NULL DEFAULT 'stripe' | 決済サービス |
| provider_intent_id | VARCHAR(255) | NULL | 外部決済ID |
| amount | INT UNSIGNED | NOT NULL | 決済金額 |
| currency | VARCHAR(10) | NOT NULL DEFAULT 'JPY' | 通貨 |
| status | ENUM('pending','succeeded','failed','cancelled') | NOT NULL DEFAULT 'pending' | 決済状態 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP | 更新日時 |

インデックス:
- user_id
- auction_id
- provider_intent_id UNIQUE
- status

---

### 4.6 wallet_transactions
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PRIMARY KEY AUTO_INCREMENT | 取引ID |
| user_id | BIGINT UNSIGNED | NOT NULL FOREIGN KEY -> users(id) | ユーザーID |
| transaction_type | ENUM('charge','bid','refund','purchase','bonus') | NOT NULL | 取引種別 |
| amount | INT | NOT NULL | 取引額（正負） |
| balance_after | INT | NOT NULL | 取引後残高 |
| related_auction_id | BIGINT UNSIGNED | NULL FOREIGN KEY -> auctions(id) | 関連オークション |
| related_bid_id | BIGINT UNSIGNED | NULL FOREIGN KEY -> bids(id) | 関連入札 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 作成日時 |

インデックス:
- user_id
- related_auction_id
- related_bid_id

---

### 4.7 notifications
| カラム名 | 型 | 制約 | 説明 |
| --- | --- | --- | --- |
| id | BIGINT UNSIGNED | PRIMARY KEY AUTO_INCREMENT | 通知ID |
| user_id | BIGINT UNSIGNED | NOT NULL FOREIGN KEY -> users(id) | 対象ユーザー |
| notification_type | ENUM('bid_received','auction_ending','auction_won','auction_lost','payment_result') | NOT NULL | 通知種別 |
| title | VARCHAR(200) | NOT NULL | タイトル |
| message | TEXT | NOT NULL | 本文 |
| is_read | BOOLEAN | NOT NULL DEFAULT FALSE | 既読フラグ |
| related_auction_id | BIGINT UNSIGNED | NULL FOREIGN KEY -> auctions(id) | 関連オークション |
| related_bid_id | BIGINT UNSIGNED | NULL FOREIGN KEY -> bids(id) | 関連入札 |
| created_at | DATETIME | NOT NULL DEFAULT CURRENT_TIMESTAMP | 生成日時 |

インデックス:
- user_id, is_read, created_at
- related_auction_id

---

## 5. 制約と運用ルール
- uctions.start_price は 0 以上
- uctions.current_price は start_price 以上
- ids.bid_amount はオークションの現在価格以上
- uctions.status は scheduled → active → ended の遷移を想定
- ended 状態のオークションでは入札不可
- users.point_balance は負値を許容しない
- wallet_transactions.balance_after で残高整合性を検証
- 通知は入札受信、オークション終了、落札、課金結果などで生成する

---

## 6. ER概要
users
  1 ──< artworks
  1 ──< auctions
  1 ──< bids
  1 ──< wallet_transactions
  1 ──< notifications

artworks
  1 ──1 auctions

auctions
  1 ──< bids
