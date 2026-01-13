import mongoose from "mongoose";
import Event from "../models/event.js";
import EventRSVP from "../models/eventRSVP.js";
import EventUpdate from "../models/eventUpdate.js";
import { redisClient } from "../config/redis.js";
import { publishEvent } from "./tracking.service.js";
import * as queueService from "./queue.service.js";
import { geocodeLocation } from "./geocoding.service.js";

const invalidateEventCaches = async (eventId, category = null, status = null) => {
    const keys = [
        `event:${eventId}`,
        'events:all',
        'events:pending',
        'events:upcoming',
        'events:past',
        'events:map'
    ];
    
    if (category) {
        keys.push(`events:category:${category}`);
    }
    
    if (status) {
        keys.push(`events:status:${status}`);
    }
    
    // Delete all dynamic cache keys with pattern events:all:*
    try {
        const dynamicKeys = [];
        for await (const key of redisClient.scanIterator({
            MATCH: 'events:all:*',
            COUNT: 100
        })) {
            dynamicKeys.push(String(key));
        }
        if (dynamicKeys.length > 0) {
            keys.push(...dynamicKeys);
        }
    } catch (error) {
        console.error('Error scanning dynamic event cache keys:', error);
    }
    
    await Promise.all(keys.map(key => redisClient.del(key)));
};

export const getEvents = async (filters = {}) => {
    const { status, category, city, page = 0, limit = 20, sort = 'createdAt' } = filters;
    
    const cacheKey = `events:all:${JSON.stringify(filters)}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }
    
    const query = {};
    if (status) query.status = status;
    if (category) query.category = category;
    if (city) query['location.city'] = city;
    
    const events = await Event.find(query)
        .populate("creator", "username fullname avatar")
        .skip(page * limit)
        .limit(limit)
        .sort({ [sort]: -1 });
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const getEventById = async (eventId, userId = null) => {
    const eventKey = `event:${eventId}`;
    const cached = await redisClient.get(eventKey);
    
    const eventObjectId = mongoose.Types.ObjectId.isValid(eventId) 
        ? new mongoose.Types.ObjectId(eventId) 
        : eventId;
    
    const rsvpStatsResult = await EventRSVP.aggregate([
        { $match: { event: eventObjectId } },
        { $group: { _id: "$status", count: { $sum: 1 }, guests: { $sum: "$guests_count" } } }
    ]);
    
    const stats = {
        going: { count: 0, guests: 0 },
        interested: { count: 0, guests: 0 },
        not_going: { count: 0, guests: 0 }
    };
    
    rsvpStatsResult.forEach(stat => {
        if (stats[stat._id]) {
            stats[stat._id].count = stat.count;
            stats[stat._id].guests = stat.guests;
        }
    });
    
    if (cached) {
        const event = JSON.parse(cached);
        event.rsvpStats = stats;
        
        if (userId) {
            const rsvp = await EventRSVP.findOne({ event: eventId, user: userId });
            return {
                ...event,
                userRSVP: rsvp
            };
        }
        return event;
    }
    
    const event = await Event.findById(eventId)
        .populate("creator", "username fullname avatar");
    
    if (!event) return null;
    
    const result = {
        ...event.toObject(),
        rsvpStats: stats
    };
    
    if (userId) {
        const rsvp = await EventRSVP.findOne({ event: eventId, user: userId });
        result.userRSVP = rsvp;
    }
    
    const resultToCache = {
        ...result,
        userRSVP: null
    };
    await redisClient.setEx(eventKey, 300, JSON.stringify(resultToCache));
    return result;
};

export const createEvent = async (payload) => {
    // Extract location_name from payload if provided
    const { location_name, ...eventData } = payload;
    
    // Geocode location if location_name is provided (similar to campaign)
    if (location_name && typeof location_name === 'string' && location_name.trim().length > 0) {
        try {
            const geocodeResult = await geocodeLocation(location_name);
            if (geocodeResult) {
                eventData.location = {
                    location_name: location_name.trim(),
                    latitude: geocodeResult.latitude,
                    longitude: geocodeResult.longitude
                };
            } else {
                // If geocoding fails, still create event but without location
                console.warn(`Geocoding failed for location: ${location_name}. Creating event without location.`);
            }
        } catch (error) {
            // Log error but don't fail event creation
            console.error(`Error geocoding location "${location_name}":`, error);
            // Continue without location data
        }
    }
    
    const event = new Event(eventData);
    await event.save();
    
    await invalidateEventCaches(null, eventData.category, eventData.status);
    
    await event.populate("creator", "username fullname avatar");
    return event;
};

export const updateEvent = async (eventId, userId, payload) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (event.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    if (event.status === 'completed' || event.status === 'cancelled') {
        return { success: false, error: 'CANNOT_UPDATE', message: 'Cannot update completed or cancelled event' };
    }
    
    // Extract location_name from payload if provided
    const { location_name, ...updateData } = payload;
    
    // Geocode location if location_name is being updated
    if (location_name && typeof location_name === 'string' && location_name.trim().length > 0) {
        try {
            const geocodeResult = await geocodeLocation(location_name);
            if (geocodeResult) {
                updateData.location = {
                    location_name: location_name.trim(),
                    latitude: geocodeResult.latitude,
                    longitude: geocodeResult.longitude
                };
            } else {
                // If geocoding fails, still update event but without location
                console.warn(`Geocoding failed for location: ${location_name}. Updating event without location.`);
            }
        } catch (error) {
            // Log error but don't fail event update
            console.error(`Error geocoding location "${location_name}":`, error);
            // Continue without location data
        }
    }
    
    const oldCategory = event.category;
    const oldStatus = event.status;
    
    const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        updateData,
        { new: true, runValidators: true }
    );
    
    await invalidateEventCaches(eventId, oldCategory, oldStatus);
    if (payload.category && payload.category !== oldCategory) {
        await invalidateEventCaches(null, payload.category);
    }
    if (payload.status && payload.status !== oldStatus) {
        await invalidateEventCaches(null, null, payload.status);
    }
    
    return { success: true, event: updatedEvent };
};

export const deleteEvent = async (eventId, userId) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (event.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    const category = event.category;
    const status = event.status;
    
    await Promise.all([
        EventRSVP.deleteMany({ event: eventId }),
        EventUpdate.deleteMany({ event: eventId }),
        Event.findByIdAndDelete(eventId)
    ]);
    
    await invalidateEventCaches(eventId, category, status);
    
    return { success: true };
};

export const cancelEvent = async (eventId, userId, reason) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (event.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    if (event.status === 'cancelled') {
        return { success: false, error: 'ALREADY_CANCELLED' };
    }
    
    event.status = 'cancelled';
    event.cancellation_reason = reason || 'No reason provided';
    event.cancelled_at = new Date();
    event.cancelled_by = userId;
    await event.save();
    
    await invalidateEventCaches(eventId, event.category, 'cancelled');
    
    return { success: true, event };
};

export const getPendingEvents = async () => {
    const cacheKey = 'events:pending';
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const events = await Event.find({ status: 'pending' })
        .populate("creator", "username fullname avatar email")
        .sort({ createdAt: -1 });
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const approveEvent = async (eventId, adminId) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (event.status !== 'pending') {
        return { success: false, error: 'INVALID_STATUS', message: `Cannot approve event with status: ${event.status}` };
    }
    
    event.status = 'published';
    event.approved_at = new Date();
    event.approved_by = adminId;
    await event.save();
    
    await invalidateEventCaches(eventId, event.category, 'pending');
    
    return { success: true, event };
};

export const rejectEvent = async (eventId, adminId, reason) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (event.status !== 'pending') {
        return { success: false, error: 'INVALID_STATUS', message: `Cannot reject event with status: ${event.status}` };
    }
    
    if (!reason || reason.trim().length === 0) {
        return { success: false, error: 'MISSING_REASON' };
    }
    
    event.status = 'rejected';
    event.rejected_reason = reason;
    event.rejected_at = new Date();
    event.rejected_by = adminId;
    await event.save();
    
    await invalidateEventCaches(eventId, event.category, 'pending');
    
    return { success: true, event };
};

export const getEventsByCategory = async (category) => {
    const cacheKey = `events:category:${category}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const events = await Event.find({ category, status: 'published' })
        .populate("creator", "username fullname avatar")
        .sort({ start_date: 1 });
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const getUpcomingEvents = async (days = 30) => {
    const cacheKey = `events:upcoming:${days}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const now = new Date();
    const futureDate = new Date();
    futureDate.setDate(now.getDate() + days);
    
    const events = await Event.find({
        status: 'published',
        start_date: { $gte: now, $lte: futureDate }
    })
        .populate("creator", "username fullname avatar")
        .sort({ start_date: 1 });
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const getPastEvents = async () => {
    const cacheKey = 'events:past';
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const now = new Date();
    const events = await Event.find({
        status: 'published',
        $or: [
            { end_date: { $lt: now } },
            { start_date: { $lt: now }, end_date: null }
        ]
    })
        .populate("creator", "username fullname avatar")
        .sort({ start_date: -1 });
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const getEventsByCreator = async (creatorId) => {
    const cacheKey = `events:creator:${creatorId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const events = await Event.find({ creator: creatorId })
        .populate("creator", "username fullname avatar")
        .sort({ createdAt: -1 });
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const searchEvents = async (query, filters = {}) => {
    const { city, category, start_date, end_date } = filters;
    
    const searchQuery = {
        status: 'published',
        $or: [
            { title: { $regex: query, $options: 'i' } },
            { description: { $regex: query, $options: 'i' } }
        ]
    };
    
    if (city) searchQuery['location.city'] = city;
    if (category) searchQuery.category = category;
    if (start_date || end_date) {
        searchQuery.start_date = {};
        if (start_date) searchQuery.start_date.$gte = new Date(start_date);
        if (end_date) searchQuery.start_date.$lte = new Date(end_date);
    }
    
    const events = await Event.find(searchQuery)
        .populate("creator", "username fullname avatar")
        .sort({ start_date: 1 })
        .limit(50);
    
    return events;
};

export const createRSVP = async (eventId, userId, payload) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'EVENT_NOT_FOUND' };
    }
    
    if (event.status === 'completed' || event.status === 'cancelled') {
        return { success: false, error: 'EVENT_NOT_ACTIVE' };
    }
    
    if (payload.status === 'going' && event.capacity) {
        const eventObjectId = mongoose.Types.ObjectId.isValid(eventId) 
            ? new mongoose.Types.ObjectId(eventId) 
            : eventId;
        
        const goingCount = await EventRSVP.countDocuments({ event: eventObjectId, status: 'going' });
        const totalGuests = await EventRSVP.aggregate([
            { $match: { event: eventObjectId, status: 'going' } },
            { $group: { _id: null, total: { $sum: "$guests_count" } } }
        ]);
        const totalAttendees = goingCount + (totalGuests[0]?.total || 0) + (payload.guests_count || 0);
        
        if (totalAttendees > event.capacity) {
            return { success: false, error: 'CAPACITY_EXCEEDED' };
        }
    }
    
    const existingRSVP = await EventRSVP.findOne({ event: eventId, user: userId });
    const isUpdate = !!existingRSVP;
    
    const rsvp = await EventRSVP.findOneAndUpdate(
        { event: eventId, user: userId },
        { ...payload, event: eventId, user: userId },
        { upsert: true, new: true }
    ).populate("user", "username fullname avatar");
    
    await redisClient.del(`event:${eventId}`);
    await redisClient.del(`events:rsvp:${eventId}`);
    await redisClient.del(`events:rsvp:stats:${eventId}`);
    
    const rsvpStats = await getRSVPStats(eventId);
    
    const eventData = {
        eventId: eventId.toString(),
        userId: userId.toString(),
        rsvp: {
            _id: rsvp._id.toString(),
            status: rsvp.status,
            guests_count: rsvp.guests_count || 0,
            user: {
                _id: rsvp.user._id.toString(),
                username: rsvp.user.username,
                fullname: rsvp.user.fullname,
                avatar: rsvp.user.avatar
            }
        },
        rsvpStats: rsvpStats
    };
    
    if (isUpdate) {
        await publishEvent("tracking:event:rsvp:updated", eventData);
    } else {
        await publishEvent("tracking:event:rsvp:created", eventData);
    }
    
    return { success: true, rsvp };
};

export const getRSVP = async (eventId, userId) => {
    const rsvp = await EventRSVP.findOne({ event: eventId, user: userId })
        .populate("user", "username fullname avatar");
    return rsvp;
};

export const deleteRSVP = async (eventId, userId) => {
    const rsvp = await EventRSVP.findOneAndDelete({ event: eventId, user: userId });
    if (!rsvp) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    await redisClient.del(`event:${eventId}`);
    await redisClient.del(`events:rsvp:${eventId}`);
    await redisClient.del(`events:rsvp:stats:${eventId}`);
    
    const rsvpStats = await getRSVPStats(eventId);
    
    const eventData = {
        eventId: eventId.toString(),
        userId: userId.toString(),
        rsvpStats: rsvpStats
    };
    
    await publishEvent("tracking:event:rsvp:deleted", eventData);
    
    return { success: true };
};

export const getRSVPStats = async (eventId) => {
    const cacheKey = `events:rsvp:stats:${eventId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const eventObjectId = mongoose.Types.ObjectId.isValid(eventId) 
        ? new mongoose.Types.ObjectId(eventId) 
        : eventId;
    
    const stats = await EventRSVP.aggregate([
        { $match: { event: eventObjectId } },
        { $group: { _id: "$status", count: { $sum: 1 }, guests: { $sum: "$guests_count" } } }
    ]);
    
    const result = {
        going: { count: 0, guests: 0 },
        interested: { count: 0, guests: 0 },
        not_going: { count: 0, guests: 0 }
    };
    
    stats.forEach(stat => {
        if (result[stat._id]) {
            result[stat._id].count = stat.count;
            result[stat._id].guests = stat.guests;
        }
    });
    
    await redisClient.setEx(cacheKey, 60, JSON.stringify(result));
    return result;
};

export const getRSVPList = async (eventId, filters = {}) => {
    const { status, page = 0, limit = 20 } = filters;
    const cacheKey = `events:rsvp:list:${eventId}:${JSON.stringify(filters)}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const query = { event: eventId };
    if (status) query.status = status;
    
    const rsvps = await EventRSVP.find(query)
        .populate("user", "username fullname avatar")
        .skip(page * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
    
    await redisClient.setEx(cacheKey, 120, JSON.stringify(rsvps));
    return rsvps;
};

export const createEventUpdate = async (eventId, userId, payload) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'EVENT_NOT_FOUND' };
    }
    
    if (event.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    const update = await EventUpdate.create({
        ...payload,
        event: eventId,
        author: userId
    });
    
    await update.populate("author", "username fullname avatar");
    await redisClient.del(`events:updates:${eventId}`);
    
    try {
        await queueService.pushJob({
            type: "EVENT_UPDATE_CREATED",
            eventId: eventId.toString(),
            userId: userId.toString(),
            updateContent: payload.content || 'Có cập nhật mới về sự kiện',
            eventTitle: event.title
        });
    } catch (queueError) {
        console.error('Error queueing event update notification job:', queueError);
    }
    
    try {
        const updateObject = update.toObject ? update.toObject() : JSON.parse(JSON.stringify(update));
        const eventData = {
            updateId: update._id.toString(),
            eventId: eventId.toString(),
            authorId: userId.toString(),
            event: {
                _id: event._id.toString(),
                title: event.title
            },
            update: updateObject
        };
        await publishEvent("tracking:event:update:created", eventData);
    } catch (eventError) {
        console.error('Error publishing event update created event:', eventError);
    }
    
    return { success: true, update };
};

export const getEventUpdates = async (eventId, filters = {}) => {
    const { page = 0, limit = 20 } = filters;
    const cacheKey = `events:updates:${eventId}:${page}:${limit}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const updates = await EventUpdate.find({ event: eventId })
        .populate("author", "username fullname avatar")
        .skip(page * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
    
    await redisClient.setEx(cacheKey, 120, JSON.stringify(updates));
    return updates;
};

export const updateEventUpdate = async (updateId, userId, payload) => {
    const update = await EventUpdate.findById(updateId);
    if (!update) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    if (update.author.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    const updated = await EventUpdate.findByIdAndUpdate(
        updateId,
        payload,
        { new: true }
    ).populate("author", "username fullname avatar");
    
    await redisClient.del(`events:updates:${update.event}`);
    
    return { success: true, update: updated };
};

export const deleteEventUpdate = async (updateId, userId) => {
    const update = await EventUpdate.findById(updateId);
    if (!update) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    const event = await Event.findById(update.event);
    const isAuthor = update.author.toString() === userId.toString();
    const isCreator = event?.creator.toString() === userId.toString();
    
    if (!isAuthor && !isCreator) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    await EventUpdate.findByIdAndDelete(updateId);
    await redisClient.del(`events:updates:${update.event}`);
    
    return { success: true };
};

export const getMyEvents = async (userId, filters = {}) => {
    const { status, page = 0, limit = 20 } = filters;
    const cacheKey = `events:my:${userId}:${JSON.stringify(filters)}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const query = { creator: userId };
    if (status) query.status = status;
    
    const events = await Event.find(query)
        .populate("creator", "username fullname avatar")
        .skip(page * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const getMyRSVPs = async (userId, filters = {}) => {
    const { status, page = 0, limit = 20 } = filters;
    const cacheKey = `events:my-rsvps:${userId}:${JSON.stringify(filters)}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const query = { user: userId };
    if (status) query.status = status;
    
    const rsvps = await EventRSVP.find(query)
        .populate({
            path: "event",
            populate: { path: "creator", select: "username fullname avatar" }
        })
        .skip(page * limit)
        .limit(limit)
        .sort({ createdAt: -1 });
    
    const events = rsvps.map(rsvp => rsvp.event).filter(e => e);
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const getUpcomingRSVPs = async (userId) => {
    const cacheKey = `events:upcoming-rsvps:${userId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const now = new Date();
    const rsvps = await EventRSVP.find({
        user: userId,
        status: 'going'
    })
        .populate({
            path: 'event',
            match: { start_date: { $gte: now }, status: 'published' }
        })
        .sort({ createdAt: -1 });
    
    const events = rsvps.filter(rsvp => rsvp.event).map(rsvp => rsvp.event);
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const processExpiredEvents = async () => {
    const now = new Date();
    
    const expiredEvents = await Event.find({
        status: 'published',
        $or: [
            { end_date: { $lt: now } },
            { start_date: { $lt: now }, end_date: null }
        ]
    });
    
    const results = [];
    
    for (const event of expiredEvents) {
        try {
            const oldCategory = event.category;
            
            event.status = 'completed';
            await event.save();
            
            await invalidateEventCaches(event._id, oldCategory, 'published');
            await invalidateEventCaches(event._id, oldCategory, 'completed');
            
            results.push({
                eventId: event._id.toString(),
                success: true,
                title: event.title
            });
            
            console.log(`[Expired Event] Event ${event._id} (${event.title}) marked as completed`);
        } catch (error) {
            console.error(`[Expired Event] Error processing event ${event._id}:`, error);
            results.push({
                eventId: event._id.toString(),
                success: false,
                error: error.message
            });
        }
    }
    
    return results;
};

export const getEventsForMap = async () => {
    const cacheKey = 'events:map';

    // Check cache
    const cached = await redisClient.get(cacheKey);
    if (cached) {
        return JSON.parse(cached);
    }

    // Query events with location data and published status
    const events = await Event.find({
        status: 'published',
        'location.latitude': { $exists: true, $ne: null },
        'location.longitude': { $exists: true, $ne: null }
    })
        .select('title location category banner_image creator start_date end_date status')
        .populate("creator", "username fullname avatar")
        .lean();

    // Cache for 5 minutes
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));

    return events;
};

