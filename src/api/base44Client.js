const STORAGE_KEY = "ocm_offline_db";
const CURRENT_USER_KEY = "ocm_current_user";

function slugify(name) {
  return String(name || "")
    .replace(/([a-z0-9])([A-Z])/g, "$1_$2")
    .replace(/[\s-]+/g, "_")
    .toLowerCase();
}

function nowIso() {
  return new Date().toISOString();
}

function safeParse(value, fallback) {
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function loadDB() {
  const raw = localStorage.getItem(STORAGE_KEY);
  const db = safeParse(raw, null);

  if (db && typeof db === "object") {
    return db;
  }

  const initial = {
    users: [],
    players: [],
    clubs: [],
    leagues: [],
    posts: [],
    comments: [],
    announcements: [],
    notifications: [],
    auctions: [],
    transfers: [],
    matches: [],
    tournaments: [],
    awards: [],
    academy_players: [],
    player_evolutions: [],
    player_messages: [],
    club_messages: [],
    community_messages: [],
    mercato_windows: [],
    seasons: [],
    tickets: []
  };

  localStorage.setItem(STORAGE_KEY, JSON.stringify(initial));
  return initial;
}

function saveDB(db) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(db));
}

function getCollectionName(entityName) {
  const key = slugify(entityName);

  const aliases = {
    user: "users",
    users: "users",
    player: "players",
    players: "players",
    club: "clubs",
    clubs: "clubs",
    league: "leagues",
    leagues: "leagues",
    post: "posts",
    posts: "posts",
    comment: "comments",
    comments: "comments",
    announcement: "announcements",
    announcements: "announcements",
    notification: "notifications",
    notifications: "notifications",
    auction: "auctions",
    auctions: "auctions",
    transfer: "transfers",
    transfers: "transfers",
    match: "matches",
    matches: "matches",
    tournament: "tournaments",
    tournaments: "tournaments",
    award: "awards",
    awards: "awards",
    academy_player: "academy_players",
    academy_players: "academy_players",
    player_evolution: "player_evolutions",
    player_evolutions: "player_evolutions",
    player_message: "player_messages",
    player_messages: "player_messages",
    club_message: "club_messages",
    club_messages: "club_messages",
    community_message: "community_messages",
    community_messages: "community_messages",
    mercato_window: "mercato_windows",
    mercato_windows: "mercato_windows",
    season: "seasons",
    seasons: "seasons",
    ticket: "tickets",
    tickets: "tickets"
  };

  return aliases[key] || `${key}s`;
}

function ensureCollection(db, entityName) {
  const collection = getCollectionName(entityName);
  if (!Array.isArray(db[collection])) {
    db[collection] = [];
  }
  return collection;
}

function makeId() {
  return `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function sortItems(items, sortExpr) {
  if (!sortExpr) return [...items];

  const desc = String(sortExpr).startsWith("-");
  const field = desc ? String(sortExpr).slice(1) : String(sortExpr);

  return [...items].sort((a, b) => {
    const av = a?.[field];
    const bv = b?.[field];

    if (av == null && bv == null) return 0;
    if (av == null) return 1;
    if (bv == null) return -1;

    if (av < bv) return desc ? 1 : -1;
    if (av > bv) return desc ? -1 : 1;
    return 0;
  });
}

function limitItems(items, limit) {
  if (!limit || Number.isNaN(Number(limit))) return items;
  return items.slice(0, Number(limit));
}

function matchesFilter(item, where = {}) {
  return Object.entries(where).every(([key, value]) => {
    if (Array.isArray(value)) {
      return value.includes(item?.[key]);
    }
    return item?.[key] === value;
  });
}

function getCurrentUser() {
  return safeParse(localStorage.getItem(CURRENT_USER_KEY), null);
}

function setCurrentUser(user) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

function updateStoredUser(user) {
  const db = loadDB();
  const collection = ensureCollection(db, "User");
  const index = db[collection].findIndex((u) => u.id === user.id);

  if (index >= 0) {
    db[collection][index] = user;
    saveDB(db);
  }
  setCurrentUser(user);
}

const auth = {
  async me() {
    return getCurrentUser();
  },

  async isAuthenticated() {
    return !!getCurrentUser();
  },

  async updateMe(data) {
    const currentUser = getCurrentUser();
    if (!currentUser) {
      throw new Error("Aucun utilisateur connecté");
    }

    const updated = {
      ...currentUser,
      ...data,
      updated_date: nowIso()
    };

    updateStoredUser(updated);
    return updated;
  },

  async logout() {
    setCurrentUser(null);
    return true;
  },

  redirectToLogin() {
    window.location.href = "/";
  },

  async login(email, password) {
    const db = loadDB();
    const collection = ensureCollection(db, "User");
    const user = db[collection].find(
      (u) => u.email === email && u.password === password
    );

    if (!user) {
      throw new Error("Identifiants invalides");
    }

    setCurrentUser(user);
    return user;
  },

  async register(data) {
    const db = loadDB();
    const collection = ensureCollection(db, "User");

    const exists = db[collection].some((u) => u.email === data.email);
    if (exists) {
      throw new Error("Cet utilisateur existe déjà");
    }

    const user = {
      id: makeId(),
      created_date: nowIso(),
      updated_date: nowIso(),
      role: "user",
      has_selected_club: false,
      ...data
    };

    db[collection].push(user);
    saveDB(db);
    setCurrentUser(user);
    return user;
  }
};

function makeEntityApi(entityName) {
  return {
    async list(sortExpr, limit) {
      const db = loadDB();
      const collection = ensureCollection(db, entityName);
      return limitItems(sortItems(db[collection], sortExpr), limit);
    },

    async filter(where = {}, sortExpr, limit) {
      const db = loadDB();
      const collection = ensureCollection(db, entityName);
      const filtered = db[collection].filter((item) => matchesFilter(item, where));
      return limitItems(sortItems(filtered, sortExpr), limit);
    },

    async get(id) {
      const db = loadDB();
      const collection = ensureCollection(db, entityName);
      return db[collection].find((item) => item.id === id) || null;
    },

    async create(data) {
      const db = loadDB();
      const collection = ensureCollection(db, entityName);

      const item = {
        id: makeId(),
        created_date: nowIso(),
        updated_date: nowIso(),
        ...data
      };

      db[collection].push(item);
      saveDB(db);
      return item;
    },

    async bulkCreate(items = []) {
      const created = [];
      for (const item of items) {
        created.push(await this.create(item));
      }
      return created;
    },

    async update(id, data) {
      const db = loadDB();
      const collection = ensureCollection(db, entityName);
      const index = db[collection].findIndex((item) => item.id === id);

      if (index === -1) {
        throw new Error(`${entityName} introuvable`);
      }

      db[collection][index] = {
        ...db[collection][index],
        ...data,
        updated_date: nowIso()
      };

      saveDB(db);

      if (entityName === "User") {
        const currentUser = getCurrentUser();
        if (currentUser?.id === id) {
          setCurrentUser(db[collection][index]);
        }
      }

      return db[collection][index];
    },

    async delete(id) {
      const db = loadDB();
      const collection = ensureCollection(db, entityName);
      db[collection] = db[collection].filter((item) => item.id !== id);
      saveDB(db);
      return true;
    }
  };
}

const entities = new Proxy(
  {},
  {
    get(_, entityName) {
      return makeEntityApi(entityName);
    }
  }
);

export const base44 = {
  auth,
  entities
};

export const base44Client = base44;
