import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { test } from "node:test";
import { createAdminStore, createLoginLimiter, isAnnouncement, secretsEqual, SESSION_SECONDS } from "../server/lib/adminStore.js";
test("server rejects expired or replaced sessions and logout revokes access", () => {
    let time = 0;
    const store = createAdminStore("/unused", () => time);
    const first = store.login();
    assert.equal(store.isAuthed(first), true);
    assert.equal(store.isAuthed(), false);
    assert.equal(store.isAuthed("wrong"), false);
    time = SESSION_SECONDS * 1_000;
    assert.equal(store.isAuthed(first), false);
    const second = store.login();
    assert.equal(store.isAuthed(first), false);
    assert.equal(store.isAuthed(second), true);
    store.logout();
    assert.equal(store.isAuthed(second), false);
});
test("announcements survive restarts and concurrent writes remain atomic", async () => {
    const directory = await mkdtemp(path.join(os.tmpdir(), "mx11-admin-"));
    const file = path.join(directory, "announcement.json");
    try {
        const store = createAdminStore(file);
        assert.equal(await store.getAnnouncement(), null);
        const first = { message: "First", type: "info", createdAt: 1 };
        const second = { message: "Second", type: "warning", createdAt: 2 };
        await Promise.all([store.setAnnouncement(first), store.setAnnouncement(second)]);
        assert.deepEqual(await createAdminStore(file).getAnnouncement(), second);
        assert.deepEqual(JSON.parse(await readFile(file, "utf8")), second);
        await store.setAnnouncement(null);
        assert.equal(await createAdminStore(file).getAnnouncement(), null);
    }
    finally {
        await rm(directory, { recursive: true, force: true });
    }
});
test("invalid announcements are rejected before persistence", () => {
    for (const value of [null, [], { message: 123 }, { message: "x", type: "invalid", createdAt: 1 },
        { message: "x", type: "info", createdAt: NaN }, { message: "x".repeat(2001), type: "info", createdAt: 1 }]) {
        assert.equal(isAnnouncement(value), false);
    }
});
test("failed logins are bounded and the limit expires", () => {
    let time = 0;
    const limiter = createLoginLimiter(() => time);
    for (let i = 0; i < 10; i++)
        assert.equal(limiter.allow(), true);
    assert.equal(limiter.allow(), false);
    time = 300_000;
    assert.equal(limiter.allow(), true);
});
test("credential comparison accepts only equal values", () => {
    assert.equal(secretsEqual("a", "a"), true);
    assert.equal(secretsEqual("a", "longer"), false);
});
