import bcrypt from "bcryptjs";

const BCRYPT_HASH_PATTERN = /^\$2[aby]\$/;

export function isBcryptHash(value: string): boolean {
  return BCRYPT_HASH_PATTERN.test(value);
}

export async function hashPassword(plain: string): Promise<string> {
  return bcrypt.hash(plain, 10);
}

export async function verifyPassword(plain: string, stored: string): Promise<boolean> {
  if (isBcryptHash(stored)) {
    return bcrypt.compare(plain, stored);
  }
  return plain === stored;
}
