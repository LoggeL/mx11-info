import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { mkdir, readFile, rename, writeFile } from "node:fs/promises";
import path from "node:path";
export const SESSION_SECONDS = 8 * 60 * 60;
const digest = (value) => createHash("sha256").update(value).digest();
export const secretsEqual = (a, b) => timingSafeEqual(digest(a), digest(b));
export function isAnnouncement(value) {
    if (!value || typeof value !== "object")
        return false;
    const v = value;
    return typeof v.message === "string" && v.message.length > 0 && v.message.length <= 2_000
        && ["info", "warning", "error"].includes(v.type ?? "")
        && typeof v.createdAt === "number" && Number.isFinite(v.createdAt);
}
export function createAdminStore(file, now = Date.now) {
    let session = null;
    let announcement = null;
    let loaded;
    let writes = Promise.resolve();
    const load = () => loaded ??= readFile(file, "utf8").then(text => {
        const value = JSON.parse(text);
        if (!isAnnouncement(value) && value !== null)
            throw new Error("Invalid announcement store");
        announcement = value;
    }).catch((error) => {
        if (error.code !== "ENOENT")
            throw error;
    });
    return {
        login() {
            const token = randomBytes(32).toString("hex");
            session = { hash: digest(token), expiresAt: now() + SESSION_SECONDS * 1_000 };
            return token;
        },
        isAuthed(token) {
            if (!session || session.expiresAt <= now()) {
                session = null;
                return false;
            }
            return !!token && timingSafeEqual(digest(token), session.hash);
        },
        logout() { session = null; },
        async getAnnouncement() { await load(); await writes; return announcement; },
        setAnnouncement(value) {
            if (value !== null && !isAnnouncement(value))
                return Promise.reject(new Error("Invalid announcement"));
            const operation = writes.catch(() => { }).then(async () => {
                await load();
                await mkdir(path.dirname(file), { recursive: true, mode: 0o700 });
                const temporary = `${file}.${randomBytes(8).toString("hex")}.tmp`;
                await writeFile(temporary, JSON.stringify(value), { mode: 0o600 });
                await rename(temporary, file);
                announcement = value;
            });
            writes = operation;
            return operation;
        },
    };
}
export function createLoginLimiter(now = Date.now) {
    let attempts = 0;
    let resetAt = 0;
    return {
        allow() {
            if (now() >= resetAt) {
                attempts = 0;
                resetAt = now() + 5 * 60 * 1_000;
            }
            return ++attempts <= 10;
        },
        reset() { attempts = 0; resetAt = 0; },
    };
}
const globalStore = globalThis;
export const adminStore = globalStore.mx11AdminStore ??= createAdminStore(path.join(process.env.MX11_DATA_DIR || path.join(process.cwd(), "data"), "announcement.json"));
export const loginLimiter = globalStore.mx11LoginLimiter ??= createLoginLimiter();
