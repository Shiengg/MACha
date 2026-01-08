import * as eventService from "../services/event.service.js";
import { HTTP_STATUS, HTTP_STATUS_TEXT } from "../utils/status.js";

export const getAllEvents = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            category: req.query.category,
            city: req.query.city,
            page: parseInt(req.query.page) || 0,
            limit: parseInt(req.query.limit) || 20,
            sort: req.query.sort || 'createdAt'
        };
        
        const events = await eventService.getEvents(filters);
        res.status(HTTP_STATUS.OK).json({ events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getEventById = async (req, res) => {
    try {
        const eventId = req.params.id;
        const userId = req.user?._id;
        
        const event = await eventService.getEventById(eventId, userId);
        
        if (!event) {
            return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Event not found" });
        }
        
        res.status(HTTP_STATUS.OK).json({ event });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getEventsByCategory = async (req, res) => {
    try {
        const { category } = req.query;
        
        if (!category) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Category parameter is required"
            });
        }
        
        const validCategories = [
            "volunteering", "fundraising", "charity_event", "donation_drive"
        ];
        
        if (!validCategories.includes(category)) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Invalid category",
                validCategories
            });
        }
        
        const events = await eventService.getEventsByCategory(category);
        res.status(HTTP_STATUS.OK).json({ category, count: events.length, events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getUpcomingEvents = async (req, res) => {
    try {
        const days = parseInt(req.query.days) || 30;
        const events = await eventService.getUpcomingEvents(days);
        res.status(HTTP_STATUS.OK).json({ count: events.length, events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getPastEvents = async (req, res) => {
    try {
        const events = await eventService.getPastEvents();
        res.status(HTTP_STATUS.OK).json({ count: events.length, events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const searchEvents = async (req, res) => {
    try {
        const { q, query, city, category, start_date, end_date } = req.query;
        const searchTerm = q || query;
        
        if (!searchTerm || searchTerm.trim() === "") {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({
                message: "Search term is required"
            });
        }
        
        const filters = { city, category, start_date, end_date };
        const events = await eventService.searchEvents(searchTerm, filters);
        
        res.status(HTTP_STATUS.OK).json({ query: searchTerm, count: events.length, events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const createEvent = async (req, res) => {
    try {
        const event = await eventService.createEvent({
            ...req.body,
            creator: req.user._id
        });
        
        return res.status(HTTP_STATUS.CREATED).json({ event });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const updateEvent = async (req, res) => {
    try {
        const result = await eventService.updateEvent(
            req.params.id,
            req.user._id,
            req.body
        );
        
        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Event not found" });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
            }
            if (result.error === 'CANNOT_UPDATE') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: result.message });
            }
        }
        
        return res.status(HTTP_STATUS.OK).json({ event: result.event });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const deleteEvent = async (req, res) => {
    try {
        const result = await eventService.deleteEvent(req.params.id, req.user._id);
        
        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Event not found" });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
            }
        }
        
        return res.status(HTTP_STATUS.OK).json({ message: "Event deleted successfully" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const cancelEvent = async (req, res) => {
    try {
        const { reason } = req.body;
        
        const result = await eventService.cancelEvent(
            req.params.id,
            req.user._id,
            reason
        );
        
        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Event not found" });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
            }
            if (result.error === 'ALREADY_CANCELLED') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Event is already cancelled" });
            }
        }
        
        return res.status(HTTP_STATUS.OK).json({
            message: "Event cancelled successfully",
            event: result.event
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getPendingEvents = async (req, res) => {
    try {
        const events = await eventService.getPendingEvents();
        res.status(HTTP_STATUS.OK).json({ count: events.length, events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const approveEvent = async (req, res) => {
    try {
        const result = await eventService.approveEvent(
            req.params.id,
            req.user._id
        );
        
        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Event not found" });
            }
            if (result.error === 'INVALID_STATUS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: result.message });
            }
        }
        
        return res.status(HTTP_STATUS.OK).json({
            message: "Event approved successfully",
            event: result.event
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const rejectEvent = async (req, res) => {
    try {
        const { reason } = req.body;
        
        const result = await eventService.rejectEvent(
            req.params.id,
            req.user._id,
            reason
        );
        
        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Event not found" });
            }
            if (result.error === 'INVALID_STATUS') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: result.message });
            }
            if (result.error === 'MISSING_REASON') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Rejection reason is required" });
            }
        }
        
        return res.status(HTTP_STATUS.OK).json({
            message: "Event rejected successfully",
            event: result.event
        });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getEventsByCreator = async (req, res) => {
    try {
        const creatorId = req.query.creatorId || req.user?._id;
        if (!creatorId) {
            return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "creatorId is required" });
        }
        
        const events = await eventService.getEventsByCreator(creatorId);
        res.status(HTTP_STATUS.OK).json({ count: events.length, events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const createRSVP = async (req, res) => {
    try {
        const result = await eventService.createRSVP(
            req.params.eventId,
            req.user._id,
            req.body
        );
        
        if (!result.success) {
            if (result.error === 'EVENT_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Event not found" });
            }
            if (result.error === 'EVENT_NOT_ACTIVE') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Cannot RSVP to completed or cancelled event" });
            }
            if (result.error === 'CAPACITY_EXCEEDED') {
                return res.status(HTTP_STATUS.BAD_REQUEST).json({ message: "Event capacity exceeded" });
            }
        }
        
        return res.status(HTTP_STATUS.CREATED).json({ rsvp: result.rsvp });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getRSVP = async (req, res) => {
    try {
        const rsvp = await eventService.getRSVP(req.params.eventId, req.user._id);
        res.status(HTTP_STATUS.OK).json({ rsvp });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const deleteRSVP = async (req, res) => {
    try {
        const result = await eventService.deleteRSVP(req.params.eventId, req.user._id);
        
        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "RSVP not found" });
            }
        }
        
        return res.status(HTTP_STATUS.OK).json({ message: "RSVP deleted successfully" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getRSVPStats = async (req, res) => {
    try {
        const stats = await eventService.getRSVPStats(req.params.eventId);
        res.status(HTTP_STATUS.OK).json({ stats });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getRSVPList = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            page: parseInt(req.query.page) || 0,
            limit: parseInt(req.query.limit) || 20
        };
        
        const rsvps = await eventService.getRSVPList(req.params.eventId, filters);
        res.status(HTTP_STATUS.OK).json({ count: rsvps.length, rsvps });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const createEventUpdate = async (req, res) => {
    try {
        const result = await eventService.createEventUpdate(
            req.params.eventId,
            req.user._id,
            req.body
        );
        
        if (!result.success) {
            if (result.error === 'EVENT_NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Event not found" });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
            }
        }
        
        return res.status(HTTP_STATUS.CREATED).json({ update: result.update });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getEventUpdates = async (req, res) => {
    try {
        const filters = {
            page: parseInt(req.query.page) || 0,
            limit: parseInt(req.query.limit) || 20
        };
        
        const updates = await eventService.getEventUpdates(req.params.eventId, filters);
        res.status(HTTP_STATUS.OK).json({ count: updates.length, updates });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const updateEventUpdate = async (req, res) => {
    try {
        const result = await eventService.updateEventUpdate(
            req.params.updateId,
            req.user._id,
            req.body
        );
        
        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Update not found" });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
            }
        }
        
        return res.status(HTTP_STATUS.OK).json({ update: result.update });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const deleteEventUpdate = async (req, res) => {
    try {
        const result = await eventService.deleteEventUpdate(
            req.params.updateId,
            req.user._id
        );
        
        if (!result.success) {
            if (result.error === 'NOT_FOUND') {
                return res.status(HTTP_STATUS.NOT_FOUND).json({ message: "Update not found" });
            }
            if (result.error === 'FORBIDDEN') {
                return res.status(HTTP_STATUS.FORBIDDEN).json({ message: HTTP_STATUS_TEXT.FORBIDDEN });
            }
        }
        
        return res.status(HTTP_STATUS.OK).json({ message: "Update deleted successfully" });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getMyEvents = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            page: parseInt(req.query.page) || 0,
            limit: parseInt(req.query.limit) || 20
        };
        
        const events = await eventService.getMyEvents(req.user._id, filters);
        res.status(HTTP_STATUS.OK).json({ count: events.length, events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getMyRSVPs = async (req, res) => {
    try {
        const filters = {
            status: req.query.status,
            page: parseInt(req.query.page) || 0,
            limit: parseInt(req.query.limit) || 20
        };
        
        const events = await eventService.getMyRSVPs(req.user._id, filters);
        res.status(HTTP_STATUS.OK).json({ count: events.length, events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getUpcomingRSVPs = async (req, res) => {
    try {
        const events = await eventService.getUpcomingRSVPs(req.user._id);
        res.status(HTTP_STATUS.OK).json({ count: events.length, events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

export const getEventsForMap = async (req, res) => {
    try {
        const events = await eventService.getEventsForMap();
        return res.status(HTTP_STATUS.OK).json({ events });
    } catch (error) {
        return res.status(HTTP_STATUS.INTERNAL_SERVER_ERROR).json({ message: error.message });
    }
};

