import { Router } from "express";
import {
    getAllEvents,
    getEventById,
    getEventsByCategory,
    getUpcomingEvents,
    getPastEvents,
    searchEvents,
    createEvent,
    updateEvent,
    deleteEvent,
    cancelEvent,
    getPendingEvents,
    approveEvent,
    rejectEvent,
    getEventsByCreator,
    createRSVP,
    getRSVP,
    deleteRSVP,
    getRSVPStats,
    getRSVPList,
    addHost,
    removeHost,
    getHosts,
    getEventsByHost,
    createEventUpdate,
    getEventUpdates,
    updateEventUpdate,
    deleteEventUpdate,
    getMyEvents,
    getMyRSVPs,
    getUpcomingRSVPs
} from "../controllers/EventController.js";
import { authMiddleware } from "../middlewares/authMiddleware.js";
import { checkRole } from "../middlewares/checkRole.js";
import * as RateLimitMiddleware from "../middlewares/rateLimitMiddleware.js";

const eventRoutes = Router();

eventRoutes.get('/', RateLimitMiddleware.rateLimitByIP(100, 60), getAllEvents);
eventRoutes.get('/search', RateLimitMiddleware.rateLimitByIP(100, 60), searchEvents);
eventRoutes.get('/category', RateLimitMiddleware.rateLimitByIP(100, 60), getEventsByCategory);
eventRoutes.get('/upcoming', RateLimitMiddleware.rateLimitByIP(100, 60), getUpcomingEvents);
eventRoutes.get('/past', RateLimitMiddleware.rateLimitByIP(100, 60), getPastEvents);
eventRoutes.get('/pending', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(100, 60), getPendingEvents);
eventRoutes.get('/creator', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), getEventsByCreator);
eventRoutes.get('/my-events', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), getMyEvents);
eventRoutes.get('/my-rsvps', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), getMyRSVPs);
eventRoutes.get('/upcoming-rsvps', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), getUpcomingRSVPs);
eventRoutes.get('/hosts/my-events', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), getEventsByHost);
eventRoutes.get('/:id', RateLimitMiddleware.rateLimitByIP(100, 60), getEventById);
eventRoutes.post('/', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), createEvent);
eventRoutes.patch('/:id', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), updateEvent);
eventRoutes.delete('/:id', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), deleteEvent);
eventRoutes.post('/:id/cancel', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), cancelEvent);
eventRoutes.post('/:id/approve', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(100, 60), approveEvent);
eventRoutes.post('/:id/reject', authMiddleware, checkRole('admin'), RateLimitMiddleware.rateLimitByIP(100, 60), rejectEvent);

eventRoutes.post('/:eventId/rsvp', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), createRSVP);
eventRoutes.get('/:eventId/rsvp', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), getRSVP);
eventRoutes.delete('/:eventId/rsvp', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), deleteRSVP);
eventRoutes.get('/:eventId/rsvp/stats', RateLimitMiddleware.rateLimitByIP(100, 60), getRSVPStats);
eventRoutes.get('/:eventId/rsvp/list', RateLimitMiddleware.rateLimitByIP(100, 60), getRSVPList);

eventRoutes.post('/:eventId/hosts', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), addHost);
eventRoutes.delete('/:eventId/hosts/:userId', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), removeHost);
eventRoutes.get('/:eventId/hosts', RateLimitMiddleware.rateLimitByIP(100, 60), getHosts);

eventRoutes.post('/:eventId/updates', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), createEventUpdate);
eventRoutes.get('/:eventId/updates', RateLimitMiddleware.rateLimitByIP(100, 60), getEventUpdates);
eventRoutes.patch('/:eventId/updates/:updateId', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), updateEventUpdate);
eventRoutes.delete('/:eventId/updates/:updateId', authMiddleware, RateLimitMiddleware.rateLimitByIP(100, 60), deleteEventUpdate);

export default eventRoutes;

