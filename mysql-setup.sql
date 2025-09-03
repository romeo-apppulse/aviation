-- MySQL Setup Script for Aviation Ape Manager
-- Run this as MySQL root user to set up the database

-- Create the database with proper charset
CREATE DATABASE IF NOT EXISTS aviation_ape_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Create the application user
CREATE USER IF NOT EXISTS 'aviation_ape_user'@'%' IDENTIFIED BY 'your-secure-password-here';
CREATE USER IF NOT EXISTS 'aviation_ape_user'@'localhost' IDENTIFIED BY 'your-secure-password-here';

-- Grant all privileges on the database to the user
GRANT ALL PRIVILEGES ON aviation_ape_db.* TO 'aviation_ape_user'@'%';
GRANT ALL PRIVILEGES ON aviation_ape_db.* TO 'aviation_ape_user'@'localhost';

-- Create session table for express-mysql-session
USE aviation_ape_db;

CREATE TABLE IF NOT EXISTS sessions (
    session_id VARCHAR(128) COLLATE utf8mb4_bin NOT NULL,
    expires INT(11) UNSIGNED NOT NULL,
    data TEXT COLLATE utf8mb4_bin,
    PRIMARY KEY (session_id),
    KEY expires (expires)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Flush privileges to ensure changes take effect
FLUSH PRIVILEGES;

-- Show databases to confirm creation
SHOW DATABASES;

-- Show user permissions
SHOW GRANTS FOR 'aviation_ape_user'@'%';

-- Display connection information
SELECT 'Database setup complete!' as message;
SELECT 'Use this connection string:' as info;
SELECT 'mysql://aviation_ape_user:your-secure-password-here@localhost:3306/aviation_ape_db' as connection_string;