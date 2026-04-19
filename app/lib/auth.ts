"use client";

import type { CharacterClass } from "./playerUtils";

export const AUTH_COOKIE_NAME = "nextlevel_auth";
const AUTH_STORAGE_KEY = "nextlevel_auth_v1";
export const AUTH_SESSION_STORAGE_KEY = "nextlevel_session_v1";
const AUTH_ACCOUNTS_STORAGE_KEY = "nextlevel_accounts_v1";
const AUTH_COOKIE_MAX_AGE_SECONDS = 60 * 60 * 24 * 30;
export const ADMIN_EMAIL = "bekzatik22.088@gmail.com";

export type AccountRole = "user" | "admin";

export type AuthAccount = {
  email: string;
  password: string;
  heroName: string;
  classType: CharacterClass;
  role: AccountRole;
  createdAt: string;
};

export type AuthAccountProfile = Omit<AuthAccount, "password">;

function readAuthCookie() {
  if (typeof document === "undefined") {
    return null;
  }

  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${AUTH_COOKIE_NAME}=`));

  if (!cookie) {
    return null;
  }

  return cookie.split("=")[1] ?? null;
}

function writeAuthCookie() {
  if (typeof document === "undefined") {
    return;
  }

  document.cookie = `${AUTH_COOKIE_NAME}=1; Path=/; Max-Age=${AUTH_COOKIE_MAX_AGE_SECONDS}; SameSite=Lax`;
}

function normalizeEmail(value: string) {
  return value.trim().toLowerCase();
}

export function getRoleForEmail(email: string): AccountRole {
  return normalizeEmail(email) === ADMIN_EMAIL ? "admin" : "user";
}

export function isAdminEmail(email: string) {
  return getRoleForEmail(email) === "admin";
}

function normalizeRole(rawRole: unknown, email: string): AccountRole {
  if (getRoleForEmail(email) === "admin") {
    return "admin";
  }

  if (rawRole === "admin") {
    return "admin";
  }

  // Legacy compatibility for old role value.
  if (rawRole === "player" || rawRole === "user") {
    return "user";
  }

  return "user";
}

function isCharacterClass(value: unknown): value is CharacterClass {
  return value === "Воин" || value === "Страж" || value === "Следопыт" || value === "Мистик";
}

function readAccounts(): AuthAccount[] {
  if (typeof window === "undefined") {
    return [];
  }

  const raw = window.localStorage.getItem(AUTH_ACCOUNTS_STORAGE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    return parsed
      .filter(
        (entry): entry is Omit<AuthAccount, "role"> & { role?: unknown } =>
          entry &&
          typeof entry === "object" &&
          typeof entry.email === "string" &&
          typeof entry.password === "string" &&
          typeof entry.heroName === "string" &&
          isCharacterClass(entry.classType),
      )
      .map((entry) => ({
        ...entry,
        role: normalizeRole(entry.role, entry.email),
      }));
  } catch {
    return [];
  }
}

function writeAccounts(accounts: AuthAccount[]) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts));
}

function saveSessionEmail(email: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_SESSION_STORAGE_KEY, normalizeEmail(email));
}

function clearSessionEmail() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(AUTH_SESSION_STORAGE_KEY);
}

export function listAccountProfiles(): AuthAccountProfile[] {
  return readAccounts().map(({ password: _password, ...profile }) => profile);
}

export function markAuthenticated(email?: string) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(AUTH_STORAGE_KEY, "1");
  if (email) {
    saveSessionEmail(email);
  }
  writeAuthCookie();
}

export function clearAuthentication() {
  if (typeof window !== "undefined") {
    window.localStorage.removeItem(AUTH_STORAGE_KEY);
  }
  clearSessionEmail();

  if (typeof document !== "undefined") {
    document.cookie = `${AUTH_COOKIE_NAME}=0; Path=/; Max-Age=0; SameSite=Lax`;
  }
}

export function isAuthenticated() {
  if (typeof window === "undefined") {
    return false;
  }

  const storageAuthorized = window.localStorage.getItem(AUTH_STORAGE_KEY) === "1";
  const cookieAuthorized = readAuthCookie() === "1";

  if (storageAuthorized && !cookieAuthorized) {
    writeAuthCookie();
    return true;
  }

  return storageAuthorized || cookieAuthorized;
}

export function getCurrentAccount() {
  if (typeof window === "undefined") {
    return null;
  }

  const sessionEmail = window.localStorage.getItem(AUTH_SESSION_STORAGE_KEY);
  if (!sessionEmail) {
    return null;
  }

  const normalizedSessionEmail = normalizeEmail(sessionEmail);
  const account = readAccounts().find(
    (entry) => normalizeEmail(entry.email) === normalizedSessionEmail,
  );

  if (!account) {
    return null;
  }

  const roleFromEmail = getRoleForEmail(account.email);
  if (account.role !== roleFromEmail) {
    const accounts = readAccounts().map((entry) =>
      normalizeEmail(entry.email) === normalizedSessionEmail
        ? { ...entry, role: roleFromEmail }
        : entry,
    );
    writeAccounts(accounts);

    return {
      ...account,
      role: roleFromEmail,
    };
  }

  return account;
}

export function loginWithCredentials(email: string, password: string) {
  const normalizedEmail = normalizeEmail(email);
  const safePassword = password.trim();
  const accounts = readAccounts();
  const account = accounts.find(
    (entry) =>
      normalizeEmail(entry.email) === normalizedEmail && entry.password === safePassword,
  );

  if (!account) {
    return {
      ok: false as const,
      error: "Неверная почта или пароль.",
    };
  }

  const roleFromEmail = getRoleForEmail(account.email);
  const normalizedAccount =
    account.role === roleFromEmail
      ? account
      : {
          ...account,
          role: roleFromEmail,
        };

  if (normalizedAccount !== account) {
    writeAccounts(
      accounts.map((entry) =>
        normalizeEmail(entry.email) === normalizedEmail ? normalizedAccount : entry,
      ),
    );
  }

  markAuthenticated(normalizedAccount.email);
  return {
    ok: true as const,
    account: normalizedAccount,
  };
}

export function registerAccount(input: {
  email: string;
  password: string;
  classType: CharacterClass;
  heroName: string;
}) {
  const normalizedEmail = normalizeEmail(input.email);
  const safePassword = input.password.trim();
  const safeName = input.heroName.trim();

  if (!normalizedEmail || !normalizedEmail.includes("@")) {
    return {
      ok: false as const,
      error: "Введите корректную почту.",
    };
  }

  if (safePassword.length < 4) {
    return {
      ok: false as const,
      error: "Пароль должен быть не короче 4 символов.",
    };
  }

  const accounts = readAccounts();
  if (accounts.some((account) => normalizeEmail(account.email) === normalizedEmail)) {
    return {
      ok: false as const,
      error: "Аккаунт с этой почтой уже существует.",
    };
  }

  const account: AuthAccount = {
    email: normalizedEmail,
    password: safePassword,
    heroName: safeName.length > 0 ? safeName : "Странник",
    classType: input.classType,
    role: getRoleForEmail(normalizedEmail),
    createdAt: new Date().toISOString(),
  };

  writeAccounts([...accounts, account]);
  markAuthenticated(account.email);

  return {
    ok: true as const,
    account,
  };
}
