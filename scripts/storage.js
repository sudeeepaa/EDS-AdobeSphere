import { getUser } from './auth.js';

/**
 * Storage utility for user data persistence and app state.
 */
const Storage = {
	/**
	 * Saves a user-created blog to localStorage.
	 * @param {Object} blog - The blog object to save.
	 */
	saveUserBlog(blog) {
		const blogs = JSON.parse(localStorage.getItem('ae_user_blogs') || '[]');
		blogs.push(blog);
		localStorage.setItem('ae_user_blogs', JSON.stringify(blogs));
	},

	/**
	 * Retrieves all user-created blogs from localStorage.
	 * @returns {Array} List of user blogs.
	 */
	getUserBlogs() {
		return JSON.parse(localStorage.getItem('ae_user_blogs') || '[]');
	},

	/**
	 * Checks if an event is saved by the current user.
	 * @param {string} id - The event ID.
	 * @returns {boolean}
	 */
	isEventSaved(id) {
		const user = getUser();
		if (!user) return false;
		return (user.savedEvents || []).includes(id);
	},

	/**
	 * Checks if an event is registered by the current user.
	 * @param {string} id - The event ID.
	 * @returns {boolean}
	 */
	isEventRegistered(id) {
		const user = getUser();
		if (!user) return false;
		return (user.registeredEvents || []).includes(id);
	},

	/**
	 * Toggles the saved state of an event.
	 * @param {string} id - The event ID.
	 * @returns {boolean} New saved state.
	 */
	toggleSavedEvent(id) {
		const user = getUser();
		if (!user) return false;

		user.savedEvents = user.savedEvents || [];
		const index = user.savedEvents.indexOf(id);
		let saved = false;

		if (index >= 0) {
			user.savedEvents.splice(index, 1);
		} else {
			user.savedEvents.push(id);
			saved = true;
		}

		this._updateUser(user);
		return saved;
	},

	/**
	 * Registers the current user for an event.
	 * @param {string} id - The event ID.
	 * @param {Object} user - The current user object.
	 */
	registerForEvent(id, user) {
		if (!user) return;
		user.registeredEvents = user.registeredEvents || [];
		if (!user.registeredEvents.includes(id)) {
			user.registeredEvents.push(id);
			this._updateUser(user);
		}
	},

	/**
	 * Deletes a user-created blog.
	 * @param {string} id - The blog ID.
	 */
	deleteUserBlog(id) {
		const blogs = this.getUserBlogs();
		const updated = blogs.filter((b) => b.id !== id);
		localStorage.setItem('ae_user_blogs', JSON.stringify(updated));
	},

	/**
	 * Unsaves an event.
	 * @param {string} id - The event ID.
	 */
	unsaveEvent(id) {
		const user = getUser();
		if (!user) return;
		user.savedEvents = (user.savedEvents || []).filter((eid) => eid !== id);
		this._updateUser(user);
	},

	/**
	 * Unsaves a blog.
	 * @param {string} id - The blog ID.
	 */
	unsaveBlog(id) {
		const user = getUser();
		if (!user) return;
		user.savedBlogs = (user.savedBlogs || []).filter((bid) => bid !== id);
		this._updateUser(user);
	},

	/**
	 * Cancels an event registration.
	 * @param {string} id - The event ID.
	 */
	cancelRegistration(id) {
		const user = getUser();
		if (!user) return;
		user.registeredEvents = (user.registeredEvents || []).filter((eid) => eid !== id);
		this._updateUser(user);
	},

	/**
	 * Updates the user profile data.
	 * @param {Object} patch - The fields to update.
	 */
	updateProfile(patch) {
		const user = getUser();
		if (!user) return;
		const updated = { ...user, ...patch };
		this._updateUser(updated);
		return updated;
	},

	/**
	 * Internal helper to update user data in all relevant storage locations.
	 * @private
	 */
	_updateUser(user) {
		const users = JSON.parse(localStorage.getItem('ae_users') || '[]');
		const updatedUsers = users.map((u) => (u.email === user.email ? user : u));
		localStorage.setItem('ae_users', JSON.stringify(updatedUsers));
		// Update current session user data
		localStorage.setItem('ae_user', JSON.stringify(user));
		document.dispatchEvent(new CustomEvent('auth:changed', { detail: { loggedIn: true, user } }));
	},
};

export default Storage;
