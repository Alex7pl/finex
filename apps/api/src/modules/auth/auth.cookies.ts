import { Response } from "express";

const IS_PRODUCTION = process.env.NODE_ENV === "production";

export function setAuthCookies(
  res: Response,
  input: {
    accessToken: string;
    refreshToken: string;
  },
) {
  res.cookie("accessToken", input.accessToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/",
    maxAge: 15 * 60 * 1000,
  });

  res.cookie("refreshToken", input.refreshToken, {
    httpOnly: true,
    secure: IS_PRODUCTION,
    sameSite: "lax",
    path: "/auth/refresh",
    maxAge: 30 * 24 * 60 * 60 * 1000,
  });
}

export function clearAuthTokens(res: Response) {
  res.clearCookie("accessToken");
  res.clearCookie("refreshToken");
}
