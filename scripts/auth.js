import { appPath } from './utils.js';

const STORAGE_KEYS = {
	USERS: 'ae_users',
	USER: 'ae_user',
	SESSION: 'ae_session',
	REGISTERED_USER_REGISTRY: 'ae_registered_user_registry',
	REGISTERED_USER_SESSION: 'ae_registered_user_session',
};

function readData(key, fallback) {
	try {
		const value = localStorage.getItem(key);
		return value ? JSON.parse(value) : fallback;
	} catch (error) {
		return fallback;
	}
}

function writeData(key, value) {
	try {
		localStorage.setItem(key, JSON.stringify(value));
		return true;
	} catch (error) {
		return false;
	}
}

function ensureArray(value) {
	return Array.isArray(value) ? value : [];
}

function ensureUserCollections(user) {
	if (!user || typeof user !== 'object') return user;
	user.savedEvents = ensureArray(user.savedEvents);
	user.savedBlogs = ensureArray(user.savedBlogs);
	user.registeredEvents = ensureArray(user.registeredEvents);
	user.myBlogs = ensureArray(user.myBlogs);
	return user;
}

function normalizeEmail(email) {
	return String(email || '').trim().toLowerCase();
}

function getUsers() {
	const rawUsers = readData(STORAGE_KEYS.USERS, []);
	const users = (Array.isArray(rawUsers) ? rawUsers : [])
		.filter((user) => user && typeof user === 'object' && !Array.isArray(user))
		.map((user) => ensureUserCollections(user));

	if (!users.length) {
		const legacyUser = readData(STORAGE_KEYS.USER, null);
		if (legacyUser && legacyUser.email) {
			return [ensureUserCollections(legacyUser)];
		}
	}

	return users;
}

function getUserByEmail(email) {
	const target = normalizeEmail(email);
	if (!target) return null;

	return getUsers().find((user) => normalizeEmail(user && user.email) === target) || null;
}

function upsertUser(userObj) {
	if (!userObj || typeof userObj !== 'object') return getUsers();

	const email = normalizeEmail(userObj.email);
	if (!email) return getUsers();

	const nextUser = ensureUserCollections({ ...userObj, email });
	const users = getUsers();
	let found = false;

	const updatedUsers = users.map((user) => {
		if (normalizeEmail(user && user.email) === email) {
			found = true;
			return nextUser;
		}
		return user;
	});

	if (!found) updatedUsers.push(nextUser);
	writeData(STORAGE_KEYS.USERS, updatedUsers);
	return updatedUsers;
}

function getSession() {
	return localStorage.getItem(STORAGE_KEYS.SESSION);
}

function setSession(email) {
	localStorage.setItem(STORAGE_KEYS.SESSION, email || 'logged_in');
}

function clearSession() {
	localStorage.removeItem(STORAGE_KEYS.SESSION);
	localStorage.removeItem(STORAGE_KEYS.REGISTERED_USER_SESSION);
	localStorage.removeItem(STORAGE_KEYS.USER);
}

async function hashPassword(password) {
	const data = new TextEncoder().encode(password);
	const hashBuffer = await crypto.subtle.digest('SHA-256', data);
	const hashArray = Array.from(new Uint8Array(hashBuffer));
	return hashArray.map((byte) => byte.toString(16).padStart(2, '0')).join('');
}

async function verifyPassword(plainText, hash) {
	if (!hash) return false;
	const hashed = await hashPassword(plainText);
	return hashed === hash;
}

function isAdobeEmail(email) {
	return /@adobe\.com$/i.test(String(email || '').trim());
}

function dispatchAuthChanged() {
	const detail = {
		loggedIn: isLoggedIn(),
		user: getUser(),
	};

	document.dispatchEvent(new CustomEvent('auth:changed', { detail }));
}

function getUser() {
	const sessionValue = getSession();
	if (!sessionValue || sessionValue === 'logged_in') {
		const legacyUser = readData(STORAGE_KEYS.USER, null);
		if (legacyUser && legacyUser.email) {
			setSession(legacyUser.email);
			return ensureUserCollections(legacyUser);
		}
		return null;
	}

	return getUserByEmail(sessionValue);
}

function isLoggedIn() {
	return !!getSession() && !!getUser();
}

async function login(email, password) {
	const normalizedEmail = normalizeEmail(email);
	const user = getUserByEmail(normalizedEmail) || readData(STORAGE_KEYS.USER, null);

	if (!user || normalizeEmail(user.email) !== normalizedEmail) {
		throw new Error('INVALID_CREDENTIALS');
	}

	const valid = await verifyPassword(String(password || ''), String(user.passwordHash || ''));
	if (!valid) {
		throw new Error('INVALID_CREDENTIALS');
	}

	upsertUser(user);
	setSession(user.email);
	dispatchAuthChanged();
	return { success: true, user };
}

async function signup(formData) {
	const email = normalizeEmail((formData && formData.email) || '');

	if (!email) {
		throw new Error('INVALID_EMAIL');
	}

	if (!isAdobeEmail(email)) {
		throw new Error('INVALID_EMAIL');
	}

	const password = String((formData && formData.password) || '');
	if (password.length < 8) {
		throw new Error('WEAK_PASSWORD');
	}

	const confirmPassword = String((formData && formData.confirmPassword) || '');
	if (password !== confirmPassword) {
		throw new Error('PASSWORD_MISMATCH');
	}

	const existingUser = getUserByEmail(email);
	if (existingUser) {
		throw new Error('EMAIL_EXISTS');
	}

	const passwordHash = await hashPassword(password);
	const userObj = {
		name: String((formData && formData.name) || '').trim(),
		email: email,
		passwordHash: passwordHash,
		designation: String((formData && formData.designation) || '').trim(),
		bio: String((formData && formData.bio) || '').trim(),
		socials: (formData && formData.socials) || {},
		avatarSrc: (formData && formData.avatarSrc) || '',
		savedBlogs: [],
		savedEvents: [],
		registeredEvents: [],
		myBlogs: [],
		createdAt: new Date().toISOString(),
	};

	upsertUser(userObj);
	setSession(userObj.email);
	dispatchAuthChanged();
	return { success: true, user: userObj };
}

function logout() {
	clearSession();
	dispatchAuthChanged();
	window.location.href = appPath('/');
}

function updateNavbar() {
	dispatchAuthChanged();
}

function refreshOnStorageChange(event) {
	if (!event || !event.key) return;

	if ([
		STORAGE_KEYS.SESSION,
		STORAGE_KEYS.USER,
		STORAGE_KEYS.USERS,
		STORAGE_KEYS.REGISTERED_USER_REGISTRY,
		STORAGE_KEYS.REGISTERED_USER_SESSION,
	].includes(event.key)) {
		dispatchAuthChanged();
	}
}

function init() {
	window.addEventListener('storage', refreshOnStorageChange);
	if (document.readyState === 'loading') {
		document.addEventListener('DOMContentLoaded', () => dispatchAuthChanged(), { once: true });
	} else {
		dispatchAuthChanged();
	}
}

export {
	getUser,
	isLoggedIn,
	login,
	signup,
	logout,
	updateNavbar,
};

export default init;
