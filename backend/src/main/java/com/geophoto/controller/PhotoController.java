package com.geophoto.controller;

import com.geophoto.dto.PhotoDTO;
import com.geophoto.entity.User;
import com.geophoto.service.PhotoService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.lang.NonNull;

import java.util.List;

import org.springframework.core.io.Resource;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;

/**
 * Photo Controller
 * REST API endpoints for photo management
 */
@RestController
@RequestMapping("/api/photos")
@RequiredArgsConstructor
@Slf4j
public class PhotoController {
    
    private final PhotoService photoService;
    
    /**
     * Get current authenticated user
     */
    private User getCurrentUser() {
        Authentication authentication = SecurityContextHolder.getContext().getAuthentication();
        return (User) authentication.getPrincipal(); // Assuming User implements Principal or is the principal object
    }
    
    /**
     * GET /api/photos/image/{filename}
     * Serve photo image from GridFS
     */
    @GetMapping("/image/{filename}")
    public ResponseEntity<Resource> servePhoto(@PathVariable String filename) {
        Resource file = photoService.getPhotoResource(filename);
        if (file == null || !file.exists()) {
             return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline; filename=\"" + file.getFilename() + "\"")
                .contentType(MediaType.IMAGE_JPEG) // We could try to detect type, but JPEG is safe default or we can store content type in DB
                .body(file);
    }
    
    /**
     * GET /api/photos/with-gps
     * Lấy tất cả ảnh có tọa độ GPS của user hiện tại
     */
    @GetMapping("/with-gps")
    public ResponseEntity<List<PhotoDTO>> getPhotosWithGps() {
        User currentUser = getCurrentUser();
        log.info("Fetching photos with GPS for user: {}", currentUser.getUsername());
        List<PhotoDTO> photos = photoService.getPhotosWithGpsByUser(currentUser.getId());
        return ResponseEntity.ok(photos);
    }
    
    /**
     * GET /api/photos
     * Lấy tất cả ảnh của user hiện tại
     */
    @GetMapping
    public ResponseEntity<List<PhotoDTO>> getAllPhotos() {
        User currentUser = getCurrentUser();
        log.info("Fetching all photos for user: {}", currentUser.getUsername());
        List<PhotoDTO> photos = photoService.getAllPhotosByUser(currentUser.getId());
        return ResponseEntity.ok(photos);
    }
    
    /**
     * GET /api/photos/{id}
     * Lấy ảnh theo ID
     */
    @GetMapping("/{id}")
    public ResponseEntity<PhotoDTO> getPhotoById(@PathVariable @NonNull String id) {
        log.info("Fetching photo with id: {}", id);
        PhotoDTO photo = photoService.getPhotoById(id);
        return ResponseEntity.ok(photo);
    }
    
    /**
     * POST /api/photos/upload
     * Upload ảnh mới và tự động trích xuất GPS từ EXIF metadata
     * 
     * @param file File ảnh cần upload (JPEG, PNG, etc.)
     * @param description Mô tả tùy chọn cho ảnh
     * @return PhotoDTO chứa thông tin ảnh đã lưu, bao gồm GPS nếu có
     */
    @PostMapping("/upload")
    public ResponseEntity<?> uploadPhoto(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "description", required = false) String description) {
        
        // Validate file
        if (file.isEmpty()) {
            log.warn("Upload attempt with empty file");
            return ResponseEntity.badRequest().body("File không được để trống");
        }
        
        // Validate file type (only images)
        String contentType = file.getContentType();
        if (contentType == null || !contentType.startsWith("image/")) {
            log.warn("Upload attempt with non-image file: {}", contentType);
            return ResponseEntity.badRequest().body("Chỉ chấp nhận file ảnh (JPEG, PNG, etc.)");
        }
        
        User currentUser = getCurrentUser();
        log.info("Uploading photo for user {}: {} (size: {} bytes, type: {})", 
                currentUser.getUsername(), file.getOriginalFilename(), file.getSize(), contentType);
        
        try {
            PhotoDTO photo = photoService.uploadPhoto(file, description, currentUser);
            
            // Log GPS extraction result
            if (photo.getLatitude() != null && photo.getLongitude() != null) {
                log.info("Photo uploaded successfully with GPS coordinates: ({}, {})", 
                        photo.getLatitude(), photo.getLongitude());
            } else {
                log.info("Photo uploaded successfully without GPS coordinates");
            }
            
            return ResponseEntity.status(HttpStatus.CREATED).body(photo);
            
        } catch (RuntimeException e) {
            log.error("Error uploading photo: {}", file.getOriginalFilename(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi khi upload ảnh: " + e.getMessage());
        } catch (Exception e) {
            log.error("Unexpected error uploading photo: {}", file.getOriginalFilename(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body("Lỗi không xác định khi upload ảnh");
        }
    }
    
    /**
     * DELETE /api/photos/{id}
     * Xóa ảnh
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deletePhoto(@PathVariable @NonNull String id) {
        log.info("Deleting photo with id: {}", id);
        photoService.deletePhoto(id);
        return ResponseEntity.noContent().build();
    }
    
    /**
     * PUT /api/photos/{id}/location
     * Cập nhật vị trí GPS cho ảnh (dành cho ảnh không có GPS)
     * 
     * @param id ID của ảnh
     * @param request Body chứa latitude và longitude
     * @return PhotoDTO đã được cập nhật
     */
    @PutMapping("/{id}/location")
    public ResponseEntity<?> updatePhotoLocation(
            @PathVariable @NonNull String id,
            @RequestBody LocationUpdateRequest request) {
        
        log.info("Updating location for photo {}: lat={}, lon={}", 
                id, request.getLatitude(), request.getLongitude());
        
        try {
            PhotoDTO updatedPhoto = photoService.updatePhotoLocation(
                    id, 
                    request.getLatitude(), 
                    request.getLongitude()
            );
            
            log.info("Successfully updated location for photo {}", id);
            return ResponseEntity.ok(updatedPhoto);
            
        } catch (RuntimeException e) {
            log.error("Error updating location for photo {}: {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND)
                    .body("Không tìm thấy ảnh với ID: " + id);
        }
    }
    
    /**
     * Request body class for location update
     */
    public static class LocationUpdateRequest {
        private Double latitude;
        private Double longitude;
        
        public LocationUpdateRequest() {}
        
        public LocationUpdateRequest(Double latitude, Double longitude) {
            this.latitude = latitude;
            this.longitude = longitude;
        }
        
        public Double getLatitude() {
            return latitude;
        }
        
        public void setLatitude(Double latitude) {
            this.latitude = latitude;
        }
        
        public Double getLongitude() {
            return longitude;
        }
        
        public void setLongitude(Double longitude) {
            this.longitude = longitude;
        }
    }
}

