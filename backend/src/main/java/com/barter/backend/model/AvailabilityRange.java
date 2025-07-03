package com.barter.backend.model;

// No JsonIgnore needed if you don't have getters returning LocalDate
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.time.format.DateTimeParseException;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;


public class AvailabilityRange {
    private static final Logger logger = LoggerFactory.getLogger(AvailabilityRange.class);

    private String start;
    private String end;

    public AvailabilityRange() {}

    public AvailabilityRange(String start, String end) {
        this.start = start;
        this.end = end;
    }

    public String getStart() { return start; }
    public void setStart(String start) { this.start = start; }
    public String getEnd() { return end; }
    public void setEnd(String end) { this.end = end; }

    // RENAME OR MAKE PRIVATE TO AVOID GETTER CONVENTION
    // You would then call this like range.parseStartDateForFiltering() instead of range.getParsedStartDate()
    // Or move the parsing logic directly into BarterPostService where it's used.
    public LocalDate parseStartDateForFiltering() { // Renamed or made private
        if (start == null || start.isEmpty()) {
            return null;
        }
        try {
            return Instant.parse(start).atOffset(ZoneOffset.UTC).toLocalDate();
        } catch (DateTimeParseException e) {
            logger.warn("Error parsing start date string '{}' in AvailabilityRange: {}", start, e.getMessage());
            return null;
        }
    }

    public LocalDate parseEndDateForFiltering() { // Renamed or made private
        if (end == null || end.isEmpty()) {
            return null;
        }
        try {
            return Instant.parse(end).atOffset(ZoneOffset.UTC).toLocalDate();
        } catch (DateTimeParseException e) {
            logger.warn("Error parsing end date string '{}' in AvailabilityRange: {}", end, e.getMessage());
            return null;
        }
    }
}