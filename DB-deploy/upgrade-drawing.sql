ALTER TABLE artworks MODIFY draw_time ENUM('short','mid','long','10s','30s','60s','300s') NOT NULL;
CREATE TABLE IF NOT EXISTS drawing_files (
    drawing_id CHAR(32) PRIMARY KEY,
    artwork_id BIGINT UNSIGNED NOT NULL UNIQUE,
    FOREIGN KEY (artwork_id) REFERENCES artworks(id)
);

-- XAMPP installations may have inherited latin1 from the server defaults.
ALTER TABLE artworks CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
ALTER TABLE users ADD COLUMN IF NOT EXISTS recovery_hash VARCHAR(255) NULL;

CREATE TABLE IF NOT EXISTS qr_previews (
    id CHAR(36) PRIMARY KEY,
    user_id BIGINT UNSIGNED NOT NULL,
    token_hash CHAR(64) NOT NULL,
    image MEDIUMBLOB NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);
ALTER TABLE notifications CONVERT TO CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
