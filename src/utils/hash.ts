import bcrypt from "bcrypt";

const SALT_ROUNDS: number = 10;

export const hashPassword = (plainPassword: string): Promise<string> => {
  return bcrypt.hash(plainPassword, SALT_ROUNDS);
};

export const comparePassword = (
  plainPassword: string,
  hashPassword: string
): Promise<boolean> => {
  return bcrypt.compare(plainPassword, hashPassword);
};
