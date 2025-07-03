package com.barter.backend.service;

import com.cloudinary.Cloudinary;
import com.cloudinary.utils.ObjectUtils;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Map;
import java.net.MalformedURLException;
import java.net.URL; // Import URL for parsing

@Service
public class ImageUploadService {

    private static final Logger logger = LoggerFactory.getLogger(ImageUploadService.class);

    private final Cloudinary cloudinary;

    public ImageUploadService(Cloudinary cloudinary) {
        this.cloudinary = cloudinary;
    }

    public String uploadImage(MultipartFile file) throws IOException {
        if (file.isEmpty()) {
            throw new IllegalArgumentException("Cannot upload empty file.");
        }
        try {
            Map<?, ?> result = cloudinary.uploader().upload(file.getBytes(), ObjectUtils.emptyMap());
            String secureUrl = (String) result.get("secure_url"); // return the HTTPS image URL
            logger.info("Image uploaded successfully. URL: {}", secureUrl);
            return secureUrl;
        } catch (IOException e) {
            logger.error("Failed to upload image to Cloudinary: {}", e.getMessage(), e);
            throw new IOException("Failed to upload image to Cloudinary.", e);
        }
    }

    /**
     * Deletes an image from Cloudinary based on its URL.
     * Cloudinary uses the public ID for deletion, which is typically the last segment
     * of the URL path before the file extension.
     *
     * @param imageUrl The full URL of the image to delete from Cloudinary.
     * @throws IOException if there's an error during the deletion process.
     */
    public void deleteImage(String imageUrl) throws IOException {
        if (imageUrl == null || imageUrl.trim().isEmpty()) {
            logger.warn("Attempted to delete image with null or empty URL. Skipping deletion.");
            return;
        }

        try {
            // Extract the public ID from the Cloudinary URL
            // Example URL: https://res.cloudinary.com/your_cloud_name/image/upload/v12345/public_id_here.jpg
            // We need 'public_id_here'
            URL url = new URL(imageUrl);
            String path = url.getPath();
            // Remove the leading "/your_cloud_name/image/upload/vXXXXXXXXXX/" part
            String[] segments = path.split("/");
            String publicIdWithExtension = segments[segments.length - 1]; // e.g., "public_id_here.jpg"

            // Remove the file extension (e.g., .jpg, .png) to get the clean public ID
            String publicId;
            int dotIndex = publicIdWithExtension.lastIndexOf('.');
            if (dotIndex > 0) {
                publicId = publicIdWithExtension.substring(0, dotIndex);
            } else {
                publicId = publicIdWithExtension; // No extension found, use as is
            }

            logger.info("Attempting to delete image with Cloudinary public ID: {}", publicId);
            Map<?, ?> result = cloudinary.uploader().destroy(publicId, ObjectUtils.emptyMap());

            String deleteResult = (String) result.get("result");
            if ("ok".equals(deleteResult)) {
                logger.info("Successfully deleted image with public ID: {}", publicId);
            } else {
                logger.warn("Failed to delete image with public ID {}. Cloudinary result: {}", publicId, deleteResult);
                throw new IOException("Cloudinary image deletion failed with result: " + deleteResult);
            }
        } catch (MalformedURLException e) {
            logger.error("Invalid image URL provided for deletion: {}", imageUrl, e);
            throw new IOException("Invalid image URL for deletion: " + imageUrl, e);
        } catch (IOException e) {
            logger.error("Error during Cloudinary image deletion for URL {}: {}", imageUrl, e.getMessage(), e);
            throw new IOException("Failed to delete image from Cloudinary.", e);
        }
    }
}