-- FundRise Database Schema
-- Run this in MySQL before starting the server

CREATE DATABASE IF NOT EXISTS testdb;
USE testdb;

-- Users table (handles Donors, Campaign Creators, and Admins)
CREATE TABLE IF NOT EXISTS users (
  id          INT AUTO_INCREMENT PRIMARY KEY,
  fname       VARCHAR(100)  NOT NULL,
  lname       VARCHAR(100)  NOT NULL,
  email       VARCHAR(150)  NOT NULL UNIQUE,
  username    VARCHAR(100)  NOT NULL UNIQUE,
  password    VARCHAR(255)  NOT NULL,   -- store hashed passwords in production
  role        ENUM('Admin','Donor','Campaign') NOT NULL,
  org         VARCHAR(200)  DEFAULT NULL,
  bio         TEXT          DEFAULT NULL,
  created_at  TIMESTAMP     DEFAULT CURRENT_TIMESTAMP
);

-- Campaigns table
CREATE TABLE IF NOT EXISTS campaigns (
  id            INT AUTO_INCREMENT PRIMARY KEY,
  title         VARCHAR(255)  NOT NULL,
  category      VARCHAR(100)  NOT NULL,
  goal          DECIMAL(12,2) NOT NULL,
  raised        DECIMAL(12,2) DEFAULT 0,
  duration      INT           NOT NULL,   -- days
  days_left     INT           NOT NULL,
  creator       VARCHAR(200)  NOT NULL,
  creator_id    INT           DEFAULT NULL,
  short_desc    TEXT          NOT NULL,
  full_desc     TEXT          DEFAULT NULL,
  email         VARCHAR(150)  DEFAULT NULL,
  website       VARCHAR(255)  DEFAULT NULL,
  emoji         VARCHAR(10)   DEFAULT '🌱',
  color         VARCHAR(20)   DEFAULT '#D4EDDA',
  badge         VARCHAR(50)   DEFAULT '',
  status        ENUM('pending','active','rejected','completed') DEFAULT 'pending',
  submitted_at  DATE          DEFAULT (CURRENT_DATE),
  upi_id        VARCHAR(100)  DEFAULT NULL,
  FOREIGN KEY (creator_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Donations table
CREATE TABLE IF NOT EXISTS donations (
  id           INT AUTO_INCREMENT PRIMARY KEY,
  campaign_id  INT           NOT NULL,
  donor_id     INT           DEFAULT NULL,
  donor_name   VARCHAR(200)  DEFAULT 'Anonymous',
  amount       DECIMAL(12,2) NOT NULL,
  donated_at   TIMESTAMP     DEFAULT CURRENT_TIMESTAMP,
  utr_id       VARCHAR(100)  DEFAULT NULL,
  FOREIGN KEY (campaign_id) REFERENCES campaigns(id) ON DELETE CASCADE,
  FOREIGN KEY (donor_id)    REFERENCES users(id)     ON DELETE SET NULL
);

-- Seed default admin account (password: admin123)
INSERT IGNORE INTO users (fname, lname, email, username, password, role)
VALUES ('Admin', 'User', 'admin@fundrise.com', 'admin', 'admin123', 'Admin');

-- Seed a demo donor (password: donor123)
INSERT IGNORE INTO users (fname, lname, email, username, password, role)
VALUES ('Demo', 'Donor', 'donor@fundrise.com', 'donor', 'donor123', 'Donor');

-- Seed a demo campaign creator (password: create123)
INSERT IGNORE INTO users (fname, lname, email, username, password, role, org, bio)
VALUES ('Demo', 'Creator', 'creator@fundrise.com', 'creator', 'create123', 'Campaign', 'Demo Org', 'Demo campaign creator');

-- Seed sample campaigns
INSERT IGNORE INTO campaigns (id, title, category, goal, raised, duration, days_left, creator, short_desc, emoji, color, badge, status)
VALUES
  (1, 'Books for Rural Kids',     'Education',   120000, 85000,  60, 14, 'Asha Foundation', 'Provide quality textbooks and stationery to 500 underprivileged children in rural Karnataka.', '📚', '#FFF3CD', 'trending', 'active'),
  (2, 'Clean Water Initiative',   'Health',      250000, 210000, 30,  7, 'AquaLife NGO',    'Install water purification units in 12 villages lacking access to clean drinking water.',          '💧', '#D1ECF1', 'urgent',   'active'),
  (3, 'Solar for Schools',        'Environment', 300000, 95000,  90, 30, 'GreenWatts',      'Power 8 government schools with solar panels, cutting electricity bills and carbon emissions.',    '☀️', '#FFF9C4', 'new',      'active'),
  (4, 'Women Coding Bootcamp',    'Tech',        200000, 175000, 45, 10, 'SheCode India',   '6-week intensive coding program for 100 women from low-income families in Bengaluru.',             '👩‍💻', '#E8D5F5', 'trending', 'active'),
  (5, 'Community Kitchen',        'Community',   150000, 62000,  90, 45, 'Hunger Free BLR', 'Feed 300 daily-wage workers hot nutritious meals every day for one full year.',                   '🍲', '#FDECEA', '',         'active'),
  (6, 'Tree Planting Drive',      'Environment',  80000, 48000,  60, 22, 'Green Roots',     'Plant 10,000 native trees across Bengaluru to combat urban heat and improve air quality.',         '🌳', '#D4EDDA', 'new',      'active'),
  (7, 'Heart Surgery Fund',       'Health',      400000, 320000, 30,  5, 'HeartCare Trust', 'Help 5 children from poor families get life-saving cardiac surgery they cannot afford.',           '❤️', '#FDECEA', 'urgent',   'active'),
  (8, 'Digital Library Project',  'Education',   500000, 130000, 120,60, 'TechForAll',      'Set up 20 computer labs with high-speed internet in government schools across 3 districts.',      '📖', '#FFF3CD', '',         'active'),
  (9, 'Artisan Collective',       'Community',   120000, 88000,  60, 18, 'Craft India',     'Empower 200 traditional craft artisans with e-commerce training and startup capital.',            '🎨', '#FEF3E2', 'trending', 'active');
