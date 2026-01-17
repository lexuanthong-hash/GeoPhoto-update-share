package com.geophoto.util;

import com.drew.imaging.ImageMetadataReader;
import com.drew.imaging.ImageProcessingException;
import com.drew.lang.GeoLocation;
import com.drew.metadata.Metadata;
import com.drew.metadata.exif.ExifSubIFDDirectory;
import com.drew.metadata.exif.GpsDirectory;
import lombok.extern.slf4j.Slf4j;

import java.io.File;
import java.io.IOException;
import java.time.LocalDateTime;
import java.time.ZoneId;
import java.util.Date;

/**
 * GPS Extractor Utility
 * Extracts GPS coordinates and metadata from photos using metadata-extractor library
 */
@Slf4j
public class GpsExtractor {
    
    /**
     * Extract GPS coordinates from image file
     * @return GeoLocation object containing latitude and longitude, or null if not available
     */
    public static GeoLocation extractGpsCoordinates(File imageFile) throws ImageProcessingException, IOException {
        Metadata metadata = ImageMetadataReader.readMetadata(imageFile);
        return extractGpsFromMetadata(metadata, imageFile.getName());
    }

    /**
     * Extract GPS coordinates from input stream
     * @return GeoLocation object containing latitude and longitude, or null if not available
     */
    public static GeoLocation extractGpsCoordinates(java.io.InputStream inputStream, String filename) throws ImageProcessingException, IOException {
        Metadata metadata = ImageMetadataReader.readMetadata(inputStream);
        return extractGpsFromMetadata(metadata, filename);
    }

    private static GeoLocation extractGpsFromMetadata(Metadata metadata, String filename) {
        GpsDirectory gpsDirectory = metadata.getFirstDirectoryOfType(GpsDirectory.class);
        
        if (gpsDirectory != null && gpsDirectory.getGeoLocation() != null) {
            GeoLocation location = gpsDirectory.getGeoLocation();
            log.info("Extracted GPS coordinates: Lat={}, Lon={}", location.getLatitude(), location.getLongitude());
            return location;
        }
        
        log.warn("No GPS coordinates found in image: {}", filename);
        return null;
    }
    
    /**
     * Extract date/time when photo was taken
     * @return LocalDateTime object or null if not available
     */
    public static LocalDateTime extractDateTaken(File imageFile) throws ImageProcessingException, IOException {
        Metadata metadata = ImageMetadataReader.readMetadata(imageFile);
        return extractDateTakenFromMetadata(metadata, imageFile.getName());
    }

    /**
     * Extract date/time when photo was taken from input stream
     * @return LocalDateTime object or null if not available
     */
    public static LocalDateTime extractDateTaken(java.io.InputStream inputStream, String filename) throws ImageProcessingException, IOException {
        Metadata metadata = ImageMetadataReader.readMetadata(inputStream);
        return extractDateTakenFromMetadata(metadata, filename);
    }

    private static LocalDateTime extractDateTakenFromMetadata(Metadata metadata, String filename) {
        ExifSubIFDDirectory directory = metadata.getFirstDirectoryOfType(ExifSubIFDDirectory.class);
        
        if (directory != null) {
            Date date = directory.getDate(ExifSubIFDDirectory.TAG_DATETIME_ORIGINAL);
            if (date != null) {
                LocalDateTime dateTime = date.toInstant()
                        .atZone(ZoneId.systemDefault())
                        .toLocalDateTime();
                log.info("Extracted date taken: {}", dateTime);
                return dateTime;
            }
        }
        
        log.warn("No date taken found in image: {}", filename);
        return null;
    }
}

