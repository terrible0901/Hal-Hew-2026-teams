# ER図

`db設計.md` を正とし、`画面遷移図-memo.md` の画面操作も対応付けたHEW Ver0.5のER図です。メールアドレス認証、下書き保存後の出品、商品詳細画面内の入札、ポイントの即時減算・返却を含みます。作品とオークションは再出品なしの1対1です。

```mermaid
erDiagram
    USERS ||--o{ ARTWORKS : "下書きを作成・出品する"
    USERS ||--o{ BIDS : "商品詳細で入札する"
    USERS o|--o{ AUCTIONS : "落札者となる"
    USERS ||--o{ AUTO_BID_SETTINGS : "自動入札を設定する"
    USERS ||--o{ BOOKMARKS : "登録する"
    USERS ||--o{ ARTWORK_BOOKMARKS : "作品をお気に入り登録する"
    USERS ||--o{ PAYMENT_INTENTS : "決済する"
    USERS ||--o{ WALLET_TRANSACTIONS : "ポイントを消費・返却する"
    USERS ||--o{ NOTIFICATIONS : "受信する"

    ARTWORKS ||--o| AUCTIONS : "出品設定完了時に1件作成"
    ARTWORKS ||--o{ ARTWORK_BOOKMARKS : "お気に入り登録される"
    ARTWORKS ||--o{ ARTWORK_TAGS : "タグ付けされる"
    TAGS ||--o{ ARTWORK_TAGS : "作品に付与される"
    AUCTIONS ||--o{ BIDS : "入札を受ける"
    AUCTIONS ||--o{ AUTO_BID_SETTINGS : "自動入札設定を持つ"
    AUCTIONS ||--o{ BOOKMARKS : "ブックマークされる"
    AUCTIONS ||--o{ PAYMENT_INTENTS : "決済に関連する"
    AUCTIONS ||--o{ WALLET_TRANSACTIONS : "ポイント取引に関連する"
    AUCTIONS ||--o{ NOTIFICATIONS : "通知に関連する"
    BIDS ||--o{ WALLET_TRANSACTIONS : "ポイント取引に関連する"
    BIDS ||--o{ NOTIFICATIONS : "通知に関連する"
    PAYMENT_INTENTS ||--o{ BIDS : "入札に関連する"
    NOTIFICATIONS ||--o{ NOTIFICATION_DELIVERIES : "メール配信する"

    USERS {
        bigint id PK
        varchar username UK
        varchar email UK
        varchar password_hash
        enum role
        int point_balance
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    ARTWORKS {
        bigint id PK
        bigint seller_id FK
        varchar title
        text description
        varchar image_path
        enum status
        datetime created_at
        datetime updated_at
    }

    AUCTIONS {
        bigint id PK
        bigint artwork_id FK,UK
        int start_price
        int current_price
        int reserve_price
        enum status
        datetime start_time
        datetime end_time
        bigint winner_id FK
        bigint winner_bid_id FK,UK
        int final_price
        enum closed_reason
        datetime created_at
        datetime updated_at
    }

    BIDS {
        bigint id PK
        bigint auction_id FK
        bigint bidder_id FK
        int bid_amount
        boolean is_auto_bid
        enum bid_status
        bigint payment_intent_id FK
        datetime created_at
    }

    AUTO_BID_SETTINGS {
        bigint id PK
        bigint auction_id FK
        bigint user_id FK
        int max_amount
        boolean is_active
        datetime created_at
        datetime updated_at
    }

    PAYMENT_INTENTS {
        bigint id PK
        bigint user_id FK
        bigint auction_id FK
        enum provider
        varchar provider_intent_id UK
        int amount
        varchar currency
        enum status
        datetime created_at
        datetime updated_at
    }

    WALLET_TRANSACTIONS {
        bigint id PK
        bigint user_id FK
        enum transaction_type
        int amount
        int balance_after
        bigint related_auction_id FK
        bigint related_bid_id FK
        datetime created_at
    }

    NOTIFICATIONS {
        bigint id PK
        bigint user_id FK
        enum notification_type
        varchar title
        text message
        boolean is_read
        bigint related_auction_id FK
        bigint related_bid_id FK
        datetime created_at
    }

    BOOKMARKS {
        bigint id PK
        bigint user_id FK
        bigint auction_id FK
        datetime created_at
    }

    ARTWORK_BOOKMARKS {
        bigint id PK
        bigint user_id FK
        bigint artwork_id FK
        datetime created_at
    }

    TAGS {
        bigint id PK
        varchar name UK
        datetime created_at
        datetime updated_at
    }

    ARTWORK_TAGS {
        bigint id PK
        bigint artwork_id FK
        bigint tag_id FK
        datetime created_at
    }

    NOTIFICATION_DELIVERIES {
        bigint id PK
        bigint notification_id FK
        enum channel
        varchar recipient
        enum delivery_status
        datetime sent_at
        varchar error_message
        datetime created_at
        datetime updated_at
    }
```

## 補足

- `users.email` はログインIDであり、一意かつ必須とする。`username`は画面表示用のユーザー名である。
- PNG保存時に`artworks`へ`draft`を作成し、作者が出品設定を完了した時だけ`auctions`を作成して`listed`へ更新する。
- `auctions.artwork_id` の一意制約により、1作品を複数回出品できない。初期実装ではオークション作成と同時に`active`となる。
- `auctions.winner_bid_id` は、オークション終了時に確定した落札入札を示す。
- `bookmarks` は `user_id` と `auction_id` の組み合わせを一意にする。
- `artwork_bookmarks` は `user_id` と `artwork_id` の組み合わせを一意にする。オークションと作品のお気に入りを混在させない。
- `tags` と `artwork_tags` により、作品とタグを多対多で関連付ける。
- オークションの出品者は `auctions.artwork_id → artworks.seller_id` から取得し、`auctions` には保持しない。
- 受理した最高入札は入札者のポイントを即時減算し、次の高値入札時に前最高入札者へ`refund`として返却する。両方の履歴は`wallet_transactions`に記録する。
- `auto_bid_settings` は `auction_id` と `user_id` の組み合わせを一意にする。

## 画面との対応

| 画面操作 | 主なテーブル | データの扱い |
| --- | --- | --- |
| ログイン/新規登録 | `users` | メールアドレスでユーザーを識別する。 |
| 絵を描く画面でPNG保存 | `artworks` | `draft`の作品と画像パスを作成する。 |
| 出品設定画面で公開 | `artworks`, `auctions`, `artwork_tags` | 作品を`listed`へ更新し、即時開始のオークションとタグ関連を作成する。 |
| 商品詳細画面で入札 | `bids`, `auctions`, `wallet_transactions` | 入札・現在価格・ポイント減算/返却を同一トランザクションで更新する。 |
| 商品詳細画面でお気に入り操作 | `bookmarks`, `artwork_bookmarks` | オークション用と作品用を別々に登録・解除する。 |
| アカウント画面で一覧表示 | `artworks`, `bookmarks`, `artwork_bookmarks` | 自分の下書き、作品お気に入り、オークションお気に入りを表示する。 |
