# ER図

`db設計.md` をもとにしたHEW Ver0.5のER図です。作品とオークションは再出品なしの1対1です。

```mermaid
erDiagram
    USERS ||--o{ ARTWORKS : "出品する"
    USERS ||--o{ AUCTIONS : "開催する"
    USERS ||--o{ BIDS : "入札する"
    USERS ||--o{ AUTO_BID_SETTINGS : "自動入札を設定する"
    USERS ||--o{ BOOKMARKS : "登録する"
    USERS ||--o{ PAYMENT_INTENTS : "決済する"
    USERS ||--o{ WALLET_TRANSACTIONS : "ポイント取引する"
    USERS ||--o{ NOTIFICATIONS : "受信する"

    ARTWORKS ||--o| AUCTIONS : "1作品につき1オークション"
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
        bigint seller_id FK
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

- `auctions.artwork_id` の一意制約により、1作品を複数回出品できない。
- `auctions.winner_bid_id` は、オークション終了時に確定した落札入札を示す。
- `bookmarks` は `user_id` と `auction_id` の組み合わせを一意にする。
- `auto_bid_settings` は `auction_id` と `user_id` の組み合わせを一意にする。
