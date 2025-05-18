/*
  Warnings:

  - You are about to drop the column `size` on the `bookings` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE `bookings` DROP COLUMN `size`,
    ADD COLUMN `sizeId` INTEGER NULL;

-- CreateTable
CREATE TABLE `sizes` (
    `sizeId` INTEGER NOT NULL AUTO_INCREMENT,
    `size` VARCHAR(50) NOT NULL,

    PRIMARY KEY (`sizeId`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- CreateIndex
CREATE INDEX `sizeId` ON `bookings`(`sizeId`);

-- AddForeignKey
ALTER TABLE `bookings` ADD CONSTRAINT `bookings_ibfk_6` FOREIGN KEY (`sizeId`) REFERENCES `sizes`(`sizeId`) ON DELETE NO ACTION ON UPDATE NO ACTION;
