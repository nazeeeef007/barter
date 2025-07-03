// com.barter.backend.controller.BarterPostController
package com.barter.backend.controller;

import com.barter.backend.exception.ResourceNotFoundException;
import com.barter.backend.exception.UnauthorizedAccessException;
import com.barter.backend.model.BarterPost;
import com.barter.backend.service.BarterPostService;
import com.google.firebase.auth.FirebaseToken;
import jakarta.servlet.http.HttpServletRequest;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;

@RestController
@RequestMapping("/api/posts")
public class BarterPostController {

    private static final Logger logger = LoggerFactory.getLogger(BarterPostController.class);

    private final BarterPostService postService;

    public BarterPostController(BarterPostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public ResponseEntity<List<BarterPost>> getPosts(
            @RequestParam(value = "uploaderId", required = false) String uploaderId,
            @RequestParam(value = "searchTerm", required = false) String searchTerm,
            @RequestParam(value = "skillCategory", required = false) List<String> skillCategories, // Maps to 'tags'
            @RequestParam(value = "location", required = false) String location,
            @RequestParam(value = "radius", required = false) Double radius, // Placeholder
            @RequestParam(value = "availability", required = false) String availability, // e.g., "2024-07-03"
            @RequestParam(value = "urgency", required = false) String urgency, // Placeholder for future use
            @RequestParam(value = "status", required = false, defaultValue = "open") String status,
            @RequestParam(value = "page", defaultValue = "0") int page,
            @RequestParam(value = "size", defaultValue = "10") int size,
            HttpServletRequest request
    ) {
        try {
            logger.info("Received request for filtered posts. Page: {}, Size: {}", page, size);
            List<BarterPost> posts = postService.getFilteredPosts(
                    uploaderId,
                    searchTerm,
                    skillCategories,
                    location,
                    radius,
                    availability,
                    urgency, // This will be passed, but its effect depends on BarterPost schema
                    status,
                    page,
                    size
            );

            logger.info("Fetched {} posts for page {} with filters.", posts.size(), page);
            return ResponseEntity.ok(posts);
        } catch (Exception e) {
            logger.error("Error fetching posts: {}", e.getMessage(), e);
            return new ResponseEntity<>(null, HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    // --- Existing methods (getPostById, createPost, updatePost, deletePost) remain unchanged ---
    @GetMapping("/{id}")
    public ResponseEntity<?> getPostById(
            @PathVariable String id,
            HttpServletRequest request
    ) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to access post {} without Firebase token.", id);
            return new ResponseEntity<>("Authentication required: Firebase token not found.", HttpStatus.UNAUTHORIZED);
        }

        try {
            BarterPost post = postService.getPostByIdForEdit(id, token.getUid());
            logger.info("Fetched post with ID: {} for user {}.", id, token.getUid());
            return ResponseEntity.ok(post);
        } catch (ResourceNotFoundException e) {
            logger.warn("Post not found for ID: {}", id);
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (UnauthorizedAccessException e) {
            logger.warn("Unauthorized attempt by user {} to access post {}: {}", token.getUid(), id, e.getMessage());
            return new ResponseEntity<>(e.getMessage(), HttpStatus.FORBIDDEN);
        } catch (Exception e) {
            logger.error("Error fetching post {} for user {}: {}", id, token.getUid(), e.getMessage(), e);
            return new ResponseEntity<>("Error fetching post: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }


    @PostMapping(consumes = {"multipart/form-data"})
    public ResponseEntity<?> createPost(
            @RequestPart("post") BarterPost post,
            @RequestPart(value = "image", required = false) MultipartFile image,
            HttpServletRequest request
    ) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to create post without Firebase token.");
            return new ResponseEntity<>("Authentication required: Firebase token not found.", HttpStatus.UNAUTHORIZED);
        }

        try {
            BarterPost createdPost = postService.createPost(post, image, token.getUid());
            logger.info("Created new post: {} by user {}", createdPost.getTitle(), token.getUid());
            return new ResponseEntity<>(createdPost, HttpStatus.CREATED);

        } catch (IllegalArgumentException e) {
            logger.warn("Bad request for post creation: {}", e.getMessage());
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (Exception e) {
            logger.error("Error creating post for user {}: {}", token.getUid(), e.getMessage(), e);
            return new ResponseEntity<>("Error creating post: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @PutMapping(value = "/{id}", consumes = {"multipart/form-data", "application/json"})
    public ResponseEntity<?> updatePost(
            @PathVariable String id,
            @RequestPart("post") BarterPost updatedPost,
            @RequestPart(value = "image", required = false) MultipartFile newImage,
            HttpServletRequest request
    ) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to update post {} without Firebase token.", id);
            return new ResponseEntity<>("Authentication required: Firebase token not found.", HttpStatus.UNAUTHORIZED);
        }

        try {
            BarterPost result = postService.updatePost(id, updatedPost, newImage, token.getUid());
            logger.info("Updated post with ID: {} by user {}", id, token.getUid());
            return ResponseEntity.ok(result);
        } catch (ResourceNotFoundException e) {
            logger.warn("Post not found for update: {}", id);
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (UnauthorizedAccessException e) {
            logger.warn("Unauthorized attempt to update post {}: {}", id, e.getMessage());
            return new ResponseEntity<>(e.getMessage(), HttpStatus.FORBIDDEN);
        } catch (IllegalArgumentException e) {
            logger.warn("Bad request for post update {}: {}", id, e.getMessage());
            return new ResponseEntity<>(e.getMessage(), HttpStatus.BAD_REQUEST);
        } catch (IOException e) {
            logger.error("Image handling error during post update {}: {}", id, e.getMessage(), e);
            return new ResponseEntity<>("Image handling error: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        } catch (Exception e) {
            logger.error("Error updating post {} for user {}: {}", id, token.getUid(), e.getMessage(), e);
            return new ResponseEntity<>("Error updating post: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public ResponseEntity<?> deletePost(@PathVariable String id, HttpServletRequest request) {
        FirebaseToken token = (FirebaseToken) request.getAttribute("firebaseToken");
        if (token == null) {
            logger.warn("Attempted to delete post {} without Firebase token.", id);
            return new ResponseEntity<>("Authentication required: Firebase token not found.", HttpStatus.UNAUTHORIZED);
        }

        try {
            postService.deletePost(id, token.getUid());
            logger.info("Deleted post with ID: {} by user {}", id, token.getUid());
            return ResponseEntity.noContent().build();
        } catch (ResourceNotFoundException e) {
            logger.warn("Post not found for deletion: {}", id);
            return new ResponseEntity<>(e.getMessage(), HttpStatus.NOT_FOUND);
        } catch (UnauthorizedAccessException e) {
            logger.warn("Unauthorized attempt by user {} to delete post {}: {}", token.getUid(), id, e.getMessage());
            return new ResponseEntity<>(e.getMessage(), HttpStatus.FORBIDDEN);
        } catch (Exception e) {
            logger.error("Error deleting post {} for user {}: {}", id, token.getUid(), e.getMessage(), e);
            return new ResponseEntity<>("Error deleting post: " + e.getMessage(), HttpStatus.INTERNAL_SERVER_ERROR);
        }
    }
}