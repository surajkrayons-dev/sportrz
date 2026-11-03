-- phpMyAdmin SQL Dump
-- version 5.2.3
-- https://www.phpmyadmin.net/
--
-- Host: localhost:3306
-- Generation Time: Oct 28, 2026 at 11:13 AM
-- Server version: 10.11.19-MariaDB-cll-lve
-- PHP Version: 8.4.26

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";


/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8mb4 */;

--
-- Database: `astrotri_sportrz`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_audit_logs`
--

CREATE TABLE `admin_audit_logs` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `admin_user_id` char(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `entity_type` varchar(100) NOT NULL,
  `entity_id` varchar(191) DEFAULT NULL,
  `details` longtext DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `auth_tokens`
--

CREATE TABLE `auth_tokens` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `email` varchar(191) NOT NULL,
  `purpose` enum('email_verification','password_reset','login_otp') NOT NULL,
  `token_hash` char(64) NOT NULL,
  `attempts` tinyint(3) UNSIGNED NOT NULL DEFAULT 0,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `auth_tokens`
--

INSERT INTO `auth_tokens` (`id`, `user_id`, `email`, `purpose`, `token_hash`, `attempts`, `expires_at`, `used_at`, `created_at`) VALUES
(1, 'a615b9de-b2eb-4131-a0c7-b80b4028198e', 'suraj.krayons@gmail.com', 'email_verification', '6ee8cc38a1c9f580d9e434c322018eaa6d2c6460dabcd9bc5d2553cc3341ec31', 0, '2026-10-27 17:14:01', '2026-10-27 17:06:21', '2026-10-27 16:59:01'),
(2, 'a615b9de-b2eb-4131-a0c7-b80b4028198e', 'suraj.krayons@gmail.com', 'login_otp', 'ee7388d1de107baecf1f0e3f863ce442809b21b004f8c33e6e9e4c57ba2bbf48', 0, '2026-10-27 17:35:20', NULL, '2026-10-27 17:20:20');

-- --------------------------------------------------------

--
-- Table structure for table `categories`
--

CREATE TABLE `categories` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `name` varchar(100) NOT NULL,
  `slug` varchar(120) NOT NULL,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `categories`
--

INSERT INTO `categories` (`id`, `name`, `slug`, `display_order`, `is_active`, `created_at`, `updated_at`) VALUES
(1, 'Arcade', 'arcade', 1, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(2, 'Casual', 'casual', 2, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(3, 'Defence', 'defence', 3, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(4, 'Horror', 'horror', 4, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(5, 'Kids', 'kids', 5, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(6, 'Physics', 'physics', 6, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(7, 'Platformer', 'platformer', 7, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(8, 'Puzzle', 'puzzle', 8, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(9, 'Racing', 'racing', 9, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(10, 'Shooter', 'shooter', 10, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(11, 'Simulation', 'simulation', 11, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(12, 'Sports', 'sports', 12, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(13, 'Strategy', 'strategy', 13, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(14, 'Educational', 'educational', 14, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(15, 'Adventure', 'adventure', 15, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(16, 'Board & Card', 'board-and-card', 16, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(17, 'Idle / Clicker', 'idle-clicker', 17, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(18, 'Management', 'management', 18, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(19, 'Dress Up', 'dress-up', 19, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(20, 'Casino', 'casino', 20, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24'),
(21, 'Trivia / Quiz', 'trivia-quiz', 21, 1, '2026-10-27 15:04:24', '2026-10-27 15:04:24');

-- --------------------------------------------------------

--
-- Table structure for table `contact_messages`
--

CREATE TABLE `contact_messages` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `subject` varchar(100) NOT NULL,
  `message` text NOT NULL,
  `status` enum('unread','read') NOT NULL DEFAULT 'unread',
  `user_agent` varchar(512) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `read_at` datetime DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `feedback`
--

CREATE TABLE `feedback` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL,
  `comment` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `games`
--

CREATE TABLE `games` (
  `id` varchar(100) NOT NULL,
  `name` varchar(191) NOT NULL,
  `slug` varchar(191) NOT NULL,
  `path` varchar(1024) NOT NULL,
  `thumbnail` varchar(1024) NOT NULL,
  `description` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `is_featured` tinyint(1) NOT NULL DEFAULT 0,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `games`
--

INSERT INTO `games` (`id`, `name`, `slug`, `path`, `thumbnail`, `description`, `is_active`, `is_featured`, `display_order`, `created_at`, `updated_at`) VALUES
('adventure21', 'Diamond Hunt', 'diamond-hunt', 'https://files.sportrz.com/Games/Diamond-Hunt/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T144008.459.webp', NULL, 1, 0, 237, '2025-07-21 15:58:22', '2025-07-21 15:58:22'),
('arcade1', 'Animal Fun', 'animal-fun', 'https://files.sportrz.com/Games/1/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-1-1.webp', NULL, 1, 0, 1, '2025-07-21 15:56:56', '2025-07-21 17:52:51'),
('arcade10', 'Nave X Racer', 'nave-x-racer', 'https://files.sportrz.com/Games/10/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-12-1.webp', NULL, 1, 0, 10, '2025-07-21 15:56:59', '2025-07-21 15:56:59'),
('arcade100', 'War Planners', 'war-planners', 'https://files.sportrz.com/Games/97/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-60-1.webp', NULL, 1, 0, 3, '2026-10-27 15:04:24', '2025-07-21 17:51:53'),
('arcade11', 'Robo Slicer', 'robo-slicer', 'https://files.sportrz.com/Games/12/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753170159/game-thumbnails/ewao1zo2vqypkfl9rbza.jpg', NULL, 1, 0, 11, '2025-07-21 15:56:59', '2025-07-22 07:42:41'),
('arcade12', 'Alien Stack', 'alien-stack', 'https://files.sportrz.com/Games/13/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-16-1.webp', NULL, 1, 0, 12, '2025-07-21 15:56:59', '2025-07-21 15:56:59'),
('arcade13', 'Blast Tunnel', 'blast-tunnel', 'https://files.sportrz.com/Games/17/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753169250/game-thumbnails/g3k1w6n2h8d1fedweuqh.png', NULL, 1, 0, 13, '2025-07-21 15:57:00', '2025-07-22 07:27:33'),
('arcade14', 'Cube Blaster', 'cube-blaster', 'https://files.sportrz.com/Games/18/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-19-1.webp', NULL, 1, 0, 14, '2025-07-21 15:57:00', '2025-07-21 15:57:00'),
('arcade15', 'Sky Dodger', 'sky-dodger', 'https://files.sportrz.com/Games/19/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-21-1.webp', NULL, 1, 0, 15, '2025-07-21 15:57:01', '2025-07-21 15:57:01'),
('arcade16', 'Laser Sprint', 'laser-sprint', 'https://files.sportrz.com/Games/20/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-20-1.webp', NULL, 1, 0, 16, '2025-07-21 15:57:01', '2025-07-21 15:57:01'),
('arcade17', 'Fruit Warp', 'fruit-warp', 'https://files.sportrz.com/Games/22/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-22-1.webp', NULL, 1, 0, 17, '2025-07-21 15:57:01', '2025-07-21 15:57:01'),
('arcade18', 'Dash Vortex', 'dash-vortex', 'https://files.sportrz.com/Games/23/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-23-1.webp', NULL, 1, 0, 18, '2025-07-21 15:57:01', '2025-07-21 15:57:01'),
('arcade19', 'Ring Shot', 'ring-shot', 'https://files.sportrz.com/Games/24/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-24-1.webp', NULL, 1, 0, 19, '2025-07-21 15:57:02', '2025-07-21 15:57:02'),
('arcade2', 'Grammer Gamble', 'grammer-gamble', 'https://files.sportrz.com/Games/2/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-3-1.webp', NULL, 1, 0, 2, '2025-07-21 15:56:57', '2025-07-21 15:56:57'),
('arcade20', 'Bounce Maze', 'bounce-maze', 'https://files.sportrz.com/Games/25/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753169412/game-thumbnails/qla7tqktepu1arp8qxwf.png', NULL, 1, 0, 20, '2025-07-21 15:57:02', '2025-07-22 07:30:20'),
('arcade21', 'Candy Smash Rush', 'candy-smash-rush', 'https://files.sportrz.com/Games/CandySmash/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-36.webp', NULL, 1, 0, 216, '2025-07-21 15:58:15', '2025-07-21 15:58:15'),
('arcade22', 'Casual Breakout', 'casual-breakout', 'https://files.sportrz.com/Games/casual/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-61.webp', NULL, 1, 0, 220, '2025-07-21 15:58:16', '2025-07-21 15:58:16'),
('arcade23', 'Don\'t Touch the Hooks', 'don-t-touch-the-hooks', 'https://files.sportrz.com/Games/Don\'tTouchtheHooks/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T173351.829.webp', NULL, 1, 0, 238, '2025-07-21 15:58:23', '2025-07-21 15:58:23'),
('arcade24', 'Dots Rush', 'dots-rush', 'https://files.sportrz.com/Games/dots/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T131017.397.webp', NULL, 1, 0, 239, '2025-07-21 15:58:23', '2025-07-21 15:58:23'),
('arcade25', 'Endless Ski Rush', 'endless-ski-rush', 'https://files.sportrz.com/Games/endlesski/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T131513.604-1.webp', NULL, 1, 0, 245, '2025-07-21 15:58:25', '2025-07-21 15:58:25'),
('arcade26', 'Fail Circle', 'fail-circle', 'https://files.sportrz.com/Games/FailCircle/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-6.webp', NULL, 1, 0, 247, '2025-07-21 15:58:26', '2025-07-21 15:58:26'),
('arcade27', 'Fruit Rush', 'fruit-rush', 'https://files.sportrz.com/Games/Fruit-Rush/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T175953.593.webp', NULL, 1, 0, 273, '2025-07-21 15:58:36', '2025-07-21 15:58:36'),
('arcade28', 'Fruit Slicer', 'fruit-slicer', 'https://files.sportrz.com/Games/fruitslicer/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T182235.149.webp', NULL, 1, 0, 274, '2025-07-21 15:58:36', '2025-07-21 15:58:36'),
('arcade29', 'Monster Catch', 'monster-catch', 'https://files.sportrz.com/Games/monstercatch/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-7.webp', NULL, 1, 0, 328, '2025-07-21 15:58:55', '2025-07-21 15:58:55'),
('arcade3', 'Ring The Answer', 'ring-the-answer', 'https://files.sportrz.com/Games/3/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753169987/game-thumbnails/ekejhjyj6gwpry7zb8jv.png', NULL, 1, 0, 3, '2025-07-21 15:56:57', '2025-07-22 07:39:49'),
('arcade30', 'Mole Smash', 'mole-smash', 'https://files.sportrz.com/Games/molesmash/index.html', 'https://files.sportrz.com/2024/12/dghb.png', NULL, 1, 0, 327, '2025-07-21 15:58:55', '2025-07-21 15:58:55'),
('arcade4', 'Juicy Candy', 'juicy-candy', 'https://files.sportrz.com/Games/4/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-5-1.webp', NULL, 1, 0, 4, '2025-07-21 15:56:57', '2025-07-21 15:56:57'),
('arcade5', 'Travelers', 'travelers', 'https://files.sportrz.com/Games/5/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-6-1.webp', NULL, 1, 0, 5, '2025-07-21 15:56:57', '2025-07-21 15:56:57'),
('arcade6', 'Little dino Adventure', 'little-dino-adventure', 'https://files.sportrz.com/Games/6/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-7-1.webp', NULL, 1, 0, 6, '2025-07-21 15:56:58', '2025-07-21 15:56:58'),
('arcade7', 'Tappy Dumont', 'tappy-dumont', 'https://files.sportrz.com/Games/7/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-8-1.webp', NULL, 1, 0, 7, '2025-07-21 15:56:58', '2025-07-21 15:56:58'),
('arcade8', 'Dark Ninja', 'dark-ninja', 'https://files.sportrz.com/Games/8/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-9-1.webp', NULL, 1, 0, 8, '2025-07-21 15:56:58', '2025-07-21 15:56:58'),
('arcade9', 'Puzzle Game Cartoon', 'puzzle-game-cartoon', 'https://files.sportrz.com/Games/9/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-10-1.webp', NULL, 1, 0, 9, '2025-07-21 15:56:59', '2025-07-21 15:56:59'),
('arcade90', 'Fish World', 'fish-world', 'https://files.sportrz.com/Games/539/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753166578/game-thumbnails/acv6huu09uqvqvnemjng.png', NULL, 1, 0, 339, '2026-10-27 15:04:24', '2025-07-22 06:49:35'),
('boardcard1', 'Card Clash Royale', 'card-clash-royale', 'https://files.sportrz.com/Games/658/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T142950.360-2.webp', NULL, 1, 0, 181, '2025-07-21 15:58:04', '2025-07-21 15:58:04'),
('boardcard10', 'Puzzle Stackers', 'puzzle-stackers', 'https://files.sportrz.com/Games/667/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T144114.299-2.webp', NULL, 1, 0, 190, '2025-07-21 15:58:07', '2025-07-21 15:58:07'),
('boardcard11', 'Card Castle', 'card-castle', 'https://files.sportrz.com/Games/668/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T144259.977-2.webp', NULL, 1, 0, 191, '2025-07-21 15:58:08', '2025-07-21 15:58:08'),
('boardcard12', 'Number Grid', 'number-grid', 'https://files.sportrz.com/Games/669/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T144808.004-1-2.webp', NULL, 1, 0, 192, '2025-07-21 15:58:08', '2025-07-21 15:58:08'),
('boardcard13', 'Board Battle', 'board-battle', 'https://files.sportrz.com/Games/670/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T144921.518-1-1.webp', NULL, 1, 0, 193, '2025-07-21 15:58:08', '2025-07-21 15:58:08'),
('boardcard14', 'Kings & Pawns', 'kings-and-pawns', 'https://files.sportrz.com/Games/671/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T144445.240-2.webp', NULL, 1, 0, 194, '2025-07-21 15:58:09', '2025-07-21 15:58:09'),
('boardcard15', 'Card Blitz', 'card-blitz', 'https://files.sportrz.com/Games/672/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T144552.779-2.webp', NULL, 1, 0, 195, '2025-07-21 15:58:09', '2025-07-21 15:58:09'),
('boardcard16', 'Stack Wars', 'stack-wars', 'https://files.sportrz.com/Games/673/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T162032.523-1-1.webp', NULL, 1, 0, 196, '2025-07-21 15:58:09', '2025-07-21 15:58:09'),
('boardcard17', 'Stratego Lite', 'stratego-lite', 'https://files.sportrz.com/Games/674/index.html', '', NULL, 1, 0, 197, '2025-07-21 15:58:09', '2025-07-21 15:58:09'),
('boardcard18', 'Dicey Moves', 'dicey-moves', 'https://files.sportrz.com/Games/675/index.html', '', NULL, 1, 0, 198, '2025-07-21 15:58:09', '2025-07-21 15:58:09'),
('boardcard19', 'Flip the Deck', 'flip-the-deck', 'https://files.sportrz.com/Games/676/index.html', '', NULL, 1, 0, 199, '2025-07-21 15:58:10', '2025-07-21 15:58:10'),
('boardcard2', 'Board Kings', 'board-kings', 'https://files.sportrz.com/Games/659/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143129.204-2.webp', NULL, 1, 0, 182, '2025-07-21 15:58:05', '2025-07-21 15:58:05'),
('boardcard20', 'Shuffle Storm', 'shuffle-storm', 'https://files.sportrz.com/Games/677/index.html', 'https://files.sportrz.com/2024/12/foxiz-logos-585-x-200-px.png', NULL, 1, 0, 200, '2025-07-21 15:58:10', '2025-07-21 15:58:10'),
('boardcard21', 'Blackjack Unlimited', 'blackjack-unlimited', 'https://files.sportrz.com/Games/blackjack-unlimited/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-95.webp', NULL, 1, 0, 204, '2025-07-21 15:58:11', '2025-07-21 15:58:11'),
('boardcard22', 'Checkers Pro', 'checkers-pro', 'https://files.sportrz.com/Games/Checkers/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-74.webp', NULL, 1, 0, 223, '2025-07-21 15:58:17', '2025-07-21 15:58:17'),
('boardcard23', 'Fantasy Slots', 'fantasy-slots', 'https://files.sportrz.com/Games/fantasyslots/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T130547.800.webp', NULL, 1, 0, 251, '2025-07-21 15:58:27', '2025-07-21 15:58:27'),
('boardcard24', 'Farm Slots Deluxe', 'farm-slots-deluxe', 'https://files.sportrz.com/Games/farmslots/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-49.webp', NULL, 1, 0, 255, '2025-07-21 15:58:28', '2025-07-21 15:58:28'),
('boardcard25', 'Flaming Bingo', 'flaming-bingo', 'https://files.sportrz.com/Games/Flaming-Bingo/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-53.webp', NULL, 1, 0, 258, '2025-07-21 15:58:29', '2025-07-21 15:58:29'),
('boardcard26', 'Freecell Solitaire', 'freecell-solitaire', 'https://files.sportrz.com/Games/freecell-solitaire/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-78.webp', NULL, 1, 0, 268, '2025-07-21 15:58:34', '2025-07-21 15:58:34'),
('boardcard27', 'Fruit Slots', 'fruit-slots', 'https://files.sportrz.com/Games/fruitslots/index.html', '', NULL, 1, 0, 276, '2025-07-21 15:58:37', '2025-07-21 15:58:37'),
('boardcard28', 'Gold Miner Slots', 'gold-miner-slots', 'https://files.sportrz.com/Games/goldminerslots/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T132208.118.webp', NULL, 1, 0, 283, '2025-07-21 15:58:40', '2025-07-21 15:58:40'),
('boardcard29', 'Gothic Checkers', 'gothic-checkers', 'https://files.sportrz.com/Games/gothiccheckers/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T133207.467.webp', NULL, 1, 0, 284, '2025-07-21 15:58:41', '2025-07-21 15:58:41'),
('boardcard3', 'Tile Trouble', 'tile-trouble', 'https://files.sportrz.com/Games/660/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143233.625-2.webp', NULL, 1, 0, 183, '2025-07-21 15:58:06', '2025-07-21 15:58:06'),
('boardcard4', 'Stack Attack', 'stack-attack', 'https://files.sportrz.com/Games/661/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143341.582-2.webp', NULL, 1, 0, 184, '2025-07-21 15:58:06', '2025-07-21 15:58:06'),
('boardcard5', 'Dice Duel', 'dice-duel', 'https://files.sportrz.com/Games/662/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143459.257-2.webp', NULL, 1, 0, 185, '2025-07-21 15:58:06', '2025-07-21 15:58:06'),
('boardcard6', 'Royal Flush', 'royal-flush', 'https://files.sportrz.com/Games/663/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143622.139-1.webp', NULL, 1, 0, 186, '2025-07-21 15:58:06', '2025-07-21 15:58:06'),
('boardcard7', 'Checker Champs', 'checker-champs', 'https://files.sportrz.com/Games/664/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143740.869-2.webp', NULL, 1, 0, 187, '2025-07-21 15:58:07', '2025-07-21 15:58:07'),
('boardcard8', 'Memory Master', 'memory-master', 'https://files.sportrz.com/Games/665/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143903.230-2.webp', NULL, 1, 0, 188, '2025-07-21 15:58:07', '2025-07-21 15:58:07'),
('boardcard9', 'Domino Rally', 'domino-rally', 'https://files.sportrz.com/Games/666/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T144008.459-2.webp', NULL, 1, 0, 189, '2025-07-21 15:58:07', '2025-07-21 15:58:07'),
('casual1', 'Bubble Pop', 'bubble-pop', 'https://files.sportrz.com/Games/26/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753169809/game-thumbnails/qsp76w5e08tzcgqt364p.png', NULL, 1, 0, 21, '2025-07-21 15:57:02', '2025-07-22 07:36:55'),
('casual10', 'Sweet Match', 'sweet-match', 'https://files.sportrz.com/Games/35/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-37-1.webp', NULL, 1, 0, 30, '2025-07-21 15:57:05', '2025-07-21 15:57:05'),
('casual11', 'Splash Puzzle', 'splash-puzzle', 'https://files.sportrz.com/Games/36/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753171678/game-thumbnails/smg7fxldnpgw32s35gie.png', NULL, 1, 0, 31, '2025-07-21 15:57:06', '2025-07-22 08:08:00'),
('casual12', 'Balloon Drift', 'balloon-drift', 'https://files.sportrz.com/Games/37/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-39-1.webp', NULL, 1, 0, 32, '2025-07-21 15:57:06', '2025-07-21 15:57:06'),
('casual13', 'Rainbow Hop', 'rainbow-hop', 'https://files.sportrz.com/Games/38/index.html', '', NULL, 1, 0, 33, '2025-07-21 15:57:06', '2025-07-21 15:57:06'),
('casual14', 'Teddy Jump', 'teddy-jump', 'https://files.sportrz.com/Games/42/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753171708/game-thumbnails/wn0f1hb22ebx9n0wssq6.png', NULL, 1, 0, 34, '2025-07-21 15:57:07', '2025-07-22 08:08:31'),
('casual15', 'Cupcake Fall', 'cupcake-fall', 'https://files.sportrz.com/Games/45/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753171733/game-thumbnails/rqhtgmchwufp7fihj3wr.png', NULL, 1, 0, 35, '2025-07-21 15:57:07', '2025-07-22 08:08:55'),
('casual16', 'Cactus Clicker', 'cactus-clicker', 'https://files.sportrz.com/Games/46/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-43-1.webp', NULL, 1, 0, 36, '2025-07-21 15:57:07', '2025-07-21 15:57:07'),
('casual17', 'Zen Drift', 'zen-drift', 'https://files.sportrz.com/Games/53/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-45-1.webp', NULL, 1, 0, 37, '2025-07-21 15:57:07', '2025-07-21 15:57:07'),
('casual18', 'Choco Swipe', 'choco-swipe', 'https://files.sportrz.com/Games/54/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-46-1.webp', NULL, 1, 0, 38, '2025-07-21 15:57:08', '2025-07-21 15:57:08'),
('casual19', 'Fluffy Rush', 'fluffy-rush', 'https://files.sportrz.com/Games/55/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-47-1.webp', NULL, 1, 0, 39, '2025-07-21 15:57:08', '2025-07-21 15:57:08'),
('casual2', 'Zen Garden', 'zen-garden', 'https://files.sportrz.com/Games/27/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-27-1.webp', NULL, 1, 0, 22, '2025-07-21 15:57:03', '2025-07-21 15:57:03'),
('casual20', 'Color Streak', 'color-streak', 'https://files.sportrz.com/Games/58/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-48-1.webp', NULL, 1, 0, 40, '2025-07-21 15:57:08', '2025-07-21 15:57:08'),
('casual21', 'Chocolate Dreamland', 'chocolate-dreamland', 'https://files.sportrz.com/Games/ChocolateDream/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-92.webp', NULL, 1, 0, 224, '2025-07-21 15:58:18', '2025-07-21 15:58:18'),
('casual22', 'Feed the Rotty', 'feed-the-rotty', 'https://files.sportrz.com/Games/feedtherotty/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249629/game-thumbnails/n796bsbzuyj1mkersngh.png', NULL, 1, 0, 256, '2025-07-21 15:58:29', '2025-07-23 05:47:10'),
('casual23', 'Fruit Chef Mini', 'fruit-chef-mini', 'https://files.sportrz.com/Games/FruitChef-min/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T172838.238.webp', NULL, 1, 0, 271, '2025-07-21 15:58:35', '2025-07-21 15:58:35'),
('casual3', 'Cookie Flip', 'cookie-flip', 'https://files.sportrz.com/Games/28/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-28-1.webp', NULL, 1, 0, 23, '2025-07-21 15:57:03', '2025-07-21 15:57:03'),
('casual4', 'Cozy Stack', 'cozy-stack', 'https://files.sportrz.com/Games/29/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-29-1.webp', NULL, 1, 0, 24, '2025-07-21 15:57:03', '2025-07-21 15:57:03'),
('casual5', 'Paint Splash', 'paint-splash', 'https://files.sportrz.com/Games/30/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753171657/game-thumbnails/ypby2p9g96lwmqigf4bf.png', NULL, 1, 0, 25, '2025-07-21 15:57:04', '2025-07-22 08:07:40'),
('casual6', 'Jelly Tap', 'jelly-tap', 'https://files.sportrz.com/Games/31/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-33-1.webp', NULL, 1, 0, 26, '2025-07-21 15:57:04', '2025-07-21 15:57:04'),
('casual7', 'Magic Slide', 'magic-slide', 'https://files.sportrz.com/Games/32/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-34-1.webp', NULL, 1, 0, 27, '2025-07-21 15:57:04', '2025-07-21 15:57:04'),
('casual8', 'Fruit Slice', 'fruit-slice', 'https://files.sportrz.com/Games/33/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-35-1.webp', NULL, 1, 0, 28, '2025-07-21 15:57:05', '2025-07-21 15:57:05'),
('casual9', 'Dream Tiles', 'dream-tiles', 'https://files.sportrz.com/Games/34/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-36-1.webp', NULL, 1, 0, 29, '2025-07-21 15:57:05', '2025-07-21 15:57:05'),
('defence1', 'Shield Matrix', 'shield-matrix', 'https://files.sportrz.com/Games/132/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-75-1.webp', NULL, 1, 0, 61, '2025-07-21 15:57:15', '2025-07-21 15:57:15'),
('defence10', 'Zombie Siege', 'zombie-siege', 'https://files.sportrz.com/Games/204/index.html', 'https://files.sportrz.com/2024/12/image_2024_08_30T12_40_58_443Z-1.png', NULL, 1, 0, 70, '2025-07-21 15:57:18', '2025-07-21 15:57:18'),
('defence11', 'Castle Guard', 'castle-guard', 'https://files.sportrz.com/Games/206/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-88-1.webp', NULL, 1, 0, 71, '2025-07-21 15:57:18', '2025-07-21 15:57:18'),
('defence12', 'Castle Guard', 'castle-guard-defence12', 'https://files.sportrz.com/Games/209/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-89-1.webp', NULL, 1, 0, 72, '2025-07-21 15:57:18', '2025-07-21 15:57:18'),
('defence13', 'Warden Rush', 'warden-rush', 'https://files.sportrz.com/Games/218/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-90-1.webp', NULL, 1, 0, 73, '2025-07-21 15:57:19', '2025-07-21 15:57:19'),
('defence14', 'Creep Stopper', 'creep-stopper', 'https://files.sportrz.com/Games/219/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-91-1.webp', NULL, 1, 0, 74, '2025-07-21 15:57:20', '2025-07-21 15:57:20'),
('defence15', 'Cannon Core', 'cannon-core', 'https://files.sportrz.com/Games/225/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-92-1.webp', NULL, 1, 0, 75, '2025-07-21 15:57:20', '2025-07-21 15:57:20'),
('defence16', 'Barrier defence', 'barrier-defence', 'https://files.sportrz.com/Games/226/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-93-1.webp', NULL, 1, 0, 76, '2025-07-21 15:57:20', '2025-07-21 15:57:20'),
('defence17', 'Cannon Core', 'cannon-core-defence17', 'https://files.sportrz.com/Games/227/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-94-1.webp', NULL, 1, 0, 77, '2025-07-21 15:57:20', '2025-07-21 15:57:20'),
('defence18', 'Last Line', 'last-line', 'https://files.sportrz.com/Games/234/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-95-1.webp', NULL, 1, 0, 78, '2025-07-21 15:57:21', '2025-07-21 15:57:21'),
('defence19', 'Hero Bastion', 'hero-bastion', 'https://files.sportrz.com/Games/249/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-96-1.webp', NULL, 1, 0, 79, '2025-07-21 15:57:21', '2025-07-21 15:57:21'),
('defence2', 'Hero Bastion', 'hero-bastion-defence2', 'https://files.sportrz.com/Games/133/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-79-1.webp', NULL, 1, 0, 62, '2025-07-21 15:57:15', '2025-07-21 15:57:15'),
('defence20', 'Hero Bastion', 'hero-bastion-defence20', 'https://files.sportrz.com/Games/289/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-98-1.webp', NULL, 1, 0, 80, '2025-07-21 15:57:22', '2025-07-21 15:57:22'),
('defence3', 'Alien Barricade', 'alien-barricade', 'https://files.sportrz.com/Games/134/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-76-1.webp', NULL, 1, 0, 63, '2025-07-21 15:57:16', '2025-07-21 15:57:16'),
('defence4', 'Wall Holders', 'wall-holders', 'https://files.sportrz.com/Games/135/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-77-1.webp', NULL, 1, 0, 64, '2025-07-21 15:57:16', '2025-07-21 15:57:16'),
('defence5', 'Barrier defence', 'barrier-defence-defence5', 'https://files.sportrz.com/Games/137/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-78-1.webp', NULL, 1, 0, 65, '2025-07-21 15:57:16', '2025-07-21 15:57:16'),
('defence6', 'Guardian Strike', 'guardian-strike', 'https://files.sportrz.com/Games/146/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-80-1.webp', NULL, 1, 0, 66, '2025-07-21 15:57:17', '2025-07-21 15:57:17'),
('defence7', 'Wall Holders', 'wall-holders-defence7', 'https://files.sportrz.com/Games/159/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-83-1.webp', NULL, 1, 0, 67, '2025-07-21 15:57:17', '2025-07-21 15:57:17'),
('defence8', 'Castle Guard', 'castle-guard-defence8', 'https://files.sportrz.com/Games/181/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-84-1.webp', NULL, 1, 0, 68, '2025-07-21 15:57:17', '2025-07-21 15:57:17'),
('defence9', 'Hero Bastion', 'hero-bastion-defence9', 'https://files.sportrz.com/Games/182/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-86-1.webp', NULL, 1, 0, 69, '2025-07-21 15:57:18', '2025-07-21 15:57:18'),
('educational1', 'Math Rush', 'math-rush', 'https://files.sportrz.com/Games/mathrush/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T141432.563.webp', NULL, 1, 0, 323, '2025-07-21 15:58:54', '2025-07-21 15:58:54'),
('educational90', 'Math Magic', 'math-magic', 'https://files.sportrz.com/Games/84/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-52-1.webp', NULL, 1, 0, 1, '2026-10-27 15:04:24', '2025-07-22 06:49:06'),
('educational91', 'Cyclop Physics', 'cyclop-physics', 'https://files.sportrz.com/Games/CyclopPhysics/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172311/game-thumbnails/u8hgr5htao8ponyln4i6.png', NULL, 1, 0, 2, '2026-10-27 15:04:24', '2025-07-23 15:06:22'),
('horror1', 'The Whispering Manor', 'the-whispering-manor', 'https://files.sportrz.com/Games/638/index.html', 'https://files.sportrz.com/2024/12/sdgtae-1-1.png', NULL, 1, 0, 161, '2025-07-21 15:57:57', '2025-07-21 15:57:57'),
('horror10', 'Voices from Below', 'voices-from-below', 'https://files.sportrz.com/Games/647/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753170376/game-thumbnails/kzr6ttj57bwaxdymlgis.jpg', NULL, 1, 0, 170, '2025-07-21 15:58:00', '2025-07-22 07:46:18'),
('horror11', 'Cabin of Screams', 'cabin-of-screams', 'https://files.sportrz.com/Games/648/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T141432.563-2.webp', NULL, 1, 0, 171, '2025-07-21 15:58:01', '2025-07-21 15:58:01'),
('horror12', 'Sinister Forest', 'sinister-forest', 'https://files.sportrz.com/Games/649/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T141543.170-2.webp', NULL, 1, 0, 172, '2025-07-21 15:58:01', '2025-07-21 15:58:01'),
('horror13', 'The Grinning', 'the-grinning', 'https://files.sportrz.com/Games/650/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T141730.965-2.webp', NULL, 1, 0, 173, '2025-07-21 15:58:02', '2025-07-21 15:58:02'),
('horror14', 'Eyes in the Dark', 'eyes-in-the-dark', 'https://files.sportrz.com/Games/651/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T141901.594-2.webp', NULL, 1, 0, 174, '2025-07-21 15:58:02', '2025-07-21 15:58:02'),
('horror15', 'Mirror Curse', 'mirror-curse', 'https://files.sportrz.com/Games/652/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T142031.687-2.webp', NULL, 1, 0, 175, '2025-07-21 15:58:03', '2025-07-21 15:58:03'),
('horror16', 'Buried Secrets', 'buried-secrets', 'https://files.sportrz.com/Games/653/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T142434.445-2.webp', NULL, 1, 0, 176, '2025-07-21 15:58:03', '2025-07-21 15:58:03'),
('horror17', 'Ashen Souls', 'ashen-souls', 'https://files.sportrz.com/Games/654/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T142200.382-2.webp', NULL, 1, 0, 177, '2025-07-21 15:58:03', '2025-07-21 15:58:03'),
('horror18', 'Witch’s Game', 'witch-s-game', 'https://files.sportrz.com/Games/655/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T142323.489-2.webp', NULL, 1, 0, 178, '2025-07-21 15:58:04', '2025-07-21 15:58:04'),
('horror19', 'The Forgotten Room', 'the-forgotten-room', 'https://files.sportrz.com/Games/656/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T142642.470-2.webp', NULL, 1, 0, 179, '2025-07-21 15:58:04', '2025-07-21 15:58:04'),
('horror2', 'Night of Shadows', 'night-of-shadows', 'https://files.sportrz.com/Games/639/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T132711.551-1-1.webp', NULL, 1, 0, 162, '2025-07-21 15:57:57', '2025-07-21 15:57:57'),
('horror20', 'Nocturne Alley', 'nocturne-alley', 'https://files.sportrz.com/Games/657/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T142833.430-2.webp', NULL, 1, 0, 180, '2025-07-21 15:58:04', '2025-07-21 15:58:04'),
('horror21', 'Dark Village', 'dark-village', 'https://files.sportrz.com/Games/DarkVillage/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753170616/game-thumbnails/iujwx5vnxqdaeu5tvuoy.jpg', NULL, 1, 0, 236, '2025-07-21 15:58:22', '2025-07-22 07:50:18'),
('horror3', 'Echoes of the Crypt', 'echoes-of-the-crypt', 'https://files.sportrz.com/Games/640/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T132839.653-1-1.webp', NULL, 1, 0, 163, '2025-07-21 15:57:58', '2025-07-21 15:57:58'),
('horror4', 'Deadlight Asylum', 'deadlight-asylum', 'https://files.sportrz.com/Games/641/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T133207.467-2.webp', NULL, 1, 0, 164, '2025-07-21 15:57:58', '2025-07-21 15:57:58'),
('horror5', 'Ghost Host', 'ghost-host', 'https://files.sportrz.com/Games/642/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T133359.592-2.webp', NULL, 1, 0, 165, '2025-07-21 15:57:58', '2025-07-21 15:57:58'),
('horror6', 'Dark Ritual', 'dark-ritual', 'https://files.sportrz.com/Games/643/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T133532.228-2.webp', NULL, 1, 0, 166, '2025-07-21 15:57:59', '2025-07-21 15:57:59'),
('horror7', 'Hauntville', 'hauntville', 'https://files.sportrz.com/Games/644/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T140923.674-2.webp', NULL, 1, 0, 167, '2025-07-21 15:57:59', '2025-07-21 15:57:59'),
('horror8', 'Cursed Dolls', 'cursed-dolls', 'https://files.sportrz.com/Games/645/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T141050.424-2.webp', NULL, 1, 0, 168, '2025-07-21 15:58:00', '2025-07-21 15:58:00'),
('horror9', 'Blood House', 'blood-house', 'https://files.sportrz.com/Games/646/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753170393/game-thumbnails/mezic3l7wratr4ttysvc.jpg', NULL, 1, 0, 169, '2025-07-21 15:58:00', '2025-07-22 07:46:35'),
('idle21', 'Click Battle Madness', 'click-battle-madness', 'https://files.sportrz.com/Games/ClickBattleMadness/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-93.webp', NULL, 1, 0, 227, '2025-07-21 15:58:19', '2025-07-21 15:58:19'),
('kids21', 'Cute Animal Rescue', 'cute-animal-rescue', 'https://files.sportrz.com/Games/Cute-Animals/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T174650.124.webp', NULL, 1, 0, 231, '2025-07-21 15:58:20', '2025-07-21 15:58:20'),
('kids22', 'Farm Alarm', 'farm-alarm', 'https://files.sportrz.com/Games/FarmAlarm/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-47.webp', NULL, 1, 0, 252, '2025-07-21 15:58:27', '2025-07-21 15:58:27'),
('kids23', 'Farm Pets Mania', 'farm-pets-mania', 'https://files.sportrz.com/Games/farmpets/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-48.webp', NULL, 1, 0, 254, '2025-07-21 15:58:28', '2025-07-21 15:58:28'),
('kids24', 'Flappy UFO', 'flappy-ufo', 'https://files.sportrz.com/Games/FlappyUFO/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-58.webp', NULL, 1, 0, 261, '2025-07-21 15:58:30', '2025-07-21 15:58:30'),
('kids25', 'Fluffy Rescue', 'fluffy-rescue', 'https://files.sportrz.com/Games/FluffyRescue/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-59.webp', NULL, 1, 0, 262, '2025-07-21 15:58:31', '2025-07-21 15:58:31'),
('kids26', 'Fluffy Rescue 2', 'fluffy-rescue-2', 'https://files.sportrz.com/Games/FluffyRescue2/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172176/game-thumbnails/ggfuf8mpj8qgkyzd7r2q.png', NULL, 1, 0, 263, '2025-07-21 15:58:31', '2025-07-22 08:17:00'),
('kids27', 'Flying Bubbles', 'flying-bubbles', 'https://files.sportrz.com/Games/flyingbubbles/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-76.webp', NULL, 1, 0, 264, '2025-07-21 15:58:32', '2025-07-21 15:58:32'),
('kids28', 'Frosty Donuts', 'frosty-donuts', 'https://files.sportrz.com/Games/Frosty-Donuts/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T171624.584.webp', NULL, 1, 0, 270, '2025-07-21 15:58:34', '2025-07-21 15:58:34'),
('kids29', 'Happy Fox', 'happy-fox', 'https://files.sportrz.com/Games/happy-fox/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-90.webp', NULL, 1, 0, 288, '2025-07-21 15:58:42', '2025-07-21 15:58:42'),
('kids30', 'Kids Family Fun', 'kids-family-fun', 'https://files.sportrz.com/Games/kidsfamily/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T182032.504.webp', NULL, 1, 0, 313, '2025-07-21 15:58:51', '2025-07-21 15:58:51'),
('kids31', 'Marble Cheesecake', 'marble-cheesecake', 'https://files.sportrz.com/Games/Marblecheesecake/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172100/game-thumbnails/vkwsfcjuzdbyqbahefps.png', NULL, 1, 0, 322, '2025-07-21 15:58:54', '2025-07-22 08:15:03'),
('kids32', 'Nerdy Pets', 'nerdy-pets', 'https://files.sportrz.com/Games/nerdypets/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T124819.561.webp', NULL, 1, 0, 336, '2025-07-21 15:58:58', '2025-07-21 15:58:58'),
('management1', 'Girls On Job', 'girls-on-job', 'https://files.sportrz.com/Games/girlsonjob/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T131930.722.webp', NULL, 1, 0, 282, '2025-07-21 15:58:40', '2025-07-21 15:58:40'),
('physics21', 'Block Tower', 'block-tower', 'https://files.sportrz.com/Games/blocktower/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172376/game-thumbnails/it3eq82yglzgnr3cpmf7.png', NULL, 1, 0, 205, '2025-07-21 15:58:11', '2025-07-22 08:19:39'),
('physics23', 'Cyclop Physics LP', 'cyclop-physics-lp', 'https://files.sportrz.com/Games/CyclopPhysicsLP/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172274/game-thumbnails/j4pktehoamg1ed7kndot.png', NULL, 1, 0, 233, '2025-07-21 15:58:21', '2025-07-22 08:17:59'),
('platformer21', 'Blowfish Bounce 2', 'blowfish-bounce-2', 'https://files.sportrz.com/Games/blow-fish2/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172406/game-thumbnails/kypuo44rezpqfvpjaeww.png', NULL, 1, 0, 206, '2025-07-21 15:58:12', '2025-07-22 08:20:08'),
('platformer22', 'Bristlies Return', 'bristlies-return', 'https://files.sportrz.com/Games/Bristlies2/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172454/game-thumbnails/wexwmy2f3cvoagjdegpr.png', NULL, 1, 0, 208, '2025-07-21 15:58:12', '2025-07-22 08:20:55'),
('platformer23', 'Bubble Jumper', 'bubble-jumper', 'https://files.sportrz.com/Games/bubblejumper/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-34.webp', NULL, 1, 0, 211, '2025-07-21 15:58:13', '2025-07-21 15:58:13'),
('platformer24', 'Cat Jump Journey', 'cat-jump-journey', 'https://files.sportrz.com/Games/catjump/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172483/game-thumbnails/ohhyiekisy8yxa19nmzu.png', NULL, 1, 0, 221, '2025-07-21 15:58:16', '2025-07-22 08:21:24'),
('platformer25', 'Chopman Run', 'chopman-run', 'https://files.sportrz.com/Games/chopman/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172546/game-thumbnails/v3n4obepizhk34bce74g.png', NULL, 1, 0, 225, '2025-07-21 15:58:18', '2025-07-22 08:22:37'),
('platformer26', 'Dark Dash', 'dark-dash', 'https://files.sportrz.com/Games/darkdash/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T130030.683.webp', NULL, 1, 0, 235, '2025-07-21 15:58:22', '2025-07-21 15:58:22'),
('platformer27', 'Dragon Climb', 'dragon-climb', 'https://files.sportrz.com/Games/DragonClimb/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T130445.268.webp', NULL, 1, 0, 240, '2025-07-21 15:58:23', '2025-07-21 15:58:23'),
('platformer28', 'Flap 360', 'flap-360', 'https://files.sportrz.com/Games/flap360/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172647/game-thumbnails/zkkhyfdprk7idzkyvo7r.png', NULL, 1, 0, 259, '2025-07-21 15:58:29', '2025-07-22 08:24:08'),
('platformer29', 'Flappy Nerd', 'flappy-nerd', 'https://files.sportrz.com/Games/FlappyNerd/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172698/game-thumbnails/odzeuax6dv2aw71ulxiq.png', NULL, 1, 0, 260, '2025-07-21 15:58:30', '2025-07-22 08:25:00'),
('platformer30', 'Froggee Jump', 'froggee-jump', 'https://files.sportrz.com/Games/Froggee/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-79.webp', NULL, 1, 0, 269, '2025-07-21 15:58:34', '2025-07-21 15:58:34'),
('platformer31', 'Ghost Fall', 'ghost-fall', 'https://files.sportrz.com/Games/ghostfall/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172794/game-thumbnails/ce0tqs3ehnl6syzu0l0x.png', NULL, 1, 0, 281, '2025-07-21 15:58:39', '2025-07-22 08:26:36'),
('platformer32', 'Gravity Alien', 'gravity-alien', 'https://files.sportrz.com/Games/gravityalien/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172924/game-thumbnails/jj5z8wi58ztaaufoj5ch.png', NULL, 1, 0, 286, '2025-07-21 15:58:42', '2025-07-22 08:28:50'),
('platformer33', 'Hungry Dude', 'hungry-dude', 'https://files.sportrz.com/Games/hungrydude/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753172988/game-thumbnails/vh63742nsxzrpwu80orn.png', NULL, 1, 0, 297, '2025-07-21 15:58:46', '2025-07-22 08:29:50'),
('platformer34', 'Jetpack Escape', 'jetpack-escape', 'https://files.sportrz.com/Games/JetpackEscape/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753173018/game-thumbnails/w13kcn6zxzi5z2mjnc4w.png', NULL, 1, 0, 304, '2025-07-21 15:58:49', '2025-07-22 08:30:22'),
('platformer35', 'Jet Penguin', 'jet-penguin', 'https://files.sportrz.com/Games/jetpenguin/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-94.webp', NULL, 1, 0, 305, '2025-07-21 15:58:49', '2025-07-21 15:58:49'),
('platformer36', 'Jumpers Rush', 'jumpers-rush', 'https://files.sportrz.com/Games/jumpers/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T161337.133.webp', NULL, 1, 0, 307, '2025-07-21 15:58:49', '2025-07-21 15:58:49'),
('platformer37', 'Jump Escape', 'jump-escape', 'https://files.sportrz.com/Games/JumpEscape/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T162424.160.webp', NULL, 1, 0, 308, '2025-07-21 15:58:50', '2025-07-21 15:58:50'),
('platformer38', 'Jump Guy', 'jump-guy', 'https://files.sportrz.com/Games/jumpguy/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T160139.188.webp', NULL, 1, 0, 309, '2025-07-21 15:58:50', '2025-07-21 15:58:50'),
('platformer39', 'Jumping Light', 'jumping-light', 'https://files.sportrz.com/Games/JumpingLight/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T163852.890.webp', NULL, 1, 0, 310, '2025-07-21 15:58:50', '2025-07-21 15:58:50'),
('platformer40', 'Jumping Snail', 'jumping-snail', 'https://files.sportrz.com/Games/JumpingSnail/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753177784/game-thumbnails/n3ludnko2ultjni8tvug.png', NULL, 1, 0, 311, '2025-07-21 15:58:51', '2025-07-22 09:49:46'),
('platformer41', 'Knight Run', 'knight-run', 'https://files.sportrz.com/Games/knightrun/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T124355.428.webp', NULL, 1, 0, 314, '2025-07-21 15:58:51', '2025-07-21 15:58:51'),
('platformer42', 'Kongman Adventure', 'kongman-adventure', 'https://files.sportrz.com/Games/Kongman/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T125230.102.webp', NULL, 1, 0, 315, '2025-07-21 15:58:52', '2025-07-21 15:58:52'),
('platformer43', 'Little Big Runner', 'little-big-runner', 'https://files.sportrz.com/Games/LitleBigRunner/index.html', 'https://files.sportrz.com/2024/12/sdgtae.png', NULL, 1, 0, 318, '2025-07-21 15:58:53', '2025-07-21 15:58:53'),
('platformer44', 'Little Big Runners', 'little-big-runners', 'https://files.sportrz.com/Games/littlebigrunners/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T141050.424.webp', NULL, 1, 0, 319, '2025-07-21 15:58:53', '2025-07-21 15:58:53'),
('platformer45', 'Magic Dash', 'magic-dash', 'https://files.sportrz.com/Games/magicdash/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753177860/game-thumbnails/doo5nv1qd4cdl9jmkhht.png', NULL, 1, 0, 320, '2025-07-21 15:58:53', '2025-07-22 09:51:02'),
('platformer46', 'Ninja Blocker', 'ninja-blocker', 'https://files.sportrz.com/Games/ninjablocker/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143341.582.webp', NULL, 1, 0, 338, '2025-07-21 15:58:58', '2025-07-21 15:58:58'),
('platformer47', 'Ninja Rescue', 'ninja-rescue', 'https://files.sportrz.com/Games/ninjarescue/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753177734/game-thumbnails/ykzlx8dd9eblxpgaipri.png', NULL, 1, 0, 339, '2025-07-21 15:58:58', '2025-07-22 09:48:56'),
('platformer48', 'Panda Escape', 'panda-escape', 'https://files.sportrz.com/Games/pandaescape/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T144552.779.webp', NULL, 1, 0, 340, '2025-07-21 15:58:59', '2025-07-21 15:58:59'),
('puzzle10', 'Sudoku Blitz', 'sudoku-blitz', 'https://files.sportrz.com/Games/548/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178336/game-thumbnails/ja5gno4geguueesru5df.png', NULL, 1, 0, 130, '2025-07-21 15:57:44', '2025-07-22 09:58:58'),
('puzzle11', 'Puzzle Portal', 'puzzle-portal', 'https://files.sportrz.com/Games/549/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178372/game-thumbnails/ej4gikdevaounamwdw7h.png', NULL, 1, 0, 131, '2025-07-21 15:57:45', '2025-07-22 09:59:34'),
('puzzle12', 'Tangle Tactics', 'tangle-tactics', 'https://files.sportrz.com/Games/550/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178404/game-thumbnails/rtitm0d2ai1lhgbmyccc.png', NULL, 1, 0, 132, '2025-07-21 15:57:45', '2025-07-22 10:00:05'),
('puzzle13', 'Slide Riddle', 'slide-riddle', 'https://files.sportrz.com/Games/551/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178433/game-thumbnails/ma2kggksjqyusbzimzhl.png', NULL, 1, 0, 133, '2025-07-21 15:57:45', '2025-07-22 10:00:34'),
('puzzle14', 'Unlock Vault', 'unlock-vault', 'https://files.sportrz.com/Games/552/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178470/game-thumbnails/um35cxlfvfqaejptldqd.png', NULL, 1, 0, 134, '2025-07-21 15:57:46', '2025-07-22 10:01:12'),
('puzzle15', 'Smart Stack', 'smart-stack', 'https://files.sportrz.com/Games/553/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753179280/game-thumbnails/xtchaigjpwatby1xaufx.png', NULL, 1, 0, 135, '2025-07-21 15:57:46', '2025-07-22 10:14:41'),
('puzzle16', 'Memory Circuit', 'memory-circuit', 'https://files.sportrz.com/Games/565/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753179349/game-thumbnails/aw7ydk0abh1f4tzycz98.png', NULL, 1, 0, 136, '2025-07-21 15:57:47', '2025-07-22 10:15:51'),
('puzzle17', 'Puzzle Pyramid', 'puzzle-pyramid', 'https://files.sportrz.com/Games/573/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753179399/game-thumbnails/zxf3ku1hreatingaxiyo.png', NULL, 1, 0, 137, '2025-07-21 15:57:47', '2025-07-22 10:16:43'),
('puzzle18', 'Mind Match', 'mind-match', 'https://files.sportrz.com/Games/574/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753179449/game-thumbnails/zveqe4uovxoo0kbdunt9.png', NULL, 1, 0, 138, '2025-07-21 15:57:47', '2025-07-22 10:17:32'),
('puzzle19', 'Riddle Runner', 'riddle-runner', 'https://files.sportrz.com/Games/576/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753179489/game-thumbnails/bgwjkpemnmbloi46axa4.png', NULL, 1, 0, 139, '2025-07-21 15:57:48', '2025-07-22 10:18:11'),
('puzzle2', 'Tile Twister', 'tile-twister', 'https://files.sportrz.com/Games/540/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753177958/game-thumbnails/ir5ecgf1y8l1nf2tnbj6.png', NULL, 1, 0, 122, '2025-07-21 15:57:41', '2025-07-22 09:52:39'),
('puzzle20', 'Code Breaker', 'code-breaker', 'https://files.sportrz.com/Games/577/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753179516/game-thumbnails/d7fmmf5qgsuymgeevydd.png', NULL, 1, 0, 140, '2025-07-21 15:57:48', '2025-07-22 10:18:38'),
('puzzle21', 'Strudel Stack', 'strudel-stack', 'https://files.sportrz.com/Games/BavarianStrudel/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753179622/game-thumbnails/cwucnjmfycxgims7hsrb.png', NULL, 1, 0, 201, '2025-07-21 15:58:10', '2025-07-22 10:20:25'),
('puzzle22', 'Blue Box Puzzle', 'blue-box-puzzle', 'https://files.sportrz.com/Games/BlueBox2/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753179558/game-thumbnails/bq43blicmlmhpoy5dhn4.png', NULL, 1, 0, 207, '2025-07-21 15:58:12', '2025-07-22 10:19:21'),
('puzzle23', 'Bubble Hero Saga', 'bubble-hero-saga', 'https://files.sportrz.com/Games/bubble_hero/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-51.webp', NULL, 1, 0, 209, '2025-07-21 15:58:12', '2025-07-21 15:58:12'),
('puzzle24', 'Bubble Hit Classic', 'bubble-hit-classic', 'https://files.sportrz.com/Games/bubblehit/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-31.webp', NULL, 1, 0, 210, '2025-07-21 15:58:13', '2025-07-21 15:58:13'),
('puzzle25', 'Bunny Blox Escape', 'bunny-blox-escape', 'https://files.sportrz.com/Games/Bunny-Blox/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-18.webp', NULL, 1, 0, 213, '2025-07-21 15:58:14', '2025-07-21 15:58:14'),
('puzzle26', 'Candy Drop Pop', 'candy-drop-pop', 'https://files.sportrz.com/Games/candydrop/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-25.webp', NULL, 1, 0, 214, '2025-07-21 15:58:14', '2025-07-21 15:58:14'),
('puzzle27', 'Candy Swipe Classic', 'candy-swipe-classic', 'https://files.sportrz.com/Games/Candy-Swipe/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-37.webp', NULL, 1, 0, 217, '2025-07-21 15:58:15', '2025-07-21 15:58:15');
INSERT INTO `games` (`id`, `name`, `slug`, `path`, `thumbnail`, `description`, `is_active`, `is_featured`, `display_order`, `created_at`, `updated_at`) VALUES
('puzzle28', 'Candy Zuma', 'candy-zuma', 'https://files.sportrz.com/Games/Candyzuma/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753180378/game-thumbnails/dncclpcxqywf71gwgzr6.png', NULL, 1, 0, 218, '2025-07-21 15:58:15', '2025-07-22 10:32:59'),
('puzzle29', 'Candy Zuma Pro', 'candy-zuma-pro', 'https://files.sportrz.com/Games/candyzuma_11318/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-56.webp', NULL, 1, 0, 219, '2025-07-21 15:58:16', '2025-07-21 15:58:16'),
('puzzle3', 'Logic Gridlock', 'logic-gridlock', 'https://files.sportrz.com/Games/541/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753177999/game-thumbnails/eumevfq4aozxnqktbozi.png', NULL, 1, 0, 123, '2025-07-21 15:57:42', '2025-07-22 09:53:21'),
('puzzle30', 'Chain Reaction', 'chain-reaction', 'https://files.sportrz.com/Games/Chain/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-73.webp', NULL, 1, 0, 222, '2025-07-21 15:58:17', '2025-07-21 15:58:17'),
('puzzle31', 'Circle Chain', 'circle-chain', 'https://files.sportrz.com/Games/Circles/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-91.webp', NULL, 1, 0, 226, '2025-07-21 15:58:18', '2025-07-21 15:58:18'),
('puzzle32', 'Color Blast!', 'color-blast', 'https://files.sportrz.com/Games/Colorblast/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T163237.717.webp', NULL, 1, 0, 228, '2025-07-21 15:58:19', '2025-07-21 15:58:19'),
('puzzle33', 'Color Boom', 'color-boom', 'https://files.sportrz.com/Games/Colorboom/index.html', 'https://files.sportrz.com/2024/12/srg.png', NULL, 1, 0, 229, '2025-07-21 15:58:19', '2025-07-21 15:58:19'),
('puzzle34', 'Color Traction', 'color-traction', 'https://files.sportrz.com/Games/Colortraction/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753182576/game-thumbnails/y50lqlkb8xwd7sroiptm.png', NULL, 1, 0, 230, '2025-07-21 15:58:20', '2025-07-22 11:09:38'),
('puzzle35', 'Drawinism Evolution', 'drawinism-evolution', 'https://files.sportrz.com/Games/Drawinism/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753182894/game-thumbnails/cmqesz6zykppbkzipuib.png', NULL, 1, 0, 241, '2025-07-21 15:58:24', '2025-07-22 11:14:55'),
('puzzle36', 'Drawinism 2048', 'drawinism-2048', 'https://files.sportrz.com/Games/Drawinism2048/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753182932/game-thumbnails/juwnruc7cdmxc0noszhh.png', NULL, 1, 0, 242, '2025-07-21 15:58:24', '2025-07-22 11:15:34'),
('puzzle37', 'Exit Searcher', 'exit-searcher', 'https://files.sportrz.com/Games/Exitsearcher/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T130711.957.webp', NULL, 1, 0, 246, '2025-07-21 15:58:25', '2025-07-21 15:58:25'),
('puzzle38', 'Falling Jewels', 'falling-jewels', 'https://files.sportrz.com/Games/Falling-Jewels/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-43.webp', NULL, 1, 0, 248, '2025-07-21 15:58:26', '2025-07-21 15:58:26'),
('puzzle39', 'Fanged Fun LP', 'fanged-fun-lp', 'https://files.sportrz.com/Games/FangedFunLP/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-46.webp', NULL, 1, 0, 250, '2025-07-21 15:58:27', '2025-07-21 15:58:27'),
('puzzle4', 'Pattern Pulse', 'pattern-pulse', 'https://files.sportrz.com/Games/542/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178052/game-thumbnails/sujjao8hshoitclpcjg5.png', NULL, 1, 0, 124, '2025-07-21 15:57:42', '2025-07-22 09:54:14'),
('puzzle40', 'Fox n Roll: Player\'s Pack', 'fox-n-roll-player-s-pack', 'https://files.sportrz.com/Games/foxnroll_players_pack/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-35.webp', NULL, 1, 0, 265, '2025-07-21 15:58:33', '2025-07-21 15:58:33'),
('puzzle41', 'Fox n Roll PP', 'fox-n-roll-pp', 'https://files.sportrz.com/Games/FoxnRollPP/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-24.webp', NULL, 1, 0, 266, '2025-07-21 15:58:33', '2025-07-21 15:58:33'),
('puzzle42', 'Fox n Roll Pro', 'fox-n-roll-pro', 'https://files.sportrz.com/Games/FoxnRollPro/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-77.webp', NULL, 1, 0, 267, '2025-07-21 15:58:34', '2025-07-21 15:58:34'),
('puzzle43', 'Fruit Pop Blast', 'fruit-pop-blast', 'https://files.sportrz.com/Games/fruitpop/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T174842.829.webp', NULL, 1, 0, 272, '2025-07-21 15:58:36', '2025-07-21 15:58:36'),
('puzzle44', 'Gemollection', 'gemollection', 'https://files.sportrz.com/Games/Gemollection/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T124116.523.webp', NULL, 1, 0, 277, '2025-07-21 15:58:38', '2025-07-21 15:58:38'),
('puzzle45', 'Gemollection 2', 'gemollection-2', 'https://files.sportrz.com/Games/Gemollection2/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T130331.072.webp', NULL, 1, 0, 278, '2025-07-21 15:58:38', '2025-07-21 15:58:38'),
('puzzle46', 'Gentleman Rescue 2', 'gentleman-rescue-2', 'https://files.sportrz.com/Games/Gentlemanrescue2/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T130819.113.webp', NULL, 1, 0, 279, '2025-07-21 15:58:38', '2025-07-21 15:58:38'),
('puzzle47', 'Get the Weight', 'get-the-weight', 'https://files.sportrz.com/Games/GettheWeaight/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T131138.570.webp', NULL, 1, 0, 280, '2025-07-21 15:58:39', '2025-07-21 15:58:39'),
('puzzle48', 'Grand Dot 2048', 'grand-dot-2048', 'https://files.sportrz.com/Games/GrandDot2048/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T141730.965.webp', NULL, 1, 0, 285, '2025-07-21 15:58:41', '2025-07-21 15:58:41'),
('puzzle49', 'Gravity Tree', 'gravity-tree', 'https://files.sportrz.com/Games/gravitytree/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T132351.622.webp', NULL, 1, 0, 287, '2025-07-21 15:58:42', '2025-07-21 15:58:42'),
('puzzle5', 'Boxy Escape', 'boxy-escape', 'https://files.sportrz.com/Games/543/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178114/game-thumbnails/m9j3zem8wcnc8fljueas.png', NULL, 1, 0, 125, '2025-07-21 15:57:42', '2025-07-22 09:55:16'),
('puzzle50', 'Haunted Halloween', 'haunted-halloween', 'https://files.sportrz.com/Games/HauntedHalloween/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753182965/game-thumbnails/ftrapak8zzq9s81ovljk.png', NULL, 1, 0, 289, '2025-07-21 15:58:43', '2025-07-22 11:16:15'),
('puzzle51', 'Hide a Gift', 'hide-a-gift', 'https://files.sportrz.com/Games/Hideagift/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753183102/game-thumbnails/ml6ep3gmcivlqtrevlc8.png', NULL, 1, 0, 291, '2025-07-21 15:58:44', '2025-07-22 11:18:24'),
('puzzle52', 'Hide Caesar', 'hide-caesar', 'https://files.sportrz.com/Games/HideCaesar/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-20.webp', NULL, 1, 0, 292, '2025-07-21 15:58:44', '2025-07-21 15:58:44'),
('puzzle53', 'Hide Caesar 2', 'hide-caesar-2', 'https://files.sportrz.com/Games/HideCaesar2/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T173009.252.webp', NULL, 1, 0, 293, '2025-07-21 15:58:44', '2025-07-21 15:58:44'),
('puzzle54', 'Honey Bee Lines', 'honey-bee-lines', 'https://files.sportrz.com/Games/HoneyBeeLines/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753183186/game-thumbnails/dwwsf5vn7at1xl3npqos.png', NULL, 1, 0, 294, '2025-07-21 15:58:45', '2025-07-22 11:19:47'),
('puzzle55', 'HTML5 Images', 'html5-images', 'https://files.sportrz.com/Games/Html5images/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-89.webp', NULL, 1, 0, 295, '2025-07-21 15:58:45', '2025-07-21 15:58:45'),
('puzzle56', 'HTML5 Response', 'html5-response', 'https://files.sportrz.com/Games/html5response/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T123721.484.webp', NULL, 1, 0, 296, '2025-07-21 15:58:46', '2025-07-21 15:58:46'),
('puzzle57', 'Jelly Blast', 'jelly-blast', 'https://files.sportrz.com/Games/jelly-blast/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-84.webp', NULL, 1, 0, 301, '2025-07-21 15:58:48', '2025-07-21 15:58:48'),
('puzzle58', 'Jelly Drop', 'jelly-drop', 'https://files.sportrz.com/Games/Jelly-Drop/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-86.webp', NULL, 1, 0, 302, '2025-07-21 15:58:48', '2025-07-21 15:58:48'),
('puzzle59', 'Jewel Crush', 'jewel-crush', 'https://files.sportrz.com/Games/jewelcrush/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-97.webp', NULL, 1, 0, 306, '2025-07-21 15:58:49', '2025-07-21 15:58:49'),
('puzzle6', 'Pathfinder Quest', 'pathfinder-quest', 'https://files.sportrz.com/Games/544/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178149/game-thumbnails/gjkptd6exg9qwnjycula.png', NULL, 1, 0, 126, '2025-07-21 15:57:43', '2025-07-22 09:55:50'),
('puzzle60', 'Let Them Fall', 'let-them-fall', 'https://files.sportrz.com/Games/letthemfall/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T132605.539.webp', NULL, 1, 0, 316, '2025-07-21 15:58:52', '2025-07-21 15:58:52'),
('puzzle61', 'Lineum Flow', 'lineum-flow', 'https://files.sportrz.com/Games/Lineum/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T132711.551.webp', NULL, 1, 0, 317, '2025-07-21 15:58:52', '2025-07-21 15:58:52'),
('puzzle62', 'Mahjong Farm Style', 'mahjong-farm-style', 'https://files.sportrz.com/Games/mahjong-farm-style/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143129.204.webp', NULL, 1, 0, 321, '2025-07-21 15:58:53', '2025-07-21 15:58:53'),
('puzzle63', 'Merry Township', 'merry-township', 'https://files.sportrz.com/Games/MerryTownship/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143459.257.webp', NULL, 1, 0, 326, '2025-07-21 15:58:55', '2025-07-21 15:58:55'),
('puzzle64', 'Monsthree Puzzle', 'monsthree-puzzle', 'https://files.sportrz.com/Games/monsthree/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-16.webp', NULL, 1, 0, 329, '2025-07-21 15:58:56', '2025-07-21 15:58:56'),
('puzzle65', 'Mouse Pop', 'mouse-pop', 'https://files.sportrz.com/Games/MousePop/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-19.webp', NULL, 1, 0, 330, '2025-07-21 15:58:56', '2025-07-21 15:58:56'),
('puzzle66', 'Mouse Trap', 'mouse-trap', 'https://files.sportrz.com/Games/mousetrap/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-8.webp', NULL, 1, 0, 331, '2025-07-21 15:58:56', '2025-07-21 15:58:56'),
('puzzle67', 'Mysterious Treasures', 'mysterious-treasures', 'https://files.sportrz.com/Games/MysteriousTreasures/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753185787/game-thumbnails/zz0pzsgcwnddvqkuleji.png', NULL, 1, 0, 333, '2025-07-21 15:58:57', '2025-07-22 12:03:09'),
('puzzle68', 'Mystery Temple', 'mystery-temple', 'https://files.sportrz.com/Games/MysteryTemple/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753185596/game-thumbnails/hwbllzeng2kdwgugovue.png', NULL, 1, 0, 334, '2025-07-21 15:58:57', '2025-07-22 11:59:57'),
('puzzle69', 'New Updated', 'new-updated', 'https://files.sportrz.com/Games/newupdated/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T142950.360.webp', NULL, 1, 0, 337, '2025-07-21 15:58:58', '2025-07-21 15:58:58'),
('puzzle7', 'Color Cube Craze', 'color-cube-craze', 'https://files.sportrz.com/Games/545/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178181/game-thumbnails/j6gjimuewaheignrt7n0.png', NULL, 1, 0, 127, '2025-07-21 15:57:43', '2025-07-22 09:56:23'),
('puzzle8', 'Shape Shift Saga', 'shape-shift-saga', 'https://files.sportrz.com/Games/546/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178232/game-thumbnails/ivzwuoloxewpidzsiexu.png', NULL, 1, 0, 128, '2025-07-21 15:57:43', '2025-07-22 09:57:13'),
('puzzle9', 'Brain Bounce', 'brain-bounce', 'https://files.sportrz.com/Games/547/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753178282/game-thumbnails/h9pbrpvddkduexnajz7m.png', NULL, 1, 0, 129, '2025-07-21 15:57:44', '2025-07-22 09:58:03'),
('racing1', 'Neon Wheels', 'neon-wheels', 'https://files.sportrz.com/Games/291/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-99-1.webp', NULL, 1, 0, 81, '2025-07-21 15:57:22', '2025-07-21 15:57:22'),
('racing10', 'Gear Up', 'gear-up', 'https://files.sportrz.com/Games/315/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T161103.010-1.webp', NULL, 1, 0, 90, '2025-07-21 15:57:25', '2025-07-21 15:57:25'),
('racing11', 'Turbo Track', 'turbo-track', 'https://files.sportrz.com/Games/319/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T161337.133-1.webp', NULL, 1, 0, 91, '2025-07-21 15:57:26', '2025-07-21 15:57:26'),
('racing12', 'Velocity Drift', 'velocity-drift', 'https://files.sportrz.com/Games/324/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T161853.824-1.webp', NULL, 1, 0, 92, '2025-07-21 15:57:26', '2025-07-21 15:57:26'),
('racing13', 'Turbo Track', 'turbo-track-racing13', 'https://files.sportrz.com/Games/332/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T162137.046-1.webp', NULL, 1, 0, 93, '2025-07-21 15:57:26', '2025-07-21 15:57:26'),
('racing14', 'Lava Road', 'lava-road', 'https://files.sportrz.com/Games/342/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T162308.891-1.webp', NULL, 1, 0, 94, '2025-07-21 15:57:27', '2025-07-21 15:57:27'),
('racing15', 'Nitro Dash', 'nitro-dash', 'https://files.sportrz.com/Games/352/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T162424.160-1.webp', NULL, 1, 0, 95, '2025-07-21 15:57:27', '2025-07-21 15:57:27'),
('racing16', 'Circuit Burn', 'circuit-burn', 'https://files.sportrz.com/Games/356/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T163237.717-1.webp', NULL, 1, 0, 96, '2025-07-21 15:57:27', '2025-07-21 15:57:27'),
('racing17', 'Boost Riders', 'boost-riders', 'https://files.sportrz.com/Games/364/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T163457.382-1.webp', NULL, 1, 0, 97, '2025-07-21 15:57:28', '2025-07-21 15:57:28'),
('racing18', 'Pixel Racer', 'pixel-racer', 'https://files.sportrz.com/Games/388/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T162700.091-1.webp', NULL, 1, 0, 98, '2025-07-21 15:57:28', '2025-07-21 15:57:28'),
('racing19', 'Fuel Frenzy', 'fuel-frenzy', 'https://files.sportrz.com/Games/394/index.html', 'https://files.sportrz.com/2024/12/srg-1.png', NULL, 1, 0, 99, '2025-07-21 15:57:28', '2025-07-21 15:57:28'),
('racing2', 'Turbo Track', 'turbo-track-racing2', 'https://files.sportrz.com/Games/293/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-97-1.webp', NULL, 1, 0, 82, '2025-07-21 15:57:22', '2025-07-21 15:57:22'),
('racing20', 'Overdrive', 'overdrive', 'https://files.sportrz.com/Games/417/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T163852.890-1.webp', NULL, 1, 0, 100, '2025-07-21 15:57:29', '2025-07-21 15:57:29'),
('racing21', 'Bird Copter Run', 'bird-copter-run', 'https://files.sportrz.com/Games/birdcopter/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-27.webp', NULL, 1, 0, 203, '2025-07-21 15:58:11', '2025-07-21 15:58:11'),
('racing3', 'Speed Horizon', 'speed-horizon', 'https://files.sportrz.com/Games/294/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-100-1.webp', NULL, 1, 0, 83, '2025-07-21 15:57:23', '2025-07-21 15:57:23'),
('racing4', 'Nitro Dash', 'nitro-dash-racing4', 'https://files.sportrz.com/Games/298/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T155220.845-1.webp', NULL, 1, 0, 84, '2025-07-21 15:57:23', '2025-07-21 15:57:23'),
('racing5', 'Asphalt Heat', 'asphalt-heat', 'https://files.sportrz.com/Games/303/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T155358.858-1.webp', NULL, 1, 0, 85, '2025-07-21 15:57:23', '2025-07-21 15:57:23'),
('racing6', 'Asphalt Heat', 'asphalt-heat-racing6', 'https://files.sportrz.com/Games/304/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T155645.505-1.webp', NULL, 1, 0, 86, '2025-07-21 15:57:24', '2025-07-21 15:57:24'),
('racing7', 'Overdrive', 'overdrive-racing7', 'https://files.sportrz.com/Games/305/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T155946.679-1.webp', NULL, 1, 0, 87, '2025-07-21 15:57:24', '2025-07-21 15:57:24'),
('racing8', 'Speed Horizon', 'speed-horizon-racing8', 'https://files.sportrz.com/Games/310/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T160139.188-1.webp', NULL, 1, 0, 88, '2025-07-21 15:57:24', '2025-07-21 15:57:24'),
('racing9', 'Circuit Burn', 'circuit-burn-racing9', 'https://files.sportrz.com/Games/314/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T160553.266-1.webp', NULL, 1, 0, 89, '2025-07-21 15:57:25', '2025-07-21 15:57:25'),
('shooter1', 'Bullet Rush', 'bullet-rush', 'https://files.sportrz.com/Games/578/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186117/game-thumbnails/ej5wv37hfmyaqtdf5gdc.png', NULL, 1, 0, 141, '2025-07-21 15:57:48', '2025-07-22 12:08:39'),
('shooter10', 'Laser Wrath', 'laser-wrath', 'https://files.sportrz.com/Games/627/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186294/game-thumbnails/yq4zf2dxlav9dngfjadf.png', NULL, 1, 0, 150, '2025-07-21 15:57:52', '2025-07-22 12:11:36'),
('shooter11', 'Trigger Titan', 'trigger-titan', 'https://files.sportrz.com/Games/628/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186326/game-thumbnails/z6unuigqhyiedmpg9g12.png', NULL, 1, 0, 151, '2025-07-21 15:57:52', '2025-07-22 12:12:07'),
('shooter12', 'Firestorm Arena', 'firestorm-arena', 'https://files.sportrz.com/Games/629/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T131614.936-2.webp', NULL, 1, 0, 152, '2025-07-21 15:57:53', '2025-07-21 15:57:53'),
('shooter13', 'Shadow Hitman', 'shadow-hitman', 'https://files.sportrz.com/Games/630/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186369/game-thumbnails/j2njsapak0wqoljhrpjx.png', NULL, 1, 0, 153, '2025-07-21 15:57:53', '2025-07-22 12:12:51'),
('shooter14', 'Neon Sniper', 'neon-sniper', 'https://files.sportrz.com/Games/631/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186403/game-thumbnails/rnvvuv496bxoqh6u7owz.png', NULL, 1, 0, 154, '2025-07-21 15:57:54', '2025-07-22 12:13:26'),
('shooter15', 'Cyber Slugfest', 'cyber-slugfest', 'https://files.sportrz.com/Games/632/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186442/game-thumbnails/ctbwjujhilwhhyxfpdbq.png', NULL, 1, 0, 155, '2025-07-21 15:57:54', '2025-07-22 12:14:03'),
('shooter16', 'Missile Rain', 'missile-rain', 'https://files.sportrz.com/Games/633/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186477/game-thumbnails/ciildo9h0y8bntbkxdgp.jpg', NULL, 1, 0, 156, '2025-07-21 15:57:55', '2025-07-22 12:14:39'),
('shooter17', 'Deadlock Reload', 'deadlock-reload', 'https://files.sportrz.com/Games/634/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186577/game-thumbnails/dkpaodukwzw5kee8w059.png', NULL, 1, 0, 157, '2025-07-21 15:57:55', '2025-07-22 12:16:19'),
('shooter18', 'Gunfire Elite', 'gunfire-elite', 'https://files.sportrz.com/Games/635/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186602/game-thumbnails/cgzy3kpwplsld8wa2128.png', NULL, 1, 0, 158, '2025-07-21 15:57:55', '2025-07-22 12:16:45'),
('shooter19', 'Stealth Raid', 'stealth-raid', 'https://files.sportrz.com/Games/636/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186633/game-thumbnails/opqplvbesx8ebvzwhddq.png', NULL, 1, 0, 159, '2025-07-21 15:57:56', '2025-07-22 12:17:15'),
('shooter2', 'Sniper Fury', 'sniper-fury', 'https://files.sportrz.com/Games/618/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T130331.072-2.webp', NULL, 1, 0, 142, '2025-07-21 15:57:49', '2025-07-21 15:57:49'),
('shooter20', 'Battle Protocol', 'battle-protocol', 'https://files.sportrz.com/Games/637/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753171205/game-thumbnails/tf0m1mfrblymox0yfrxv.png', NULL, 1, 0, 160, '2025-07-21 15:57:57', '2025-07-22 08:00:07'),
('shooter21', 'Candy Slingshot', 'candy-slingshot', 'https://files.sportrz.com/Games/CandySlingShot/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-33.webp', NULL, 1, 0, 215, '2025-07-21 15:58:14', '2025-07-21 15:58:14'),
('shooter22', 'Dual Blaster', 'dual-blaster', 'https://files.sportrz.com/Games/dual/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186693/game-thumbnails/ppr4wd93jmsmapin8npd.png', NULL, 1, 0, 243, '2025-07-21 15:58:24', '2025-07-22 12:18:16'),
('shooter23', 'Fighter Aircraft 3D', 'fighter-aircraft-3d', 'https://files.sportrz.com/Games/FighterAircraft/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-29.webp', NULL, 1, 0, 257, '2025-07-21 15:58:29', '2025-07-21 15:58:29'),
('shooter24', 'Fruit Slingshot', 'fruit-slingshot', 'https://files.sportrz.com/Games/FruitSlingShot/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T123510.722.webp', NULL, 1, 0, 275, '2025-07-21 15:58:37', '2025-07-21 15:58:37'),
('shooter25', 'Hell On Duty', 'hell-on-duty', 'https://files.sportrz.com/Games/HellOnDuty/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-100.webp', NULL, 1, 0, 290, '2025-07-21 15:58:43', '2025-07-21 15:58:43'),
('shooter26', 'Hunter Willie', 'hunter-willie', 'https://files.sportrz.com/Games/HunterWillie/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186744/game-thumbnails/vbpubytlyb6cjw1y1rh1.png', NULL, 1, 0, 298, '2025-07-21 15:58:46', '2025-07-22 12:19:05'),
('shooter27', 'Indi Cannon', 'indi-cannon', 'https://files.sportrz.com/Games/IndiCannon/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186776/game-thumbnails/umjssduvzxgytsutvtfa.png', NULL, 1, 0, 299, '2025-07-21 15:58:47', '2025-07-22 12:19:38'),
('shooter28', 'Indi Cannon PP', 'indi-cannon-pp', 'https://files.sportrz.com/Games/IndiCannonPP/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186812/game-thumbnails/diusc8thebl7re50bn9l.png', NULL, 1, 0, 300, '2025-07-21 15:58:47', '2025-07-22 12:20:14'),
('shooter29', 'Jelly Shot', 'jelly-shot', 'https://files.sportrz.com/Games/JellyShot/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-88.webp', NULL, 1, 0, 303, '2025-07-21 15:58:48', '2025-07-21 15:58:48'),
('shooter3', 'Alien Onslaught', 'alien-onslaught', 'https://files.sportrz.com/Games/620/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T130445.268-2.webp', NULL, 1, 0, 143, '2025-07-21 15:57:49', '2025-07-21 15:57:49'),
('shooter30', 'Jumpz at Zombies', 'jumpz-at-zombies', 'https://files.sportrz.com/Games/jumpsatzombies/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186852/game-thumbnails/dd7ptoh35z1tjho0nbjt.png', NULL, 1, 0, 312, '2025-07-21 15:58:51', '2025-07-22 12:20:54'),
('shooter4', 'Combat Commando', 'combat-commando', 'https://files.sportrz.com/Games/621/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186075/game-thumbnails/ct7rxy0lykwb45ubbqt2.png', NULL, 1, 0, 144, '2025-07-21 15:57:49', '2025-07-22 12:07:57'),
('shooter5', 'Pixel Firestorm', 'pixel-firestorm', 'https://files.sportrz.com/Games/622/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186181/game-thumbnails/bno2fzmyp5f1vxx0ymsv.png', NULL, 1, 0, 145, '2025-07-21 15:57:49', '2025-07-22 12:09:42'),
('shooter6', 'Zombie Shotdown', 'zombie-shotdown', 'https://files.sportrz.com/Games/623/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T130547.800-2.webp', NULL, 1, 0, 146, '2025-07-21 15:57:50', '2025-07-21 15:57:50'),
('shooter7', 'Blaster Brawl', 'blaster-brawl', 'https://files.sportrz.com/Games/624/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186219/game-thumbnails/nicsvwwpldntids5ubi0.png', NULL, 1, 0, 147, '2025-07-21 15:57:50', '2025-07-22 12:10:20'),
('shooter8', 'Warzone Assault', 'warzone-assault', 'https://files.sportrz.com/Games/625/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186240/game-thumbnails/wz0dohlgn6jvzlvjrnkh.png', NULL, 1, 0, 148, '2025-07-21 15:57:51', '2025-07-22 12:10:42'),
('shooter9', 'Strike Ops', 'strike-ops', 'https://files.sportrz.com/Games/626/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186265/game-thumbnails/ez2hdjnlyyosgfd1loxt.png', NULL, 1, 0, 149, '2025-07-21 15:57:51', '2025-07-22 12:11:07'),
('simulation21', 'Beauty Shop Blitz', 'beauty-shop-blitz', 'https://files.sportrz.com/Games/beautyshop/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186926/game-thumbnails/sumw43ovpy31yiiwvj4b.png', NULL, 1, 0, 202, '2025-07-21 15:58:11', '2025-07-22 12:22:09'),
('simulation22', 'Fancy Constructor', 'fancy-constructor', 'https://files.sportrz.com/Games/FancyConstructor/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753186954/game-thumbnails/bvetnpty1m7luucs86qp.png', NULL, 1, 0, 249, '2025-07-21 15:58:26', '2025-07-22 12:22:35'),
('simulation23', 'Farm Dream Days', 'farm-dream-days', 'https://files.sportrz.com/Games/Farm-Dream/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-23.webp', NULL, 1, 0, 253, '2025-07-21 15:58:28', '2025-07-21 15:58:28'),
('simulation24', 'Meow Dress Up', 'meow-dress-up', 'https://files.sportrz.com/Games/MeowDressUp/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T143233.625.webp', NULL, 1, 0, 325, '2025-07-21 15:58:55', '2025-07-21 15:58:55'),
('simulation25', 'Mega Slots', 'mega-slots', 'https://files.sportrz.com/Games/mega_slots/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T142434.445.webp', NULL, 1, 0, 324, '2025-07-21 15:58:54', '2025-07-21 15:58:54'),
('sports1', 'Turbo Dunk', 'turbo-dunk', 'https://files.sportrz.com/Games/486/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753187054/game-thumbnails/llevqrv7s1xfaxzcxtxd.png', NULL, 1, 0, 101, '2025-07-21 15:57:29', '2025-07-22 12:24:16'),
('sports10', 'Football Frenzy', 'football-frenzy', 'https://files.sportrz.com/Games/528/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248701/game-thumbnails/hsimbjxsk80zymjkfwer.png', NULL, 1, 0, 110, '2025-07-21 15:57:34', '2025-07-23 05:31:43'),
('sports11', 'Super Bowl Clash', 'super-bowl-clash', 'https://files.sportrz.com/Games/529/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248669/game-thumbnails/pexmvjqqi0jzkzqxp3qw.png', NULL, 1, 0, 111, '2025-07-21 15:57:35', '2025-07-23 05:31:11'),
('sports12', 'Ping Pong Smash', 'ping-pong-smash', 'https://files.sportrz.com/Games/530/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248634/game-thumbnails/kftydln8q5s4sdcdcekr.png', NULL, 1, 0, 112, '2025-07-21 15:57:35', '2025-07-23 05:30:36'),
('sports13', 'Snowboard Stunt', 'snowboard-stunt', 'https://files.sportrz.com/Games/531/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248583/game-thumbnails/hkoyuln6dowe8f1pdesu.png', NULL, 1, 0, 113, '2025-07-21 15:57:36', '2025-07-23 05:29:44'),
('sports14', 'Wrestle Royale', 'wrestle-royale', 'https://files.sportrz.com/Games/532/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248555/game-thumbnails/w1hptskrgujg4fmq7py6.png', NULL, 1, 0, 114, '2025-07-21 15:57:36', '2025-07-23 05:29:16'),
('sports15', 'Turbo Track', 'turbo-track-sports15', 'https://files.sportrz.com/Games/533/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248529/game-thumbnails/be5bblxctiatuk76pjey.png', NULL, 1, 0, 115, '2025-07-21 15:57:37', '2025-07-23 05:28:51'),
('sports16', 'Golf Kingpin', 'golf-kingpin', 'https://files.sportrz.com/Games/534/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248499/game-thumbnails/ow5wbdqlwcdg7vgxpkei.png', NULL, 1, 0, 116, '2025-07-21 15:57:38', '2025-07-23 05:28:21'),
('sports17', 'Stadium Stars', 'stadium-stars', 'https://files.sportrz.com/Games/535/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248454/game-thumbnails/azybh80sooktaf5uth2k.png', NULL, 1, 0, 117, '2025-07-21 15:57:39', '2025-07-23 05:27:36'),
('sports18', 'Ultimate Race Day', 'ultimate-race-day', 'https://files.sportrz.com/Games/536/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248426/game-thumbnails/xhgfcazo5hpbzgud4vrs.png', NULL, 1, 0, 118, '2025-07-21 15:57:39', '2025-07-23 05:27:07'),
('sports19', 'Penalty Kickoff', 'penalty-kickoff', 'https://files.sportrz.com/Games/537/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753247876/game-thumbnails/wqjrjpzw28l56wvi9lvr.png', NULL, 1, 0, 119, '2025-07-21 15:57:39', '2025-07-23 05:17:57'),
('sports2', 'Goal Blitz', 'goal-blitz', 'https://files.sportrz.com/Games/496/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753187086/game-thumbnails/n700rbkac5on24ouvfr0.png', NULL, 1, 0, 102, '2025-07-21 15:57:30', '2025-07-22 12:24:48'),
('sports20', 'Skater Rampage', 'skater-rampage', 'https://files.sportrz.com/Games/538/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-14T175953.593-1.webp', NULL, 1, 0, 120, '2025-07-21 15:57:40', '2025-07-21 15:57:40'),
('sports21', 'Bubble Soccer Bash', 'bubble-soccer-bash', 'https://files.sportrz.com/Games/bubble-soccer/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-15.webp', NULL, 1, 0, 212, '2025-07-21 15:58:13', '2025-07-21 15:58:13'),
('sports22', 'Eight Ball Tap', 'eight-ball-tap', 'https://files.sportrz.com/Games/eightball/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T131819.626.webp', NULL, 1, 0, 244, '2025-07-21 15:58:24', '2025-07-21 15:58:24'),
('sports3', 'Extreme Hoops', 'extreme-hoops', 'https://files.sportrz.com/Games/511/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248917/game-thumbnails/xynmr6pv7elypughvq6s.png', NULL, 1, 0, 103, '2025-07-21 15:57:30', '2025-07-23 05:35:18'),
('sports4', 'Speed Skater X', 'speed-skater-x', 'https://files.sportrz.com/Games/522/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248884/game-thumbnails/qhz8oy8pny7nlrtkk5jx.png', NULL, 1, 0, 104, '2025-07-21 15:57:31', '2025-07-23 05:34:45'),
('sports5', 'Power Serve Tennis', 'power-serve-tennis', 'https://files.sportrz.com/Games/523/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248835/game-thumbnails/wbgc1c045jwklumn3dr9.png', NULL, 1, 0, 105, '2025-07-21 15:57:31', '2025-07-23 05:34:09'),
('sports6', 'Street Soccer Saga', 'street-soccer-saga', 'https://files.sportrz.com/Games/524/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248803/game-thumbnails/ys39yx6re8kcpbqamgct.png', NULL, 1, 0, 106, '2025-07-21 15:57:32', '2025-07-23 05:33:25'),
('sports7', 'Basketball Legends', 'basketball-legends', 'https://files.sportrz.com/Games/525/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248774/game-thumbnails/hct7tsuautgtxjtzrtnu.png', NULL, 1, 0, 107, '2025-07-21 15:57:32', '2025-07-23 05:32:55'),
('sports8', 'Pro Skate Rush', 'pro-skate-rush', 'https://files.sportrz.com/Games/526/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248724/game-thumbnails/fyzk0skc9cvdmtckadcu.png', NULL, 1, 0, 108, '2025-07-21 15:57:33', '2025-07-23 05:32:05'),
('sports9', 'Real Cricket Fever', 'real-cricket-fever', 'https://files.sportrz.com/Games/527/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248750/game-thumbnails/f767i36p0fgedjte28wl.png', NULL, 1, 0, 109, '2025-07-21 15:57:34', '2025-07-23 05:32:31'),
('strategy1', 'Battle Protocol', 'battle-protocol-strategy1', 'https://files.sportrz.com/Games/62/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753171335/game-thumbnails/ilwm3nbmto33jmhxxbm4.png', NULL, 1, 0, 41, '2025-07-21 15:57:08', '2025-07-22 08:02:17'),
('strategy10', 'PlanCraft', 'plancraft', 'https://files.sportrz.com/Games/116/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-61-1.webp', NULL, 1, 0, 50, '2025-07-21 15:57:12', '2025-07-21 15:57:12'),
('strategy11', 'Logic Legion', 'logic-legion', 'https://files.sportrz.com/Games/120/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249222/game-thumbnails/zwm6slb4fxvorrttcqhu.png', NULL, 1, 0, 51, '2025-07-21 15:57:12', '2025-07-23 05:40:24'),
('strategy12', 'Kingdom Nodes', 'kingdom-nodes', 'https://files.sportrz.com/Games/121/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249183/game-thumbnails/c55decf91qlj9yz2dpxa.png', NULL, 1, 0, 52, '2025-07-21 15:57:12', '2025-07-23 05:39:49'),
('strategy13', 'Think & Conquer', 'think-and-conquer', 'https://files.sportrz.com/Games/124/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249154/game-thumbnails/lfwsdshfjwch0cl8qbna.png', NULL, 1, 0, 53, '2025-07-21 15:57:13', '2025-07-23 05:39:17'),
('strategy14', 'Logic Legion', 'logic-legion-strategy14', 'https://files.sportrz.com/Games/125/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249128/game-thumbnails/lrl5csy75u86lx4qpmjv.png', NULL, 1, 0, 54, '2025-07-21 15:57:13', '2025-07-23 05:38:50'),
('strategy15', 'Stratega Zone', 'stratega-zone', 'https://files.sportrz.com/Games/126/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249054/game-thumbnails/rinb6wqjdntglsgibf5n.png', NULL, 1, 0, 55, '2025-07-21 15:57:13', '2025-07-23 05:37:36'),
('strategy16', 'PlanCraft', 'plancraft-strategy16', 'https://files.sportrz.com/Games/127/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249032/game-thumbnails/gvrzhqwmlxhb1qqpzcyc.png', NULL, 1, 0, 56, '2025-07-21 15:57:13', '2025-07-23 05:37:13'),
('strategy17', 'Stratega Zone', 'stratega-zone-strategy17', 'https://files.sportrz.com/Games/128/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753248976/game-thumbnails/mqtu41bz6xqi605upkuz.png', NULL, 1, 0, 57, '2025-07-21 15:57:14', '2025-07-23 05:36:18'),
('strategy18', 'Stratega Zone', 'stratega-zone-strategy18', 'https://files.sportrz.com/Games/129/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-72-1.webp', NULL, 1, 0, 58, '2025-07-21 15:57:14', '2025-07-21 15:57:14'),
('strategy19', 'Diplomacy Rush', 'diplomacy-rush', 'https://files.sportrz.com/Games/130/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-73-1.webp', NULL, 1, 0, 59, '2025-07-21 15:57:14', '2025-07-21 15:57:14'),
('strategy2', 'Strategix', 'strategix', 'https://files.sportrz.com/Games/73/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753171356/game-thumbnails/dg8j5jzaknsjzca9qybf.png', NULL, 1, 0, 42, '2025-07-21 15:57:09', '2025-07-22 08:02:37'),
('strategy20', 'War Planners', 'war-planners-strategy20', 'https://files.sportrz.com/Games/131/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-74-1.webp', NULL, 1, 0, 60, '2025-07-21 15:57:15', '2025-07-21 15:57:15'),
('strategy23', 'My Kingdom', 'my-kingdom', 'https://files.sportrz.com/Games/MyKingdom/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-9.webp', NULL, 1, 0, 332, '2025-07-21 15:58:56', '2025-07-21 15:58:56'),
('strategy24', 'Nature Strikes Back', 'nature-strikes-back', 'https://files.sportrz.com/Games/NatureStrikesBack/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T124936.601.webp', NULL, 1, 0, 335, '2025-07-21 15:58:57', '2025-07-21 15:58:57'),
('strategy4', 'PlanCraft', 'plancraft-strategy4', 'https://files.sportrz.com/Games/92/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753171376/game-thumbnails/pqdvp4kdl3r3q9rxaots.png', NULL, 1, 0, 44, '2025-07-21 15:57:10', '2025-07-22 08:02:57'),
('strategy5', 'Meta Fortress', 'meta-fortress', 'https://files.sportrz.com/Games/96/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-54-1.webp', NULL, 1, 0, 45, '2025-07-21 15:57:10', '2025-07-21 15:57:10'),
('strategy7', 'Empire Tactics', 'empire-tactics', 'https://files.sportrz.com/Games/98/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249468/game-thumbnails/pxrvhmd4zdb3axf1cex9.png', NULL, 1, 0, 47, '2025-07-21 15:57:11', '2025-07-23 05:44:29'),
('strategy8', 'Battle Protocol', 'battle-protocol-strategy8', 'https://files.sportrz.com/Games/104/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249419/game-thumbnails/mizbznw8xpwvzedtvxyz.jpg', NULL, 1, 0, 48, '2025-07-21 15:57:11', '2025-07-23 05:43:41'),
('strategy9', 'PlanCraft', 'plancraft-strategy9', 'https://files.sportrz.com/Games/105/index.html', 'https://res.cloudinary.com/dmnbl2i61/image/upload/v1753249260/game-thumbnails/uswn1uortjz9csecr8ku.png', NULL, 1, 0, 49, '2025-07-21 15:57:11', '2025-07-23 05:41:01'),
('trivia21', 'Dangerous Treasures', 'dangerous-treasures', 'https://files.sportrz.com/Games/DangerousTreasures/index.html', 'https://files.sportrz.com/2024/12/Games-Feature-image-Play-games-Timesblogger-2024-06-17T125356.903.webp', NULL, 1, 0, 234, '2025-07-21 15:58:22', '2025-07-21 15:58:22');

-- --------------------------------------------------------

--
-- Table structure for table `game_categories`
--

CREATE TABLE `game_categories` (
  `game_id` varchar(100) NOT NULL,
  `category_id` bigint(20) UNSIGNED NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `game_categories`
--

INSERT INTO `game_categories` (`game_id`, `category_id`, `created_at`) VALUES
('adventure21', 15, '2026-10-27 15:04:24'),
('arcade1', 1, '2026-10-27 15:04:24'),
('arcade10', 1, '2026-10-27 15:04:24'),
('arcade100', 1, '2026-10-27 15:04:24'),
('arcade11', 1, '2026-10-27 15:04:24'),
('arcade12', 1, '2026-10-27 15:04:24'),
('arcade13', 1, '2026-10-27 15:04:24'),
('arcade14', 1, '2026-10-27 15:04:24'),
('arcade15', 1, '2026-10-27 15:04:24'),
('arcade16', 1, '2026-10-27 15:04:24'),
('arcade17', 1, '2026-10-27 15:04:24'),
('arcade18', 1, '2026-10-27 15:04:24'),
('arcade19', 1, '2026-10-27 15:04:24'),
('arcade2', 1, '2026-10-27 15:04:24'),
('arcade20', 1, '2026-10-27 15:04:24'),
('arcade21', 1, '2026-10-27 15:04:24'),
('arcade22', 1, '2026-10-27 15:04:24'),
('arcade23', 1, '2026-10-27 15:04:24'),
('arcade24', 1, '2026-10-27 15:04:24'),
('arcade25', 1, '2026-10-27 15:04:24'),
('arcade26', 1, '2026-10-27 15:04:24'),
('arcade27', 1, '2026-10-27 15:04:24'),
('arcade28', 1, '2026-10-27 15:04:24'),
('arcade29', 1, '2026-10-27 15:04:24'),
('arcade3', 1, '2026-10-27 15:04:24'),
('arcade30', 1, '2026-10-27 15:04:24'),
('arcade4', 1, '2026-10-27 15:04:24'),
('arcade5', 1, '2026-10-27 15:04:24'),
('arcade6', 1, '2026-10-27 15:04:24'),
('arcade7', 1, '2026-10-27 15:04:24'),
('arcade8', 1, '2026-10-27 15:04:24'),
('arcade9', 1, '2026-10-27 15:04:24'),
('arcade90', 1, '2026-10-27 15:04:24'),
('boardcard1', 16, '2026-10-27 15:04:24'),
('boardcard10', 16, '2026-10-27 15:04:24'),
('boardcard11', 16, '2026-10-27 15:04:24'),
('boardcard12', 16, '2026-10-27 15:04:24'),
('boardcard13', 16, '2026-10-27 15:04:24'),
('boardcard14', 16, '2026-10-27 15:04:24'),
('boardcard15', 16, '2026-10-27 15:04:24'),
('boardcard16', 16, '2026-10-27 15:04:24'),
('boardcard17', 16, '2026-10-27 15:04:24'),
('boardcard18', 16, '2026-10-27 15:04:24'),
('boardcard19', 16, '2026-10-27 15:04:24'),
('boardcard2', 16, '2026-10-27 15:04:24'),
('boardcard20', 16, '2026-10-27 15:04:24'),
('boardcard21', 16, '2026-10-27 15:04:24'),
('boardcard22', 16, '2026-10-27 15:04:24'),
('boardcard23', 16, '2026-10-27 15:04:24'),
('boardcard24', 16, '2026-10-27 15:04:24'),
('boardcard25', 16, '2026-10-27 15:04:24'),
('boardcard26', 16, '2026-10-27 15:04:24'),
('boardcard27', 16, '2026-10-27 15:04:24'),
('boardcard28', 16, '2026-10-27 15:04:24'),
('boardcard29', 16, '2026-10-27 15:04:24'),
('boardcard3', 16, '2026-10-27 15:04:24'),
('boardcard4', 16, '2026-10-27 15:04:24'),
('boardcard5', 16, '2026-10-27 15:04:24'),
('boardcard6', 16, '2026-10-27 15:04:24'),
('boardcard7', 16, '2026-10-27 15:04:24'),
('boardcard8', 16, '2026-10-27 15:04:24'),
('boardcard9', 16, '2026-10-27 15:04:24'),
('casual1', 2, '2026-10-27 15:04:24'),
('casual10', 2, '2026-10-27 15:04:24'),
('casual11', 2, '2026-10-27 15:04:24'),
('casual12', 2, '2026-10-27 15:04:24'),
('casual13', 2, '2026-10-27 15:04:24'),
('casual14', 2, '2026-10-27 15:04:24'),
('casual15', 2, '2026-10-27 15:04:24'),
('casual16', 2, '2026-10-27 15:04:24'),
('casual17', 2, '2026-10-27 15:04:24'),
('casual18', 2, '2026-10-27 15:04:24'),
('casual19', 2, '2026-10-27 15:04:24'),
('casual2', 2, '2026-10-27 15:04:24'),
('casual20', 2, '2026-10-27 15:04:24'),
('casual21', 2, '2026-10-27 15:04:24'),
('casual22', 2, '2026-10-27 15:04:24'),
('casual23', 2, '2026-10-27 15:04:24'),
('casual3', 2, '2026-10-27 15:04:24'),
('casual4', 2, '2026-10-27 15:04:24'),
('casual5', 2, '2026-10-27 15:04:24'),
('casual6', 2, '2026-10-27 15:04:24'),
('casual7', 2, '2026-10-27 15:04:24'),
('casual8', 2, '2026-10-27 15:04:24'),
('casual9', 2, '2026-10-27 15:04:24'),
('defence1', 3, '2026-10-27 15:04:24'),
('defence10', 3, '2026-10-27 15:04:24'),
('defence11', 3, '2026-10-27 15:04:24'),
('defence12', 3, '2026-10-27 15:04:24'),
('defence13', 3, '2026-10-27 15:04:24'),
('defence14', 3, '2026-10-27 15:04:24'),
('defence15', 3, '2026-10-27 15:04:24'),
('defence16', 3, '2026-10-27 15:04:24'),
('defence17', 3, '2026-10-27 15:04:24'),
('defence18', 3, '2026-10-27 15:04:24'),
('defence19', 3, '2026-10-27 15:04:24'),
('defence2', 3, '2026-10-27 15:04:24'),
('defence20', 3, '2026-10-27 15:04:24'),
('defence3', 3, '2026-10-27 15:04:24'),
('defence4', 3, '2026-10-27 15:04:24'),
('defence5', 3, '2026-10-27 15:04:24'),
('defence6', 3, '2026-10-27 15:04:24'),
('defence7', 3, '2026-10-27 15:04:24'),
('defence8', 3, '2026-10-27 15:04:24'),
('defence9', 3, '2026-10-27 15:04:24'),
('educational1', 14, '2026-10-27 15:04:24'),
('educational90', 14, '2026-10-27 15:04:24'),
('horror1', 4, '2026-10-27 15:04:24'),
('horror10', 4, '2026-10-27 15:04:24'),
('horror11', 4, '2026-10-27 15:04:24'),
('horror12', 4, '2026-10-27 15:04:24'),
('horror13', 4, '2026-10-27 15:04:24'),
('horror14', 4, '2026-10-27 15:04:24'),
('horror15', 4, '2026-10-27 15:04:24'),
('horror16', 4, '2026-10-27 15:04:24'),
('horror17', 4, '2026-10-27 15:04:24'),
('horror18', 4, '2026-10-27 15:04:24'),
('horror19', 4, '2026-10-27 15:04:24'),
('horror2', 4, '2026-10-27 15:04:24'),
('horror20', 4, '2026-10-27 15:04:24'),
('horror21', 4, '2026-10-27 15:04:24'),
('horror3', 4, '2026-10-27 15:04:24'),
('horror4', 4, '2026-10-27 15:04:24'),
('horror5', 4, '2026-10-27 15:04:24'),
('horror6', 4, '2026-10-27 15:04:24'),
('horror7', 4, '2026-10-27 15:04:24'),
('horror8', 4, '2026-10-27 15:04:24'),
('horror9', 4, '2026-10-27 15:04:24'),
('idle21', 17, '2026-10-27 15:04:24'),
('kids21', 5, '2026-10-27 15:04:24'),
('kids22', 5, '2026-10-27 15:04:24'),
('kids23', 5, '2026-10-27 15:04:24'),
('kids24', 5, '2026-10-27 15:04:24'),
('kids25', 5, '2026-10-27 15:04:24'),
('kids26', 5, '2026-10-27 15:04:24'),
('kids27', 5, '2026-10-27 15:04:24'),
('kids28', 5, '2026-10-27 15:04:24'),
('kids29', 5, '2026-10-27 15:04:24'),
('kids30', 5, '2026-10-27 15:04:24'),
('kids31', 5, '2026-10-27 15:04:24'),
('kids32', 5, '2026-10-27 15:04:24'),
('management1', 18, '2026-10-27 15:04:24'),
('physics21', 6, '2026-10-27 15:04:24'),
('physics23', 6, '2026-10-27 15:04:24'),
('platformer21', 7, '2026-10-27 15:04:24'),
('platformer22', 7, '2026-10-27 15:04:24'),
('platformer23', 7, '2026-10-27 15:04:24'),
('platformer24', 7, '2026-10-27 15:04:24'),
('platformer25', 7, '2026-10-27 15:04:24'),
('platformer26', 7, '2026-10-27 15:04:24'),
('platformer27', 7, '2026-10-27 15:04:24'),
('platformer28', 7, '2026-10-27 15:04:24'),
('platformer29', 7, '2026-10-27 15:04:24'),
('platformer30', 7, '2026-10-27 15:04:24'),
('platformer31', 7, '2026-10-27 15:04:24'),
('platformer32', 7, '2026-10-27 15:04:24'),
('platformer33', 7, '2026-10-27 15:04:24'),
('platformer34', 7, '2026-10-27 15:04:24'),
('platformer35', 7, '2026-10-27 15:04:24'),
('platformer36', 7, '2026-10-27 15:04:24'),
('platformer37', 7, '2026-10-27 15:04:24'),
('platformer38', 7, '2026-10-27 15:04:24'),
('platformer39', 7, '2026-10-27 15:04:24'),
('platformer40', 7, '2026-10-27 15:04:24'),
('platformer41', 7, '2026-10-27 15:04:24'),
('platformer42', 7, '2026-10-27 15:04:24'),
('platformer43', 7, '2026-10-27 15:04:24'),
('platformer44', 7, '2026-10-27 15:04:24'),
('platformer45', 7, '2026-10-27 15:04:24'),
('platformer46', 7, '2026-10-27 15:04:24'),
('platformer47', 7, '2026-10-27 15:04:24'),
('platformer48', 7, '2026-10-27 15:04:24'),
('puzzle10', 8, '2026-10-27 15:04:24'),
('puzzle11', 8, '2026-10-27 15:04:24'),
('puzzle12', 8, '2026-10-27 15:04:24'),
('puzzle13', 8, '2026-10-27 15:04:24'),
('puzzle14', 8, '2026-10-27 15:04:24'),
('puzzle15', 8, '2026-10-27 15:04:24'),
('puzzle16', 8, '2026-10-27 15:04:24'),
('puzzle17', 8, '2026-10-27 15:04:24'),
('puzzle18', 8, '2026-10-27 15:04:24'),
('puzzle19', 8, '2026-10-27 15:04:24'),
('puzzle2', 8, '2026-10-27 15:04:24'),
('puzzle20', 8, '2026-10-27 15:04:24'),
('puzzle21', 8, '2026-10-27 15:04:24'),
('puzzle22', 8, '2026-10-27 15:04:24'),
('puzzle23', 8, '2026-10-27 15:04:24'),
('puzzle24', 8, '2026-10-27 15:04:24'),
('puzzle25', 8, '2026-10-27 15:04:24'),
('puzzle26', 8, '2026-10-27 15:04:24'),
('puzzle27', 8, '2026-10-27 15:04:24'),
('puzzle28', 8, '2026-10-27 15:04:24'),
('puzzle29', 8, '2026-10-27 15:04:24'),
('puzzle3', 8, '2026-10-27 15:04:24'),
('puzzle30', 8, '2026-10-27 15:04:24'),
('puzzle31', 8, '2026-10-27 15:04:24'),
('puzzle32', 8, '2026-10-27 15:04:24'),
('puzzle33', 8, '2026-10-27 15:04:24'),
('puzzle34', 8, '2026-10-27 15:04:24'),
('puzzle35', 8, '2026-10-27 15:04:24'),
('puzzle36', 8, '2026-10-27 15:04:24'),
('puzzle37', 8, '2026-10-27 15:04:24'),
('puzzle38', 8, '2026-10-27 15:04:24'),
('puzzle39', 8, '2026-10-27 15:04:24'),
('puzzle4', 8, '2026-10-27 15:04:24'),
('puzzle40', 8, '2026-10-27 15:04:24'),
('puzzle41', 8, '2026-10-27 15:04:24'),
('puzzle42', 8, '2026-10-27 15:04:24'),
('puzzle43', 8, '2026-10-27 15:04:24'),
('puzzle44', 8, '2026-10-27 15:04:24'),
('puzzle45', 8, '2026-10-27 15:04:24'),
('puzzle46', 8, '2026-10-27 15:04:24'),
('puzzle47', 8, '2026-10-27 15:04:24'),
('puzzle48', 8, '2026-10-27 15:04:24'),
('puzzle49', 8, '2026-10-27 15:04:24'),
('puzzle5', 8, '2026-10-27 15:04:24'),
('puzzle50', 8, '2026-10-27 15:04:24'),
('puzzle51', 8, '2026-10-27 15:04:24'),
('puzzle52', 8, '2026-10-27 15:04:24'),
('puzzle53', 8, '2026-10-27 15:04:24'),
('puzzle54', 8, '2026-10-27 15:04:24'),
('puzzle55', 8, '2026-10-27 15:04:24'),
('puzzle56', 8, '2026-10-27 15:04:24'),
('puzzle57', 8, '2026-10-27 15:04:24'),
('puzzle58', 8, '2026-10-27 15:04:24'),
('puzzle59', 8, '2026-10-27 15:04:24'),
('puzzle6', 8, '2026-10-27 15:04:24'),
('puzzle60', 8, '2026-10-27 15:04:24'),
('puzzle61', 8, '2026-10-27 15:04:24'),
('puzzle62', 8, '2026-10-27 15:04:24'),
('puzzle63', 8, '2026-10-27 15:04:24'),
('puzzle64', 8, '2026-10-27 15:04:24'),
('puzzle65', 8, '2026-10-27 15:04:24'),
('puzzle66', 8, '2026-10-27 15:04:24'),
('puzzle67', 8, '2026-10-27 15:04:24'),
('puzzle68', 8, '2026-10-27 15:04:24'),
('puzzle69', 8, '2026-10-27 15:04:24'),
('puzzle7', 8, '2026-10-27 15:04:24'),
('puzzle8', 8, '2026-10-27 15:04:24'),
('puzzle9', 8, '2026-10-27 15:04:24'),
('racing1', 9, '2026-10-27 15:04:24'),
('racing10', 9, '2026-10-27 15:04:24'),
('racing11', 9, '2026-10-27 15:04:24'),
('racing12', 9, '2026-10-27 15:04:24'),
('racing13', 9, '2026-10-27 15:04:24'),
('racing14', 9, '2026-10-27 15:04:24'),
('racing15', 9, '2026-10-27 15:04:24'),
('racing16', 9, '2026-10-27 15:04:24'),
('racing17', 9, '2026-10-27 15:04:24'),
('racing18', 9, '2026-10-27 15:04:24'),
('racing19', 9, '2026-10-27 15:04:24'),
('racing2', 9, '2026-10-27 15:04:24'),
('racing20', 9, '2026-10-27 15:04:24'),
('racing21', 9, '2026-10-27 15:04:24'),
('racing3', 9, '2026-10-27 15:04:24'),
('racing4', 9, '2026-10-27 15:04:24'),
('racing5', 9, '2026-10-27 15:04:24'),
('racing6', 9, '2026-10-27 15:04:24'),
('racing7', 9, '2026-10-27 15:04:24'),
('racing8', 9, '2026-10-27 15:04:24'),
('racing9', 9, '2026-10-27 15:04:24'),
('shooter1', 10, '2026-10-27 15:04:24'),
('shooter10', 10, '2026-10-27 15:04:24'),
('shooter11', 10, '2026-10-27 15:04:24'),
('shooter12', 10, '2026-10-27 15:04:24'),
('shooter13', 10, '2026-10-27 15:04:24'),
('shooter14', 10, '2026-10-27 15:04:24'),
('shooter15', 10, '2026-10-27 15:04:24'),
('shooter16', 10, '2026-10-27 15:04:24'),
('shooter17', 10, '2026-10-27 15:04:24'),
('shooter18', 10, '2026-10-27 15:04:24'),
('shooter19', 10, '2026-10-27 15:04:24'),
('shooter2', 10, '2026-10-27 15:04:24'),
('shooter20', 10, '2026-10-27 15:04:24'),
('shooter21', 10, '2026-10-27 15:04:24'),
('shooter22', 10, '2026-10-27 15:04:24'),
('shooter23', 10, '2026-10-27 15:04:24'),
('shooter24', 10, '2026-10-27 15:04:24'),
('shooter25', 10, '2026-10-27 15:04:24'),
('shooter26', 10, '2026-10-27 15:04:24'),
('shooter27', 10, '2026-10-27 15:04:24'),
('shooter28', 10, '2026-10-27 15:04:24'),
('shooter29', 10, '2026-10-27 15:04:24'),
('shooter3', 10, '2026-10-27 15:04:24'),
('shooter30', 10, '2026-10-27 15:04:24'),
('shooter4', 10, '2026-10-27 15:04:24'),
('shooter5', 10, '2026-10-27 15:04:24'),
('shooter6', 10, '2026-10-27 15:04:24'),
('shooter7', 10, '2026-10-27 15:04:24'),
('shooter8', 10, '2026-10-27 15:04:24'),
('shooter9', 10, '2026-10-27 15:04:24'),
('simulation21', 11, '2026-10-27 15:04:24'),
('simulation22', 11, '2026-10-27 15:04:24'),
('simulation23', 11, '2026-10-27 15:04:24'),
('simulation24', 19, '2026-10-27 15:04:24'),
('simulation25', 20, '2026-10-27 15:04:24'),
('sports1', 12, '2026-10-27 15:04:24'),
('sports10', 12, '2026-10-27 15:04:24'),
('sports11', 12, '2026-10-27 15:04:24'),
('sports12', 12, '2026-10-27 15:04:24'),
('sports13', 12, '2026-10-27 15:04:24'),
('sports14', 12, '2026-10-27 15:04:24'),
('sports15', 12, '2026-10-27 15:04:24'),
('sports16', 12, '2026-10-27 15:04:24'),
('sports17', 12, '2026-10-27 15:04:24'),
('sports18', 12, '2026-10-27 15:04:24'),
('sports19', 12, '2026-10-27 15:04:24'),
('sports2', 12, '2026-10-27 15:04:24'),
('sports20', 12, '2026-10-27 15:04:24'),
('sports21', 12, '2026-10-27 15:04:24'),
('sports22', 12, '2026-10-27 15:04:24'),
('sports3', 12, '2026-10-27 15:04:24'),
('sports4', 12, '2026-10-27 15:04:24'),
('sports5', 12, '2026-10-27 15:04:24'),
('sports6', 12, '2026-10-27 15:04:24'),
('sports7', 12, '2026-10-27 15:04:24'),
('sports8', 12, '2026-10-27 15:04:24'),
('sports9', 12, '2026-10-27 15:04:24'),
('strategy1', 13, '2026-10-27 15:04:24'),
('strategy10', 13, '2026-10-27 15:04:24'),
('strategy11', 13, '2026-10-27 15:04:24'),
('strategy12', 13, '2026-10-27 15:04:24'),
('strategy13', 13, '2026-10-27 15:04:24'),
('strategy14', 13, '2026-10-27 15:04:24'),
('strategy15', 13, '2026-10-27 15:04:24'),
('strategy16', 13, '2026-10-27 15:04:24'),
('strategy17', 13, '2026-10-27 15:04:24'),
('strategy18', 13, '2026-10-27 15:04:24'),
('strategy19', 13, '2026-10-27 15:04:24'),
('strategy2', 13, '2026-10-27 15:04:24'),
('strategy20', 13, '2026-10-27 15:04:24'),
('strategy23', 13, '2026-10-27 15:04:24'),
('strategy24', 13, '2026-10-27 15:04:24'),
('strategy4', 13, '2026-10-27 15:04:24'),
('strategy5', 13, '2026-10-27 15:04:24'),
('strategy7', 13, '2026-10-27 15:04:24'),
('strategy8', 13, '2026-10-27 15:04:24'),
('strategy9', 13, '2026-10-27 15:04:24'),
('trivia21', 21, '2026-10-27 15:04:24');

-- --------------------------------------------------------

--
-- Table structure for table `game_play_history`
--

CREATE TABLE `game_play_history` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` char(36) NOT NULL,
  `game_id` varchar(100) NOT NULL,
  `played_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `notifications`
--

CREATE TABLE `notifications` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` char(36) NOT NULL,
  `type` enum('welcome','info','warning','success') NOT NULL DEFAULT 'info',
  `title` varchar(191) NOT NULL,
  `message` text NOT NULL,
  `is_read` tinyint(1) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `oauth_accounts`
--

CREATE TABLE `oauth_accounts` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` char(36) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `provider_account_id` varchar(128) NOT NULL,
  `provider_email` varchar(191) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `payments`
--

CREATE TABLE `payments` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` char(36) NOT NULL,
  `plan_id` bigint(20) UNSIGNED NOT NULL,
  `provider` varchar(50) NOT NULL DEFAULT 'razorpay',
  `order_id` varchar(191) NOT NULL,
  `provider_payment_id` varchar(191) DEFAULT NULL,
  `amount_paise` bigint(20) UNSIGNED NOT NULL,
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `status` enum('created','authorized','captured','failed','refunded') NOT NULL DEFAULT 'created',
  `idempotency_key` varchar(191) DEFAULT NULL,
  `provider_payload` longtext DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `plans`
--

CREATE TABLE `plans` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text DEFAULT NULL,
  `price_paise` bigint(20) UNSIGNED NOT NULL DEFAULT 0,
  `currency` char(3) NOT NULL DEFAULT 'INR',
  `duration_days` int(10) UNSIGNED DEFAULT NULL,
  `game_access_mode` enum('all','selected','none') NOT NULL DEFAULT 'all',
  `features_text` text DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT 1,
  `display_order` int(11) NOT NULL DEFAULT 0,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `plans`
--

INSERT INTO `plans` (`id`, `code`, `name`, `description`, `price_paise`, `currency`, `duration_days`, `game_access_mode`, `features_text`, `is_active`, `display_order`, `created_at`, `updated_at`) VALUES
(1, 'free', 'Free Player', 'Basic free access', 0, 'INR', NULL, 'selected', 'Basic access', 0, 0, '2026-10-26 16:20:39', '2026-10-26 16:20:39'),
(2, 'daily', 'Daily Access', 'One day access', 1000, 'INR', 1, 'all', 'Daily access', 0, 1, '2026-10-26 16:20:39', '2026-10-26 16:20:39'),
(3, 'weekly', 'Weekly Warrior', '15 day access as currently shown in the UI', 2000, 'INR', 15, 'all', '15-day access', 0, 2, '2026-10-26 16:20:39', '2026-10-26 16:20:39'),
(4, 'monthly', 'Monthly Champion', '30 day access', 3000, 'INR', 30, 'all', 'Monthly access', 0, 3, '2026-10-26 16:20:39', '2026-10-26 16:20:39'),
(5, 'silver', 'Silver', 'Configure price, duration and game access before publishing', 0, 'INR', 30, 'selected', 'Silver package', 0, 10, '2026-10-26 16:20:39', '2026-10-26 16:20:39'),
(6, 'gold', 'Gold', 'Configure price, duration and game access before publishing', 0, 'INR', 30, 'selected', 'Gold package', 0, 20, '2026-10-26 16:20:39', '2026-10-26 16:20:39'),
(7, 'diamond', 'Diamond', 'Configure price, duration and game access before publishing', 0, 'INR', 30, 'all', 'Diamond package', 0, 30, '2026-10-26 16:20:39', '2026-10-26 16:20:39');

-- --------------------------------------------------------

--
-- Table structure for table `plan_games`
--

CREATE TABLE `plan_games` (
  `plan_id` bigint(20) UNSIGNED NOT NULL,
  `game_id` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `reviews`
--

CREATE TABLE `reviews` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `game_id` varchar(100) DEFAULT NULL,
  `name` varchar(191) NOT NULL,
  `email` varchar(191) NOT NULL,
  `rating` tinyint(3) UNSIGNED NOT NULL,
  `comment` text NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `site_settings`
--

CREATE TABLE `site_settings` (
  `setting_key` varchar(100) NOT NULL,
  `setting_value` text DEFAULT NULL,
  `value_type` enum('string','number','boolean','json') NOT NULL DEFAULT 'string',
  `updated_by_admin_id` char(36) DEFAULT NULL,
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `subscriptions`
--

CREATE TABLE `subscriptions` (
  `id` bigint(20) UNSIGNED NOT NULL,
  `user_id` char(36) NOT NULL,
  `plan_id` bigint(20) UNSIGNED NOT NULL,
  `payment_record_id` bigint(20) UNSIGNED DEFAULT NULL,
  `status` enum('pending','active','expired','cancelled','revoked') NOT NULL DEFAULT 'pending',
  `source` enum('purchase','admin') NOT NULL DEFAULT 'purchase',
  `start_at` datetime DEFAULT NULL,
  `end_at` datetime DEFAULT NULL,
  `assigned_by_admin_id` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `email` varchar(191) NOT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `display_name` varchar(191) DEFAULT NULL,
  `photo_url` varchar(1024) DEFAULT NULL,
  `avatar` varchar(100) NOT NULL DEFAULT 'avatar1',
  `is_admin` tinyint(1) NOT NULL DEFAULT 0,
  `status` enum('active','suspended') NOT NULL DEFAULT 'active',
  `email_verified_at` datetime DEFAULT NULL,
  `has_received_welcome_notification` tinyint(1) NOT NULL DEFAULT 0,
  `last_login_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `updated_at` datetime NOT NULL DEFAULT current_timestamp() ON UPDATE current_timestamp()
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `email`, `password_hash`, `display_name`, `photo_url`, `avatar`, `is_admin`, `status`, `email_verified_at`, `has_received_welcome_notification`, `last_login_at`, `created_at`, `updated_at`) VALUES
('a615b9de-b2eb-4131-a0c7-b80b4028198e', 'suraj.krayons@gmail.com', NULL, 'Test User', NULL, 'avatar1', 0, 'active', '2026-10-27 17:06:21', 0, NULL, '2026-10-27 16:59:01', '2026-10-27 17:06:21');

-- --------------------------------------------------------

--
-- Table structure for table `user_sessions`
--

CREATE TABLE `user_sessions` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` char(64) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` datetime NOT NULL DEFAULT current_timestamp(),
  `last_seen_at` datetime DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `user_agent` varchar(512) DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_audit_logs`
--
ALTER TABLE `admin_audit_logs`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_admin_audit_admin_created` (`admin_user_id`,`created_at`),
  ADD KEY `idx_admin_audit_entity` (`entity_type`,`entity_id`);

--
-- Indexes for table `auth_tokens`
--
ALTER TABLE `auth_tokens`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_auth_tokens_hash` (`token_hash`),
  ADD KEY `idx_auth_tokens_email_purpose` (`email`,`purpose`),
  ADD KEY `idx_auth_tokens_expires_at` (`expires_at`),
  ADD KEY `fk_auth_tokens_user` (`user_id`);

--
-- Indexes for table `categories`
--
ALTER TABLE `categories`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_categories_name` (`name`),
  ADD UNIQUE KEY `uq_categories_slug` (`slug`),
  ADD KEY `idx_categories_active_order` (`is_active`,`display_order`);

--
-- Indexes for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_contact_status_created` (`status`,`created_at`),
  ADD KEY `idx_contact_email` (`email`),
  ADD KEY `fk_contact_messages_user` (`user_id`);

--
-- Indexes for table `feedback`
--
ALTER TABLE `feedback`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_feedback_rating_created` (`rating`,`created_at`),
  ADD KEY `idx_feedback_created` (`created_at`),
  ADD KEY `fk_feedback_user` (`user_id`);

--
-- Indexes for table `games`
--
ALTER TABLE `games`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_games_slug` (`slug`),
  ADD KEY `idx_games_active_order` (`is_active`,`display_order`),
  ADD KEY `idx_games_name` (`name`);

--
-- Indexes for table `game_categories`
--
ALTER TABLE `game_categories`
  ADD PRIMARY KEY (`game_id`,`category_id`),
  ADD KEY `idx_game_categories_category_id` (`category_id`);

--
-- Indexes for table `game_play_history`
--
ALTER TABLE `game_play_history`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_game_history_user_played` (`user_id`,`played_at`),
  ADD KEY `idx_game_history_game_played` (`game_id`,`played_at`);

--
-- Indexes for table `notifications`
--
ALTER TABLE `notifications`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_notifications_user_read_created` (`user_id`,`is_read`,`created_at`);

--
-- Indexes for table `oauth_accounts`
--
ALTER TABLE `oauth_accounts`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_oauth_provider_account` (`provider`,`provider_account_id`),
  ADD KEY `idx_oauth_user_id` (`user_id`);

--
-- Indexes for table `payments`
--
ALTER TABLE `payments`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_payments_order_id` (`order_id`),
  ADD UNIQUE KEY `uq_payments_provider_payment_id` (`provider_payment_id`),
  ADD UNIQUE KEY `uq_payments_idempotency_key` (`idempotency_key`),
  ADD KEY `idx_payments_user_created` (`user_id`,`created_at`),
  ADD KEY `idx_payments_status_created` (`status`,`created_at`),
  ADD KEY `fk_payments_plan` (`plan_id`);

--
-- Indexes for table `plans`
--
ALTER TABLE `plans`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_plans_code` (`code`),
  ADD KEY `idx_plans_active_order` (`is_active`,`display_order`);

--
-- Indexes for table `plan_games`
--
ALTER TABLE `plan_games`
  ADD PRIMARY KEY (`plan_id`,`game_id`),
  ADD KEY `idx_plan_games_game_id` (`game_id`);

--
-- Indexes for table `reviews`
--
ALTER TABLE `reviews`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_reviews_rating_created` (`rating`,`created_at`),
  ADD KEY `idx_reviews_created` (`created_at`),
  ADD KEY `idx_reviews_game_id` (`game_id`),
  ADD KEY `fk_reviews_user` (`user_id`);

--
-- Indexes for table `site_settings`
--
ALTER TABLE `site_settings`
  ADD PRIMARY KEY (`setting_key`),
  ADD KEY `fk_site_settings_admin` (`updated_by_admin_id`);

--
-- Indexes for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD PRIMARY KEY (`id`),
  ADD KEY `idx_subscriptions_user_status_end` (`user_id`,`status`,`end_at`),
  ADD KEY `idx_subscriptions_plan_id` (`plan_id`),
  ADD KEY `idx_subscriptions_payment_record` (`payment_record_id`),
  ADD KEY `fk_subscriptions_admin` (`assigned_by_admin_id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_users_email` (`email`),
  ADD KEY `idx_users_status` (`status`),
  ADD KEY `idx_users_created_at` (`created_at`),
  ADD KEY `idx_users_is_admin` (`is_admin`);

--
-- Indexes for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `uq_user_sessions_token_hash` (`token_hash`),
  ADD KEY `idx_user_sessions_user_id` (`user_id`),
  ADD KEY `idx_user_sessions_expires_at` (`expires_at`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_audit_logs`
--
ALTER TABLE `admin_audit_logs`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `auth_tokens`
--
ALTER TABLE `auth_tokens`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=3;

--
-- AUTO_INCREMENT for table `categories`
--
ALTER TABLE `categories`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=22;

--
-- AUTO_INCREMENT for table `contact_messages`
--
ALTER TABLE `contact_messages`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `feedback`
--
ALTER TABLE `feedback`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `game_play_history`
--
ALTER TABLE `game_play_history`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `notifications`
--
ALTER TABLE `notifications`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `oauth_accounts`
--
ALTER TABLE `oauth_accounts`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `payments`
--
ALTER TABLE `payments`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `plans`
--
ALTER TABLE `plans`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `reviews`
--
ALTER TABLE `reviews`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `subscriptions`
--
ALTER TABLE `subscriptions`
  MODIFY `id` bigint(20) UNSIGNED NOT NULL AUTO_INCREMENT;

--
-- Constraints for dumped tables
--

--
-- Constraints for table `admin_audit_logs`
--
ALTER TABLE `admin_audit_logs`
  ADD CONSTRAINT `fk_admin_audit_admin` FOREIGN KEY (`admin_user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `auth_tokens`
--
ALTER TABLE `auth_tokens`
  ADD CONSTRAINT `fk_auth_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `contact_messages`
--
ALTER TABLE `contact_messages`
  ADD CONSTRAINT `fk_contact_messages_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `feedback`
--
ALTER TABLE `feedback`
  ADD CONSTRAINT `fk_feedback_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `game_categories`
--
ALTER TABLE `game_categories`
  ADD CONSTRAINT `fk_game_categories_category` FOREIGN KEY (`category_id`) REFERENCES `categories` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_game_categories_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `game_play_history`
--
ALTER TABLE `game_play_history`
  ADD CONSTRAINT `fk_game_history_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_game_history_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `notifications`
--
ALTER TABLE `notifications`
  ADD CONSTRAINT `fk_notifications_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `oauth_accounts`
--
ALTER TABLE `oauth_accounts`
  ADD CONSTRAINT `fk_oauth_accounts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `payments`
--
ALTER TABLE `payments`
  ADD CONSTRAINT `fk_payments_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`),
  ADD CONSTRAINT `fk_payments_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `plan_games`
--
ALTER TABLE `plan_games`
  ADD CONSTRAINT `fk_plan_games_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE CASCADE,
  ADD CONSTRAINT `fk_plan_games_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`) ON DELETE CASCADE;

--
-- Constraints for table `reviews`
--
ALTER TABLE `reviews`
  ADD CONSTRAINT `fk_reviews_game` FOREIGN KEY (`game_id`) REFERENCES `games` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_reviews_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `site_settings`
--
ALTER TABLE `site_settings`
  ADD CONSTRAINT `fk_site_settings_admin` FOREIGN KEY (`updated_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL;

--
-- Constraints for table `subscriptions`
--
ALTER TABLE `subscriptions`
  ADD CONSTRAINT `fk_subscriptions_admin` FOREIGN KEY (`assigned_by_admin_id`) REFERENCES `users` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_subscriptions_payment` FOREIGN KEY (`payment_record_id`) REFERENCES `payments` (`id`) ON DELETE SET NULL,
  ADD CONSTRAINT `fk_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `plans` (`id`),
  ADD CONSTRAINT `fk_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`);

--
-- Constraints for table `user_sessions`
--
ALTER TABLE `user_sessions`
  ADD CONSTRAINT `fk_user_sessions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE;
COMMIT;

/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
