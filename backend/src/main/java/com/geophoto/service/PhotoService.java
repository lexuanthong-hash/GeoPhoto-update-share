package com.geophoto.service;

import com.drew.imaging.ImageProcessingException;
import com.drew.lang.GeoLocation;
import com.geophoto.dto.PhotoDTO;
import com.geophoto.entity.Photo;
import com.geophoto.entity.User;
import com.geophoto.repository.PhotoRepository;
import com.geophoto.util.GpsExtractor;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.lang.NonNull;

import java.io.File;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.nio.file.StandardCopyOption;
import java.time.LocalDateTime;
import java.util.List;
import java.util.UUID;
import java.util.stream.Collectors;

/**
 * Photo Service
 * Business logic for photo management and GPS extraction
 */
@Service
@RequiredArgsConstructor
@Slf4j
@Transactional
public class PhotoService {
    
    private final PhotoRepository photoRepository;
    private final org.springframework.data.mongodb.gridfs.GridFsTemplate gridFsTemplate;
    
    @Value("${app.upload.dir}")
    private String uploadDir;
    
    /**
     * Get all photos with GPS coordinates for a specific user
     */
    public List<PhotoDTO> getPhotosWithGpsByUser(String userId) {
        List<Photo> photos = photoRepository.findByUserIdAndLatitudeIsNotNullAndLongitudeIsNotNull(userId);
        return photos.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all photos for a specific user
     */
    public List<PhotoDTO> getAllPhotosByUser(String userId) {
        List<Photo> photos = photoRepository.findByUserId(userId);
        return photos.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all photos with GPS coordinates (legacy - for admin)
     */
    public List<PhotoDTO> getAllPhotosWithGps() {
        List<Photo> photos = photoRepository.findAllWithGpsCoordinates();
        return photos.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get all photos (legacy - for admin)
     */
    public List<PhotoDTO> getAllPhotos() {
        List<Photo> photos = photoRepository.findAll();
        return photos.stream()
                .map(this::convertToDTO)
                .collect(Collectors.toList());
    }
    
    /**
     * Get photo by ID
     */
    public PhotoDTO getPhotoById(@NonNull String id) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Photo not found with id: " + id));
        return convertToDTO(photo);
    }
    
    /**
     * Upload and process photo
     * Saves file to GridFS and extracts GPS metadata
     * 
     * @param file MultipartFile uploaded from client
     * @param description Optional description for the photo
     * @param user The user uploading the photo
     * @return PhotoDTO of the saved photo
     * @throws RuntimeException if file upload or processing fails
     */
    public PhotoDTO uploadPhoto(MultipartFile file, String description, User user) {
        // Validate file
        if (file.isEmpty()) {
            throw new RuntimeException("File is empty");
        }
        
        String originalFilename = file.getOriginalFilename();
        log.info("Starting upload process for file: {}", originalFilename);
        
        try {
            // Generate unique filename to avoid conflicts
            String fileExtension = getFileExtension(originalFilename);
            String uniqueFilename = UUID.randomUUID().toString() + fileExtension;
            
            // Store file in GridFS
            // We need to read input stream twice: once for GPS, once for GridFS.
            // Since we can't always reset MultipartFile stream reliably if it's not disk-backed, 
            // and we want to avoid memory issues with large files, we can:
            // 1. Store in GridFS first.
            // 2. Read from GridFS to extract GPS.
            
            org.bson.types.ObjectId gridFsFileId = gridFsTemplate.store(
                    file.getInputStream(), 
                    uniqueFilename, 
                    file.getContentType(),
                    new com.mongodb.BasicDBObject("userId", user.getId())
            );
            
            log.info("File saved to GridFS with ID: {}", gridFsFileId);
            
            // Create Photo document
            Photo photo = new Photo();
            photo.setFileName(originalFilename);
            // URL format: /api/photos/image/{uniqueFilename}
            photo.setUrl("/api/photos/image/" + uniqueFilename);
            photo.setDescription(description);
            photo.setUserId(user.getId());
            
            // Extract GPS coordinates from GridFS stream
            try (java.io.InputStream gridFsStream = gridFsTemplate.getResource(uniqueFilename).getInputStream()) {
                GeoLocation geoLocation = GpsExtractor.extractGpsCoordinates(gridFsStream, originalFilename);
                
                if (geoLocation != null) {
                    photo.setLatitude(geoLocation.getLatitude());
                    photo.setLongitude(geoLocation.getLongitude());
                    log.info("GPS coordinates extracted - Lat: {}, Lon: {}", 
                            geoLocation.getLatitude(), geoLocation.getLongitude());
                } else {
                    log.warn("No GPS coordinates found in image: {}", originalFilename);
                }
                
                // Re-open stream for date extraction (since previous read consumed it)
                try (java.io.InputStream dateStream = gridFsTemplate.getResource(uniqueFilename).getInputStream()) {
                     LocalDateTime dateTaken = GpsExtractor.extractDateTaken(dateStream, originalFilename);
                     photo.setTakenAt(dateTaken);
                }
                
            } catch (ImageProcessingException | IOException e) {
                log.error("Error extracting metadata from image: {}", originalFilename, e);
                // Continue saving photo without GPS data
            }
            
            // TODO: Generate thumbnail for map markers
            // For now, use the same URL as the full image
            photo.setThumbnailUrl(photo.getUrl());
            
            // Save to database
            Photo savedPhoto = photoRepository.save(photo);
            log.info("Photo saved to database with ID: {}", savedPhoto.getId());
            
            return convertToDTO(savedPhoto);
            
        } catch (IOException e) {
             log.error("Error uploading file: {}", originalFilename, e);
             throw new RuntimeException("Failed to upload file: " + e.getMessage(), e);
        }
    }
    
    /**
     * Get file resource from GridFS
     */
    public org.springframework.core.io.Resource getPhotoResource(String filename) {
        return gridFsTemplate.getResource(filename);
    }

    /**
     * Get file extension from filename
     */
    private String getFileExtension(String filename) {
        if (filename == null || filename.isEmpty()) {
            return "";
        }
        int lastDotIndex = filename.lastIndexOf('.');
        if (lastDotIndex == -1) {
            return "";
        }
        return filename.substring(lastDotIndex);
    }
    
    /**
     * Delete photo from database and GridFS
     */
    public void deletePhoto(@NonNull String id) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Photo not found with id: " + id));
        
        // Delete from GridFS
        String url = photo.getUrl();
        if (url != null && url.startsWith("/api/photos/image/")) {
            String filename = url.substring("/api/photos/image/".length());
            gridFsTemplate.delete(new org.springframework.data.mongodb.core.query.Query(
                    org.springframework.data.mongodb.core.query.Criteria.where("filename").is(filename)));
            log.info("Deleted file from GridFS: {}", filename);
        } else if (url != null && url.startsWith("/uploads/")) {
             // Legacy deletion for local files (best effort)
             try {
                String filename = url.substring("/uploads/".length());
                Path filePath = Paths.get(uploadDir).resolve(filename);
                if (Files.exists(filePath)) {
                    Files.delete(filePath);
                    log.info("Deleted legacy file from disk: {}", filePath.toAbsolutePath());
                }
             } catch (Exception e) {
                 log.warn("Failed to delete legacy file: {}", url);
             }
        }
        
        // Delete from database
        photoRepository.deleteById(id);
        log.info("Deleted photo from database with id: {}", id);
    }
    
    /**
     * Update photo location
     * Dùng để thêm GPS cho ảnh không có GPS
     */
    public PhotoDTO updatePhotoLocation(@NonNull String id, Double latitude, Double longitude) {
        Photo photo = photoRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Photo not found with id: " + id));
        
        photo.setLatitude(latitude);
        photo.setLongitude(longitude);
        
        Photo updatedPhoto = photoRepository.save(photo);
        log.info("Updated location for photo {}: ({}, {})", id, latitude, longitude);
        
        return convertToDTO(updatedPhoto);
    }
    
    /**
     * Convert Photo entity to PhotoDTO
     */
    private PhotoDTO convertToDTO(Photo photo) {
        PhotoDTO dto = new PhotoDTO();
        dto.setId(photo.getId());
        dto.setFileName(photo.getFileName());
        dto.setUrl(photo.getUrl());
        dto.setThumbnailUrl(photo.getThumbnailUrl());
        dto.setLatitude(photo.getLatitude());
        dto.setLongitude(photo.getLongitude());
        dto.setTakenAt(photo.getTakenAt());
        dto.setDescription(photo.getDescription());
        dto.setUploadedAt(photo.getUploadedAt());
        return dto;
    }
}

