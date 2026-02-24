// Shared in-memory store for admin state
// Resets on container restart

export interface Announcement {
  message: string;
  type: "info" | "warning" | "error";
  createdAt: number;
}

declare global {
  var __adminToken: string | null;
  var __announcement: Announcement | null;
}

if (!global.__adminToken) global.__adminToken = null;
if (!global.__announcement) global.__announcement = null;

export function getAdminToken() { return global.__adminToken; }
export function setAdminToken(t: string | null) { global.__adminToken = t; }
export function getAnnouncement() { return global.__announcement; }
export function setAnnouncement(a: Announcement | null) { global.__announcement = a; }
