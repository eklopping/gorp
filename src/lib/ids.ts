import { nanoid } from "nanoid";

export function createId(prefix?: string) {
  const id = nanoid(16);
  return prefix ? `${prefix}_${id}` : id;
}

export function createInviteToken() {
  return nanoid(24);
}
