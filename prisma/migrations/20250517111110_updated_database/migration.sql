/*
  Warnings:

  - You are about to drop the column `dateTime` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `placement` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `referenceImageURL` on the `bookings` table. All the data in the column will be lost.
  - You are about to drop the column `artistDescription` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `cityId` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `imageURL` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `instagramLink` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `isArtist` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `membershipFee` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `portfolioLink` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `streetAddress` on the `users` table. All the data in the column will be lost.
  - Added the required column `slotId` to the `bookings` table without a default value. This is not possible if the table is not empty.
  - Made the column `birthDate` on table `users` required. This step will fail if there are existing NULL values in that column.

*/
-- DropForeignKey
ALTER TABLE `appointmentslots` DROP FOREIGN KEY `appointmentslots_ibfk_1`;

-- DropForeignKey
ALTER TABLE `artiststyles` DROP FOREIGN KEY `artiststyles_ibfk_1`;

-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_ibfk_2`;

-- DropForeignKey
ALTER TABLE `bookings` DROP FOREIGN KEY `bookings_ibfk_3`;

-- DropForeignKey
ALTER TABLE `tattoos` DROP FOREIGN KEY `tattoos_ibfk_1`;

-- DropForeignKey
ALTER TABLE `users` DROP FOREIGN KEY `users_ibfk_1`;

-- DropIndex
DROP INDEX `cityId` ON `users`;

-- AlterTable
ALTER TABLE `bookings` DROP COLUMN `dateTime`,
    DROP COLUMN `placement`,
    DROP COLUMN `referenceImageURL`,
    ADD COLUMN `commissionAmount` DECIMAL(10, 2) NULL,
    ADD COLUMN `placementId` INTEGER NULL,
    ADD COLUMN `referenceURL` VARCHAR(255) NULL,
    ADD COLUMN `slotId` INTEGER NOT NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `artistDescription`,
    DROP COLUMN `cityId`,
    DROP COLUMN `imageURL`,
    DROP COLUMN `instagramLink`,
    DROP COLUMN `isArtist`,
    DROP COLUMN `membershipFee`,
    DROP COLUMN `portfolioLink`,
    DROP COLUMN `streetAddress`,
    MODIFY `birthDate` DATE NOT NULL;

-- CreateTable
CREATE TABLE `artists` (
    `artistId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `cityId` INTEGER NULL,
    `artistDescription` TEXT NULL,
    `streetAddress` VARCHAR(255) NULL,
    `instagramLink` VARCHAR(255) NULL,
    `portfolioLink` VARCHAR(255) NULL,
    `membershipFee` DECIMAL(10, 2) NULL,
    `imageURL` VARCHAR(255) NULL,
    `createdAt` DATETIME(0) NULL DEFAULT CURRENT_TIMESTAMP(0),

    INDEX `cityId`(`cityId`),
    INDEX `userId`(`userId`),
    PRIMARY KEY (`artistId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `placements` (
    `placementId` INTEGER NOT NULL AUTO_INCREMENT,
    `placement` VARCHAR(100) NOT NULL,

    PRIMARY KEY (`placementId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `tattoostyles` (
    `id` INTEGER NOT NULL AUTO_INCREMENT,
    `tattooId` INTEGER NOT NULL,
    `styleId` INTEGER NOT NULL,

    INDEX `styleId`(`styleId`),
    INDEX `tattooId`(`tattooId`),
    PRIMARY KEY (`id`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `placementId` ON `bookings`(`placementId`);

-- CreateIndex
CREATE INDEX `slotId` ON `bookings`(`slotId`);

-- AddForeignKey
ALTER TABLE `artiststyles` ADD CONSTRAINT `artiststyles_ibfk_1` FOREIGN KEY (`artistId`) REFERENCES `artists`(`artistId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_ibfk_2` FOREIGN KEY (`artistId`) REFERENCES `artists`(`artistId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_ibfk_3` FOREIGN KEY (`slotId`) REFERENCES `appointmentslots`(`slotId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_ibfk_4` FOREIGN KEY (`statusId`) REFERENCES `bookingstatuses`(`statusId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_ibfk_5` FOREIGN KEY (`placementId`) REFERENCES `placements`(`placementId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tattoos` ADD CONSTRAINT `tattoos_ibfk_1` FOREIGN KEY (`artistId`) REFERENCES `artists`(`artistId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `appointmentslots` ADD CONSTRAINT `appointmentslots_ibfk_1` FOREIGN KEY (`artistId`) REFERENCES `artists`(`artistId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `artists` ADD CONSTRAINT `artists_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `artists` ADD CONSTRAINT `artists_ibfk_2` FOREIGN KEY (`cityId`) REFERENCES `cities`(`cityId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tattoostyles` ADD CONSTRAINT `tattoostyles_ibfk_1` FOREIGN KEY (`tattooId`) REFERENCES `tattoos`(`tattooId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `tattoostyles` ADD CONSTRAINT `tattoostyles_ibfk_2` FOREIGN KEY (`styleId`) REFERENCES `styles`(`styleId`) ON DELETE NO ACTION ON UPDATE NO ACTION;
