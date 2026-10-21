export type AnnouncementType = "info" | "warning" | "error";
export interface Announcement { message: string; type: AnnouncementType; createdAt: number; }
export interface ServiceStatus {
  online: boolean;
  ping: number | null;
  players?: { current: number; max: number };
  history: number[];
}
export type StatusMap = Record<string, ServiceStatus>;
export interface CraftyServer {
  id: string; name: string; running: boolean; players: number; maxPlayers: number;
  cpu: number; ram: string; address?: string; version?: string; panelUrl?: string;
}
export interface PelicanServer {
  id: string; name: string; node: string; status: string; running?: boolean; cpu?: number;
  ram?: string | null; uptime?: number; maxPlayers?: number | null; address?: string | null;
  map?: string | null; memoryLimit?: number | null; cpuLimit?: number | null; panelUrl?: string | null;
}
export interface PanelData {
  pelican: PelicanServer[]; crafty: CraftyServer[];
  errors?: Partial<Record<"pelican" | "crafty", string>>;
}
