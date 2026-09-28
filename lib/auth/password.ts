import bcrypt from 'bcryptjs';

const COST = 12;
let dummyHash: string | undefined;

export function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, COST);
}

export function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/** Hash to compare against when the user doesn't exist, so timing is equal (G7). */
export function getDummyHash(): string {
  dummyHash ??= bcrypt.hashSync('dummy-password-for-timing', COST);
  return dummyHash;
}
