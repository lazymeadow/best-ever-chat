CREATE DATABASE  IF NOT EXISTS `bestchat` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci */;
USE `bestchat`;

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!40101 SET NAMES utf8 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `parasite`
--

DROP TABLE IF EXISTS `parasite`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parasite` (
  `id` varchar(128) NOT NULL,
  `password` varchar(64) NOT NULL,
  `username` varchar(32) DEFAULT NULL,
  `email` varchar(128) DEFAULT NULL,
  `reset_token` varchar(64) DEFAULT NULL,
  `last_active` DATETIME DEFAULT NULL,
  `activeAccount` BIT DEFAULT 1,
  PRIMARY KEY (`id`),
  UNIQUE KEY `parasite_id_UNIQUE` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `parasite_config`
--

DROP TABLE IF EXISTS `parasite_config`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `parasite_config` (
  `parasite_id` varchar(128) NOT NULL,
  `name` varchar(16) NOT NULL,
  `value` varchar(64) NOT NULL,
  PRIMARY KEY (`parasite_id`,`name`),
  KEY `parasite_config_parasite_id_fk` (`parasite_id`),
  CONSTRAINT `parasite_config_parasite_id_fk` FOREIGN KEY (`parasite_id`) REFERENCES `parasite` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `room_access`
--

DROP TABLE IF EXISTS `room_access`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `room_access` (
  `room_id` int(11) NOT NULL DEFAULT '0',
  `parasite_id` varchar(128) NOT NULL DEFAULT '',
  `in_room` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`room_id`,`parasite_id`),
  KEY `in_rooms_rooms_id_fk` (`room_id`),
  KEY `in_rooms_parasite_id_fk` (`parasite_id`),
  CONSTRAINT `in_rooms_parasite_id_fk` FOREIGN KEY (`parasite_id`) REFERENCES `parasite` (`id`),
  CONSTRAINT `in_rooms_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `rooms`
--

DROP TABLE IF EXISTS `rooms`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `rooms` (
  `id` int(11) NOT NULL AUTO_INCREMENT,
  `owner` varchar(128) DEFAULT NULL,
  `name` varchar(64) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rooms_id_uindex` (`id`),
  KEY `rooms_parasite_id_fk` (`owner`),
  CONSTRAINT `rooms_parasite_id_fk` FOREIGN KEY (`owner`) REFERENCES `parasite` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=162 DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

--
-- Table structure for table `alerts`
--

DROP TABLE IF EXISTS `alerts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `alerts` (
  `id` int(11) NOT NULL AUTO_INCREMENT
    PRIMARY KEY,
  `parasite_id` varchar(128) NOT NULL DEFAULT '',
  `content` varchar(2048) DEFAULT NULL,
  KEY `alerts_parasite_id_fk` (`parasite_id`),
  CONSTRAINT `alerts_parasite_id_fk` FOREIGN KEY (`parasite_id`) REFERENCES `parasite` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Table structure for table `invitations`
--

DROP TABLE IF EXISTS `invitations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!40101 SET character_set_client = utf8 */;
CREATE TABLE `invitations` (
  `room_id` int(11) NOT NULL DEFAULT '0',
  `parasite_id` varchar(128) NOT NULL DEFAULT '',
  `content` varchar(2048) DEFAULT NULL,
  PRIMARY KEY (`room_id`,`parasite_id`),
  KEY `invitations_parasite_id_fk` (`parasite_id`),
  CONSTRAINT `invitations_parasite_id_fk` FOREIGN KEY (`parasite_id`) REFERENCES `parasite` (`id`),
  CONSTRAINT `invitations_rooms_id_fk` FOREIGN KEY (`room_id`) REFERENCES `rooms` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
/*!40101 SET character_set_client = @saved_cs_client */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2018-11-17 19:56:51
