import Event from "../models/event.js";
import EventRSVP from "../models/eventRSVP.js";
import EventHost from "../models/eventHost.js";
import EventUpdate from "../models/eventUpdate.js";
import { redisClient } from "../config/redis.js";

const invalidateEventCaches = async (eventId, category = null, status = null) => {
    const keys = [
        `event:${eventId}`,
        'events:all',
        'events:pending',
        'events:upcoming',
        'events:past'
    ];
    
    if (category) {
        keys.push(`events:category:${category}`);
    }
    
    if (status) {
        keys.push(`events:status:${status}`);
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
    if (cached) {
        const event = JSON.parse(cached);
        if (userId) {
            const [rsvp, isHost] = await Promise.all([
                EventRSVP.findOne({ event: eventId, user: userId }),
                EventHost.findOne({ event: eventId, user: userId })
            ]);
            return {
                ...event,
                userRSVP: rsvp,
                isHost: !!isHost
            };
        }
        return event;
    }
    
    const event = await Event.findById(eventId)
        .populate("creator", "username fullname avatar");
    
    if (!event) return null;
    
    const [hosts, rsvpStats] = await Promise.all([
        EventHost.find({ event: eventId }).populate("user", "username fullname avatar"),
        EventRSVP.aggregate([
            { $match: { event: eventId } },
            { $group: { _id: "$status", count: { $sum: 1 }, guests: { $sum: "$guests_count" } } }
        ])
    ]);
    
    const stats = {
        going: { count: 0, guests: 0 },
        interested: { count: 0, guests: 0 },
        not_going: { count: 0, guests: 0 }
    };
    
    rsvpStats.forEach(stat => {
        if (stats[stat._id]) {
            stats[stat._id].count = stat.count;
            stats[stat._id].guests = stat.guests;
        }
    });
    
    const result = {
        ...event.toObject(),
        hosts: hosts.map(h => h.user),
        rsvpStats: stats
    };
    
    if (userId) {
        const [rsvp, isHost] = await Promise.all([
            EventRSVP.findOne({ event: eventId, user: userId }),
            EventHost.findOne({ event: eventId, user: userId })
        ]);
        result.userRSVP = rsvp;
        result.isHost = !!isHost;
    }
    
    const resultToCache = {
        ...result,
        userRSVP: null,
        isHost: false
    };
    await redisClient.setEx(eventKey, 300, JSON.stringify(resultToCache));
    return result;
};

export const createEvent = async (payload) => {
    const event = new Event(payload);
    await event.save();
    
    await invalidateEventCaches(null, payload.category, payload.status);
    
    await event.populate("creator", "username fullname avatar");
    return event;
};

export const updateEvent = async (eventId, userId, payload) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    const isCreator = event.creator.toString() === userId.toString();
    const isCoHost = await EventHost.findOne({ event: eventId, user: userId });
    
    if (!isCreator && !isCoHost) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    if (event.status === 'completed' || event.status === 'cancelled') {
        return { success: false, error: 'CANNOT_UPDATE', message: 'Cannot update completed or cancelled event' };
    }
    
    const oldCategory = event.category;
    const oldStatus = event.status;
    
    const updatedEvent = await Event.findByIdAndUpdate(
        eventId,
        payload,
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
        EventHost.deleteMany({ event: eventId }),
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
    
    const isCreator = event.creator.toString() === userId.toString();
    const isCoHost = await EventHost.findOne({ event: eventId, user: userId });
    
    if (!isCreator && !isCoHost) {
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
        const goingCount = await EventRSVP.countDocuments({ event: eventId, status: 'going' });
        const totalGuests = await EventRSVP.aggregate([
            { $match: { event: eventId, status: 'going' } },
            { $group: { _id: null, total: { $sum: "$guests_count" } } }
        ]);
        const totalAttendees = goingCount + (totalGuests[0]?.total || 0) + (payload.guests_count || 0);
        
        if (totalAttendees > event.capacity) {
            return { success: false, error: 'CAPACITY_EXCEEDED' };
        }
    }
    
    const rsvp = await EventRSVP.findOneAndUpdate(
        { event: eventId, user: userId },
        { ...payload, event: eventId, user: userId },
        { upsert: true, new: true }
    ).populate("user", "username fullname avatar");
    
    await redisClient.del(`event:${eventId}`);
    await redisClient.del(`events:rsvp:${eventId}`);
    
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
    
    return { success: true };
};

export const getRSVPStats = async (eventId) => {
    const cacheKey = `events:rsvp:stats:${eventId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const stats = await EventRSVP.aggregate([
        { $match: { event: eventId } },
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

export const addHost = async (eventId, userId, targetUserId) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'EVENT_NOT_FOUND' };
    }
    
    if (event.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    if (event.creator.toString() === targetUserId.toString()) {
        return { success: false, error: 'CANNOT_ADD_CREATOR' };
    }
    
    const existingHost = await EventHost.findOne({ event: eventId, user: targetUserId });
    if (existingHost) {
        return { success: false, error: 'ALREADY_HOST' };
    }
    
    const host = await EventHost.create({
        event: eventId,
        user: targetUserId,
        role: 'co_host',
        added_by: userId
    });
    
    await host.populate("user", "username fullname avatar");
    await redisClient.del(`event:${eventId}`);
    await redisClient.del(`events:hosts:${eventId}`);
    
    return { success: true, host };
};

export const removeHost = async (eventId, userId, targetUserId) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'EVENT_NOT_FOUND' };
    }
    
    if (event.creator.toString() !== userId.toString()) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    const host = await EventHost.findOneAndDelete({ event: eventId, user: targetUserId });
    if (!host) {
        return { success: false, error: 'NOT_FOUND' };
    }
    
    await redisClient.del(`event:${eventId}`);
    await redisClient.del(`events:hosts:${eventId}`);
    
    return { success: true };
};

export const getHosts = async (eventId) => {
    const cacheKey = `events:hosts:${eventId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const hosts = await EventHost.find({ event: eventId })
        .populate("user", "username fullname avatar")
        .populate("added_by", "username");
    
    await redisClient.setEx(cacheKey, 300, JSON.stringify(hosts));
    return hosts;
};

export const getEventsByHost = async (userId) => {
    const cacheKey = `events:host:${userId}`;
    const cached = await redisClient.get(cacheKey);
    if (cached) return JSON.parse(cached);
    
    const hostEvents = await EventHost.find({ user: userId })
        .populate({
            path: "event",
            populate: { path: "creator", select: "username fullname avatar" }
        });
    
    const events = hostEvents.map(he => he.event).filter(e => e);
    await redisClient.setEx(cacheKey, 300, JSON.stringify(events));
    return events;
};

export const createEventUpdate = async (eventId, userId, payload) => {
    const event = await Event.findById(eventId);
    if (!event) {
        return { success: false, error: 'EVENT_NOT_FOUND' };
    }
    
    const isCreator = event.creator.toString() === userId.toString();
    const isCoHost = await EventHost.findOne({ event: eventId, user: userId });
    
    if (!isCreator && !isCoHost) {
        return { success: false, error: 'FORBIDDEN' };
    }
    
    const update = await EventUpdate.create({
        ...payload,
        event: eventId,
        author: userId
    });
    
    await update.populate("author", "username fullname avatar");
    await redisClient.del(`events:updates:${eventId}`);
    
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
    const isCoHost = await EventHost.findOne({ event: update.event, user: userId });
    
    if (!isAuthor && !isCreator && !isCoHost) {
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

