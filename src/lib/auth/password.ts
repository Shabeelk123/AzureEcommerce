import { hash, verify } from "@node-rs/argon2";

// @node-rs/argon2 defaults to Argon2id (OWASP-recommended), 19 MiB memory,
// 2 iterations, 1 thread — sane defaults we don't override.

export function hashPassword(password: string): Promise<string> {
  return hash(password);
}

export function verifyPassword(hashed: string, password: string): Promise<boolean> {
  return verify(hashed, password);
}
