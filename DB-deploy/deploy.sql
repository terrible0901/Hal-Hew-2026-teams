CREATE DATABASE IF NOT EXISTS hew;

USE hew;

CREATE TABLE users (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    username VARCHAR(20) NOT NULL UNIQUE,
    disp_name VARCHAR(50) NOT NULL, --set default="user{user.id}" with FLASK
    email VARCHAR(225) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role ENUM('user','admin') NOT NULL DEFAULT 'user',
    point_balance INT UNSIGNED NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE artworks (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    seller_id BIGINT UNSIGNED NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT NULL,
    image_path VARCHAR(500) NOT NULL,
    status ENUM('draft','listed','sold','cancelled') NOT NULL DEFAULT 'draft',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_artwork_seller
        FOREIGN KEY (seller_id)
        REFERENCES users(id),
    
    INDEX idx_artworks_seller (seller_id),
    INDEX idx_artworks_status (status)
);

CREATE TABLE auctions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    artwork_id BIGINT UNSIGNED NOT NULL UNIQUE,
    start_price INT UNSIGNED NOT NULL,
    current_price INT UNSIGNED NOT NULL,
    reserve_price INT UNSIGNED NULL,
    status ENUM('active','ended','cancelled') NOT NULL DEFAULT 'active',
    start_time DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    end_time DATETIME NOT NULL,
    winner_id BIGINT UNSIGNED NULL,
    winner_bid_id BIGINT UNSIGNED NULL UNIQUE,
    final_price INT UNSIGNED NULL,
    closed_reason ENUM('time_expired','seller_finished','cancelled') NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,


    CONSTRAINT fk_auction_artwork
        FOREIGN KEY (artwork_id)
        REFERENCES artworks(id),
    
    CONSTRAINT fk_auction_winner
        FOREIGN KEY (winner_id)
        REFERENCES users(id),

    INDEX idx_auctions_status_endtime (status,end_time),
    INDEX idx_auctions_winnerid (winner_id)
);
    
CREATE TABLE bids (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    auction_id BIGINT UNSIGNED NOT NULL UNIQUE,
    bidder_id BIGINT UNSIGNED NOT NULL,
    bid_amount INT UNSIGNED NOT NULL,
    is_auto_bid BOOLEAN NOT NULL DEFAULT FALSE,
    bid_status ENUM('accepted','rejected') NOT NULL,
    payment_intent_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bids_auction_id
        FOREIGN KEY (auction_id)
        REFERENCES auctions(id),

    CONSTRAINT fk_bids_bidder
        FOREIGN KEY (bidder_id)
        REFERENCES users(id),
    
    INDEX idx_bids_auction (auction_id,bid_amount,created_at),
    INDEX idx_bids_bidder (bidder_id,created_at)
);

ALTER TABLE auctions
ADD CONSTRAINT fk_auction_winnerbid
FOREIGN KEY (winner_bid_id)
REFERENCES bids(id);

CREATE TABLE auto_bid_settings (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    auction_id BIGINT UNSIGNED NOT NULL,
    user_id BIGINT UNSIGNED NOT NULL,
    max_amount INT UNSIGNED NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_autobid_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(id),
    
    CONSTRAINT fk_autobid_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    UNIQUE INDEX idx_autobid_uq (auction_id,user_id),
    INDEX idx_autobid_is_active (auction_id,is_active)
);

CREATE TABLE payment_intents (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    auction_id BIGINT UNSIGNED NULL,
    -- provider ENUM('stripe') NOT NULL DEFAULT 'stripe',
    -- provider_intent_id VARCHAR(255) NULL UNIQUE,
    amount INT UNSIGNED NOT NULL,
    -- currency VARCHAR(10) NOT NULL DEFAULT 'JPY',
    status ENUM('pending','succeeded','failed','cancelled') NOT NULL DEFAULT 'pending',
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_payent_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_payment_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(id),
    
    INDEX idx_payment_user (user_id),
    INDEX idx_payment_auction (auction_id),
    INDEX idx_payment_status (status)
);

ALTER TABLE bids
ADD CONSTRAINT fk_bids_payment
FOREIGN KEY (payment_intent_id)
REFERENCES payment_intents(id);


CREATE TABLE wallet_transactions (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    transaction_type ENUM('charge','bid','refund','purchase','bonus') NOT NULL,
    amount INT NOT NULL,
    balance_after INT UNSIGNED NOT NULL,
    related_auction_id BIGINT UNSIGNED NULL,
    related_bid_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_wallet_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),
    
    CONSTRAINT fk_wallet_related_auction
        FOREIGN KEY (related_auction_id)
        REFERENCES auctions(id),
    
    CONSTRAINT fk_wallet_related_bid
        FOREIGN KEY (related_bid_id)
        REFERENCES bids(id),

    INDEX idx_wallet_user_created (user_id,created_at),
    INDEX idx_wallet_auction (related_auction_id),
    INDEX idx_wallet_bid (related_bid_id)
);

CREATE TABLE notifications (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    notification_type ENUM('bid_received','auction_ending','auction_won','auction_lost','payment_result') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN NOT NULL DEFAULT FALSE,
    related_auction_id BIGINT UNSIGNED NULL,
    related_bid_id BIGINT UNSIGNED NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifications_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_notifications_auction
        FOREIGN KEY (related_auction_id)
        REFERENCES auctions(id),

    CONSTRAINT fk_notifications_bid
        FOREIGN KEY (related_bid_id)
        REFERENCES bids(id),

    INDEX idx_notif_user_read (user_id, is_read, created_at),
    INDEX idx_notif_auction (related_auction_id)
);

CREATE TABLE bookmarks (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    auction_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_bookmark_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),
    
    CONSTRAINT fk_bookmark_auction
        FOREIGN KEY (auction_id)
        REFERENCES auctions(id),
    
    UNIQUE INDEX idx_bookmark_user_auction (user_id, auction_id),
    INDEX idx_bookmark_auction (auction_id)
);

CREATE TABLE notification_deliveries (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    notification_id BIGINT UNSIGNED NOT NULL,
    channel ENUM('email') NOT NULL DEFAULT 'email',
    recipient VARCHAR(255) NOT NULL,
    delivery_status ENUM('pending','sent','failed') NOT NULL DEFAULT 'pending',
    sent_at DATETIME NULL,
    error_message VARCHAR(500) NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    CONSTRAINT fk_notifdeli_notif
        FOREIGN KEY (notification_id)
        REFERENCES notifications(id),
    
    INDEX idx_notifdeli_status (delivery_status, created_at),
    INDEX idx_notifdeli_id (notification_id)
);

CREATE TABLE artwork_bookmarks (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    user_id BIGINT UNSIGNED NOT NULL,
    artwork_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_artbookmark_user
        FOREIGN KEY (user_id)
        REFERENCES users(id),

    CONSTRAINT fk_artbookmark_auction
        FOREIGN KEY (artwork_id)
        REFERENCES artworks(id),

    UNIQUE INDEX idx_artbookmark_user_artwork (user_id, artwork_id),
    INDEX idx_artbookmark_artwork (artwork_id)
);

CREATE TABLE tags (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    name VARCHAR(50) NOT NULL UNIQUE,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,

    UNIQUE INDEX idx_tag_name (name)
);

CREATE TABLE artwork_tags (
    id BIGINT UNSIGNED PRIMARY KEY AUTO_INCREMENT,
    artwork_id BIGINT UNSIGNED NOT NULL,
    tag_id BIGINT UNSIGNED NOT NULL,
    created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT fk_arttag_artwork
        FOREIGN KEY (artwork_id)
        REFERENCES artworks(id),
    
    CONSTRAINT fk_arttag_tag
        FOREIGN KEY (tag_id)
        REFERENCES tags(id),
    
    UNIQUE INDEX idx_artworkid_tag (artwork_id, tag_id),
    INDEX idx_tag_artwork (tag_id, artwork_id)
);
