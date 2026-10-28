import type { CookieOptions, Response } from "express";
import { env } from "@/config/env.js";

const baseCookieOptions: CookieOptions = {
  httpOnly: true,
  secure: env.NODE_ENV === "production",
  sameSite: "lax",
};

const accessCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  path: "/",
  maxAge: env.JWT_ACCESS_EXPIRES_IN_SECONDS * 1000,
};

const refreshCookieOptions: CookieOptions = {
  ...baseCookieOptions,
  path: "/",
  maxAge: env.JWT_REFRESH_EXPIRES_IN_SECONDS * 1000,
};

export function setAccessCookie(res: Response, accessToken: string) {
  res.cookie("accessToken", accessToken, accessCookieOptions);
}

export function setAuthCookies(
  res: Response,
  input: {
    accessToken: string;
    refreshToken: string;
  },
) {
  setAccessCookie(res, input.accessToken);
  res.cookie("refreshToken", input.refreshToken, refreshCookieOptions);
}

export function clearAuthCookies(res: Response) {
  const { maxAge: _accessMaxAge, ...accessClearOptions } = accessCookieOptions;
  const { maxAge: _refreshMaxAge, ...refreshClearOptions } = refreshCookieOptions;
  res.clearCookie("accessToken", accessClearOptions);
  res.clearCookie("refreshToken", refreshClearOptions);
}
