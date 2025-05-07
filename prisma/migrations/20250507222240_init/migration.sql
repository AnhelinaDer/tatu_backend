-- CreateTable
CREATE TABLE `artiststyles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `artistId` INTEGER NOT NULL,
    `styleId` INTEGER NOT NULL,

    INDEX `artistId`(`artistId`),
    INDEX `styleId`(`styleId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `availability` (
    `availabilityId` INTEGER NOT NULL AUTO_INCREMENT,
    `artistId` INTEGER NOT NULL,
    `dateTime` DATETIME(0) NOT NULL,

    INDEX `artistId`(`artistId`),
    PRIMARY KEY (`availabilityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookings` (
    `bookingId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `artistId` INTEGER NOT NULL,
    `dateTime` DATETIME(0) NOT NULL,
    `statusId` INTEGER NOT NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `comment` TEXT NULL,
    `price` DECIMAL(10, 2) NULL,

    INDEX `artistId`(`artistId`),
    INDEX `statusId`(`statusId`),
    INDEX `userId`(`userId`),
    PRIMARY KEY (`bookingId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `bookingstatuses` (
    `statusId` INTEGER NOT NULL AUTO_INCREMENT,
    `status` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`statusId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `cities` (
    `cityId` INTEGER NOT NULL AUTO_INCREMENT,
    `name` VARCHAR(100) NOT NULL,
    `countryName` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`cityId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `reviews` (
    `reviewId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `bookingId` INTEGER NOT NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),
    `rating` TINYINT NULL,
    `comment` TEXT NULL,

    INDEX `bookingId`(`bookingId`),
    INDEX `userId`(`userId`),
    PRIMARY KEY (`reviewId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `styles` (
    `styleId` INTEGER NOT NULL AUTO_INCREMENT,
    `styleName` VARCHAR(100) NOT NULL,
    `description` TEXT NULL,

    PRIMARY KEY (`styleId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tattoos` (
    `tattooId` INTEGER NOT NULL AUTO_INCREMENT,
    `artistId` INTEGER NOT NULL,
    `tattooName` VARCHAR(100) NOT NULL,
    `imageURL` VARCHAR(255) NULL,

    INDEX `artistId`(`artistId`),
    PRIMARY KEY (`tattooId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `users` (
    `userId` INTEGER NOT NULL AUTO_INCREMENT,
    `cityId` INTEGER NULL,
    `email` VARCHAR(255) NOT NULL,
    `phoneNumber` VARCHAR(30) NULL,
    `firstName` VARCHAR(100) NOT NULL,
    `lastName` VARCHAR(100) NOT NULL,
    `passwordHash` VARCHAR(255) NOT NULL,
    `birthDate` DATE NULL,
    `isArtist` BOOLEAN NULL DEFAULT false,
    `artistDescription` TEXT NULL,
    `streetAddress` VARCHAR(255) NULL,
    `instagramLink` VARCHAR(255) NULL,
    `portfolioLink` VARCHAR(255) NULL,
    `appointmentPrice` DECIMAL(10, 2) NULL,
    `imageURL` VARCHAR(255) NULL,

    UNIQUE INDEX `email`(`email`),
    INDEX `cityId`(`cityId`),
    PRIMARY KEY (`userId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- AddForeignKey
ALTER TABLE `artiststyles` ADD CONSTRAINT `artiststyles_ibfk_1` FOREIGN KEY (`artistId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `artiststyles` ADD CONSTRAINT `artiststyles_ibfk_2` FOREIGN KEY (`styleId`) REFERENCES `styles`(`styleId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `availability` ADD CONSTRAINT `availability_ibfk_1` FOREIGN KEY (`artistId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`artistId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`statusId`) REFERENCES `bookingstatuses`(`statusId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `reviews` ADD CONSTRAINT `reviews_ibfk_2` FOREIGN KEY (`bookingId`) REFERENCES `bookings`(`bookingId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tattoos` ADD CONSTRAINT `tattoos_ibfk_1` FOREIGN KEY (`artistId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `users` ADD CONSTRAINT `users_ibfk_1` FOREIGN KEY (`cityId`) REFERENCES `cities`(`cityId`) ON DELETE NO ACTION ON UPDATE NO ACTION;
