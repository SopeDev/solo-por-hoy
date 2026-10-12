import { randomInt } from "node:crypto";

// No 0/O or 1/I/L, so a code read aloud or retyped can't be mistaken.
const ALPHABET = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function newInviteCode(length = 8) {
  return Array.from({ length }, () => ALPHABET[randomInt(ALPHABET.length)]).join("");
}
