export interface Challenge {
  id: string;
  order: number;
  title: string;
  description: string;
  reflection: string;
  stage: string;
  minutes: number;
}
export interface Question {
  id: string;
  label: string;
}
export interface Level {
  publishedAt?: string;
  id: string;
  order: number;
  title: string;
  subtitle: string;
  description: string;
  published: boolean;
  prerequisiteId: string | null;
  challenges: Challenge[];
  questions: Question[];
}
export interface Child {
  id?: string;
  name: string;
  kind: "hijo" | "hija" | "otro";
  birthDate?: string | null;
}
export interface Family {
  name: string;
  partner1: string;
  partner2: string;
  children: Child[];
  timezone: string;
  marriageDate?: string | null;
  partner1BirthDate?: string | null;
  partner2BirthDate?: string | null;
  createdAt?: unknown;
}
export interface Completion {
  challengeId: string;
  completedAt: string;
  note: string;
}
export interface Progress {
  levelId: string;
  completions: Completion[];
  answers: Record<string, string>;
  finishedAt: string | null;
  nextAvailableAt: string | null;
}
export interface DevicePreferences {
  enabled: boolean;
  hour: number;
  minute: number;
  timezone: string;
}
export type ProgressMap = Record<string, Progress>;
export interface AnniversaryMilestone {
  year: number;
  material: string;
  meaning: string;
  invitation: string;
}
export interface AnniversaryCatalog {
  version: number;
  tradition: string;
  note: string;
  sources: { title: string; url: string }[];
  milestones: AnniversaryMilestone[];
}
export interface AppSettings {
  version: number;
  announcement: string;
  endTitle: string;
  endMessage: string;
  newLevelTitle: string;
  supportEmail: string;
  supportUrl: string;
  notificationsEnabled: boolean;
}
export interface FamilyControls {
  remindersPaused: boolean;
}
export type AccountRole = "owner" | "admin" | "member";
export interface FamilySummary {
  uid: string;
  familyName: string;
  email: string;
  joinedAt: unknown;
  lastActivityAt: unknown;
  lastCompletedAt: unknown;
  levelId: string;
  levelOrder: number;
  completedCount: number;
  totalCompleted: number;
  finishedCount: number;
}
export interface CommunityProfile {
  uid: string;
  alias: string;
  visible: boolean;
  shareAnniversary: boolean;
  shareProgress: boolean;
  marriageDate: string | null;
  timezone: string;
  completedCount: number;
  finishedCount: number;
  avatar: string | null;
  updatedAt?: unknown;
}
export interface FamilyMessage {
  id: string;
  title: string;
  body: string;
  senderUid: string;
  createdAt: unknown;
}
