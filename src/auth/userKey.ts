import type { AuthSession } from "./types";

export function userKey(session: AuthSession): string {
    return `${session.provider}:${session.userId}`;
}