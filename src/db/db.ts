import Dexie, { type Table } from 'dexie';
import { normalizeProfile } from '../data/profile';
import type { ChatMessage, DayRecord, DayTemplate, UserProfile, WeightRecord } from '../types';

/** profile 表只有一行，固定 id */
export const PROFILE_ID = 'me';

export interface ProfileRow extends UserProfile {
  id: string;
}

export interface SettingRow {
  key: string;
  value: string;
}

export class ZrFitnessDB extends Dexie {
  profile!: Table<ProfileRow, string>;
  dayTemplates!: Table<DayTemplate, string>;
  dayRecords!: Table<DayRecord, string>;
  weights!: Table<WeightRecord, string>;
  chatMessages!: Table<ChatMessage, string>;
  settings!: Table<SettingRow, string>;

  constructor() {
    super('zr-fitness-plan');
    this.version(1).stores({
      profile: 'id',
      dayTemplates: 'id',
      dayRecords: 'date',
      weights: 'date',
      chatMessages: 'id, createdAt',
      settings: 'key',
    });
  }
}

export const db = new ZrFitnessDB();

/* ------------------------------------------------------------------ */
/* 存储抽象：IndexedDB（Dexie）优先，失败时整体降级到 localStorage      */
/* ------------------------------------------------------------------ */

const LS_KEY = 'zr-fitness-plan::fallback';

interface Snapshot {
  profile: ProfileRow | null;
  dayTemplates: DayTemplate[];
  dayRecords: DayRecord[];
  weights: WeightRecord[];
  chatMessages: ChatMessage[];
  settings: SettingRow[];
}

const EMPTY_SNAPSHOT: Snapshot = {
  profile: null,
  dayTemplates: [],
  dayRecords: [],
  weights: [],
  chatMessages: [],
  settings: [],
};

/** IndexedDB 曾经失败过？失败后不再重试，全部走 localStorage */
let degraded = false;

function readSnapshot(): Snapshot {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return { ...EMPTY_SNAPSHOT };
    const parsed = JSON.parse(raw) as Partial<Snapshot>;
    return { ...EMPTY_SNAPSHOT, ...parsed };
  } catch {
    return { ...EMPTY_SNAPSHOT };
  }
}

function writeSnapshot(next: Snapshot): void {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(next));
  } catch {
    // localStorage 也写不进去（隐私模式 / 配额满），只能放弃持久化
  }
}

/**
 * 统一入口：先尝试 IndexedDB 操作。
 * 一旦 IndexedDB 不可用（Safari 隐私模式、被禁用等），标记降级并走 localStorage 分支。
 */
async function withDb<T>(idbOp: () => Promise<T>, fallbackOp: () => T): Promise<T> {
  if (!degraded) {
    try {
      return await idbOp();
    } catch (error) {
      degraded = true;
      console.warn('[db] IndexedDB 不可用，已降级到 localStorage：', error);
    }
  }
  return fallbackOp();
}

export interface LoadedData {
  profile: UserProfile | null;
  dayTemplates: DayTemplate[];
  dayRecords: DayRecord[];
  weights: WeightRecord[];
  chatMessages: ChatMessage[];
  degraded: boolean;
}

export async function loadAll(): Promise<LoadedData> {
  return withDb<LoadedData>(
    async () => {
      const [profile, dayTemplates, dayRecords, weights, chatMessages] = await Promise.all([
        db.profile.get(PROFILE_ID),
        db.dayTemplates.toArray(),
        db.dayRecords.toArray(),
        db.weights.toArray(),
        db.chatMessages.orderBy('createdAt').toArray(),
      ]);
      return {
        profile: profile ? stripProfileId(profile) : null,
        dayTemplates: dayTemplates.sort(byTemplateOrder),
        dayRecords,
        weights,
        chatMessages,
        degraded: false,
      };
    },
    () => {
      const snapshot = readSnapshot();
      return {
        profile: snapshot.profile ? stripProfileId(snapshot.profile) : null,
        dayTemplates: [...snapshot.dayTemplates].sort(byTemplateOrder),
        dayRecords: snapshot.dayRecords,
        weights: snapshot.weights,
        chatMessages: [...snapshot.chatMessages].sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
        degraded: true,
      };
    },
  );
}

function byTemplateOrder(a: DayTemplate, b: DayTemplate): number {
  return a.id.localeCompare(b.id);
}

/** 去掉固定主键 id，并把老数据缺失的字段补齐 */
function stripProfileId(row: ProfileRow): UserProfile {
  return normalizeProfile(row);
}

export async function saveProfile(profile: UserProfile): Promise<void> {
  const row: ProfileRow = { id: PROFILE_ID, ...profile };
  return withDb<void>(
    async () => {
      await db.profile.put(row);
    },
    () => {
      const snapshot = readSnapshot();
      writeSnapshot({ ...snapshot, profile: row });
    },
  );
}

export async function saveTemplates(templates: DayTemplate[]): Promise<void> {
  return withDb<void>(
    async () => {
      await db.transaction('rw', db.dayTemplates, async () => {
        await db.dayTemplates.clear();
        await db.dayTemplates.bulkPut(templates);
      });
    },
    () => {
      const snapshot = readSnapshot();
      writeSnapshot({ ...snapshot, dayTemplates: templates });
    },
  );
}

export async function saveRecord(record: DayRecord): Promise<void> {
  return withDb<void>(
    async () => {
      await db.dayRecords.put(record);
    },
    () => {
      const snapshot = readSnapshot();
      const dayRecords = snapshot.dayRecords.filter((item) => item.date !== record.date);
      writeSnapshot({ ...snapshot, dayRecords: [...dayRecords, record] });
    },
  );
}

export async function deleteRecord(date: string): Promise<void> {
  return withDb<void>(
    () => db.dayRecords.delete(date),
    () => {
      const snapshot = readSnapshot();
      writeSnapshot({ ...snapshot, dayRecords: snapshot.dayRecords.filter((item) => item.date !== date) });
    },
  );
}

export async function saveRecords(records: DayRecord[]): Promise<void> {
  return withDb<void>(
    async () => {
      await db.dayRecords.bulkPut(records);
    },
    () => {
      const snapshot = readSnapshot();
      const touched = new Set(records.map((item) => item.date));
      const kept = snapshot.dayRecords.filter((item) => !touched.has(item.date));
      writeSnapshot({ ...snapshot, dayRecords: [...kept, ...records] });
    },
  );
}

export async function deleteRecords(dates: string[]): Promise<void> {
  return withDb<void>(
    () => db.dayRecords.bulkDelete(dates),
    () => {
      const snapshot = readSnapshot();
      const removed = new Set(dates);
      writeSnapshot({ ...snapshot, dayRecords: snapshot.dayRecords.filter((item) => !removed.has(item.date)) });
    },
  );
}

export async function saveWeight(record: WeightRecord | null, date: string): Promise<void> {
  return withDb<void>(
    async () => {
      if (record) {
        await db.weights.put(record);
      } else {
        await db.weights.delete(date);
      }
    },
    () => {
      const snapshot = readSnapshot();
      const weights = snapshot.weights.filter((item) => item.date !== date);
      writeSnapshot({ ...snapshot, weights: record ? [...weights, record] : weights });
    },
  );
}

export async function saveMessage(message: ChatMessage): Promise<void> {
  return withDb<void>(
    async () => {
      await db.chatMessages.put(message);
    },
    () => {
      const snapshot = readSnapshot();
      const chatMessages = snapshot.chatMessages.filter((item) => item.id !== message.id);
      writeSnapshot({ ...snapshot, chatMessages: [...chatMessages, message] });
    },
  );
}

export async function clearMessages(): Promise<void> {
  return withDb<void>(
    () => db.chatMessages.clear(),
    () => {
      const snapshot = readSnapshot();
      writeSnapshot({ ...snapshot, chatMessages: [] });
    },
  );
}

export function isDegraded(): boolean {
  return degraded;
}
