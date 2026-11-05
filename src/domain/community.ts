import type {
  CommunityProfile,
  Family,
  FamilySummary,
  ProgressMap,
} from "./types";
export const AVATAR_LIMIT = 44000;
export const DAY_MS = 86400000;
export function milliseconds(value: unknown): number | null {
  if (value && typeof value === "object" && "toMillis" in value)
    return (value as { toMillis(): number }).toMillis();
  if (value && typeof value === "object" && "seconds" in value)
    return Number((value as { seconds: number }).seconds) * 1000;
  if (typeof value === "string") {
    const time = Date.parse(value);
    return Number.isFinite(time) ? time : null;
  }
  return null;
}
export function supportStatus(summary: FamilySummary, now = new Date()) {
  const last =
    milliseconds(summary.lastCompletedAt) ?? milliseconds(summary.joinedAt);
  const days =
    last === null
      ? null
      : Math.max(0, Math.floor((now.getTime() - last) / DAY_MS));
  return { days, needsSupport: days !== null && days >= 7 };
}
export function communityDraft(uid: string, family: Family): CommunityProfile {
  return {
    uid,
    alias: family.name,
    visible: false,
    shareAnniversary: false,
    shareProgress: false,
    marriageDate: null,
    timezone: family.timezone,
    completedCount: 0,
    finishedCount: 0,
    avatar: null,
  };
}
export function publicProjection(
  profile: CommunityProfile,
  family: Family,
  progress: ProgressMap,
): CommunityProfile {
  if (!profile.alias.trim() || profile.alias.length > 60)
    throw new Error("Escribe un nombre público de hasta 60 caracteres.");
  if (
    profile.avatar &&
    (!/^data:image\/jpeg;base64,[A-Za-z0-9+/=]+$/.test(profile.avatar) ||
      profile.avatar.length > AVATAR_LIMIT)
  )
    throw new Error("La foto debe ser una miniatura JPEG de hasta 32 KB.");
  return {
    uid: profile.uid,
    alias: profile.alias.trim(),
    visible: profile.visible,
    shareAnniversary: profile.visible && profile.shareAnniversary,
    shareProgress: profile.visible && profile.shareProgress,
    marriageDate:
      profile.visible && profile.shareAnniversary
        ? (family.marriageDate ?? null)
        : null,
    timezone: family.timezone,
    completedCount:
      profile.visible && profile.shareProgress
        ? Object.values(progress).reduce((n, p) => n + p.completions.length, 0)
        : 0,
    finishedCount:
      profile.visible && profile.shareProgress
        ? Object.values(progress).filter((p) => p.finishedAt).length
        : 0,
    avatar: profile.visible ? profile.avatar : null,
  };
}
export function summaryFromProgress(
  uid: string,
  familyName: string,
  progress: ProgressMap,
): FamilySummary {
  const items = Object.values(progress);
  const current = items.at(-1);
  const completions = items.flatMap((p) => p.completions);
  return {
    uid,
    familyName,
    email: "",
    joinedAt: null,
    lastActivityAt: null,
    lastCompletedAt: completions.at(-1)?.completedAt ?? null,
    levelId: current?.levelId ?? "",
    levelOrder: current ? items.length : 0,
    completedCount: current?.completions.length ?? 0,
    totalCompleted: completions.length,
    finishedCount: items.filter((p) => p.finishedAt).length,
  };
}
