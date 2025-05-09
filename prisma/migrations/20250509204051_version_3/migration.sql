/*
  Warnings:

  - You are about to drop the column `appointmentPrice` on the `users` table. All the data in the column will be lost.
  - You are about to drop the column `passwordHash` on the `users` table. All the data in the column will be lost.
  - You are about to drop the `availability` table. If the table is not empty, all the data it contains will be lost.
  - A unique constraint covering the columns `[userId,bookingId]` on the table `reviews` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `password` to the `users` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE `availability` DROP FOREIGN KEY `availability_ibfk_1`;

-- AlterTable
ALTER TABLE `bookings` ADD COLUMN `isColor` BOOLEAN NULL DEFAULT false,
    ADD COLUMN `placement` VARCHAR(100) NULL,
    ADD COLUMN `referenceImageURL` VARCHAR(255) NULL,
    ADD COLUMN `size` VARCHAR(50) NULL;

-- AlterTable
ALTER TABLE `tattoos` MODIFY `tattooName` VARCHAR(100) NULL;

-- AlterTable
ALTER TABLE `users` DROP COLUMN `appointmentPrice`,
    DROP COLUMN `passwordHash`,
    ADD COLUMN `membershipFee` DECIMAL(10, 2) NULL DEFAULT 0.00,
    ADD COLUMN `password` VARCHAR(255) NOT NULL;

-- DropTable
DROP TABLE `availability`;

-- CreateTable
CREATE TABLE `appointmentslots` (
    `slotId` INTEGER NOT NULL AUTO_INCREMENT,
    `artistId` INTEGER NOT NULL,
    `dateTime` DATETIME(0) NOT NULL,
    `duration` INTEGER NOT NULL,
    `isBooked` BOOLEAN NULL DEFAULT false,

    UNIQUE INDEX `artistId`(`artistId`, `dateTime`),
    PRIMARY KEY (`slotId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `favorites` (
    `favId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `tattooId` INTEGER NOT NULL,

    INDEX `tattooId`(`tattooId`),
    UNIQUE INDEX `userId`(`userId`, `tattooId`),
    PRIMARY KEY (`favId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateTable
CREATE TABLE `savedar` (
    `savedId` INTEGER NOT NULL AUTO_INCREMENT,
    `userId` INTEGER NOT NULL,
    `imageURL` VARCHAR(255) NOT NULL,

    UNIQUE INDEX `userId`(`userId`, `imageURL`),
    PRIMARY KEY (`savedId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
-- CREATE UNIQUE INDEX `userId` ON `reviews`(`userId`, `bookingId`);

-- AddForeignKey
ALTER TABLE `appointmentslots` ADD CONSTRAINT `appointmentslots_ibfk_1` FOREIGN KEY (`artistId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `favorites` ADD CONSTRAINT `favorites_ibfk_2` FOREIGN KEY (`tattooId`) REFERENCES `tattoos`(`tattooId`) ON DELETE NO ACTION ON UPDATE NO ACTION;

-- AddForeignKey
ALTER TABLE `savedar` ADD CONSTRAINT `savedar_ibfk_1` FOREIGN KEY (`userId`) REFERENCES `users`(`userId`) ON DELETE NO ACTION ON UPDATE NO ACTION;
