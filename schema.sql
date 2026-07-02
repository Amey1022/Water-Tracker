-- Water Tracker Database Schema
-- MySQL 8.0+

-- Create database
CREATE DATABASE IF NOT EXISTS water_tracker;
USE water_tracker;

-- Users table
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100),
    daily_goal INT DEFAULT 2000, -- in ml
    timezone VARCHAR(50) DEFAULT 'UTC',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_email (email)
);

-- Water intake records table
CREATE TABLE water_intake (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    amount INT NOT NULL, -- in ml
    intake_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    date DATE NOT NULL,
    notes VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_date (user_id, date),
    INDEX idx_date (date)
);

-- Reminder settings table
CREATE TABLE reminder_settings (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    enabled BOOLEAN DEFAULT TRUE,
    interval_minutes INT DEFAULT 60,
    start_time TIME,
    end_time TIME,
    fcm_token VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_reminder (user_id)
);

-- Daily statistics table
CREATE TABLE daily_stats (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    date DATE NOT NULL,
    total_intake INT DEFAULT 0,
    goal_achieved BOOLEAN DEFAULT FALSE,
    glasses_count INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, date),
    INDEX idx_user_date (user_id, date)
);

-- Insert demo user
INSERT INTO users (email, password_hash, full_name, daily_goal) VALUES 
('demo@example.com', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewY5uyilYZvz/FLW', 'Demo User', 2000);

-- Insert demo reminder settings
INSERT INTO reminder_settings (user_id, enabled, interval_minutes) VALUES 
(1, TRUE, 60);

-- Insert demo water intake records (for today)
INSERT INTO water_intake (user_id, amount, date, intake_time) VALUES 
(1, 250, CURDATE(), TIMESTAMP(CURDATE(), '08:00:00')),
(1, 500, CURDATE(), TIMESTAMP(CURDATE(), '11:30:00')),
(1, 250, CURDATE(), TIMESTAMP(CURDATE(), '14:00:00'));

-- Insert demo daily stats
INSERT INTO daily_stats (user_id, date, total_intake, goal_achieved, glasses_count) VALUES 
(1, CURDATE(), 1000, FALSE, 4);
