import type { AppArea } from "@/src/application/access/roles";
import type { Href } from "expo-router";

const createAreaRoutes = (area: AppArea) =>
  ({
    home: `/(main)/${area}/home` as Href,
    chat: `/(main)/${area}/chat` as Href,
    todo: `/(main)/${area}/todo` as Href,
    canteen: `/(main)/${area}/canteen` as Href,
    workschedule: `/(main)/${area}/workschedule` as Href,
    utilities: `/(main)/${area}/utilities` as Href,
    directory: `/(main)/${area}/directory` as Href,
    profile: `/(main)/${area}/profile` as Href,
  }) as const;

export const APP_ROUTES = {
  auth: {
    login: "/(auth)/login" as Href,
  },
  admin: createAreaRoutes("admin"),
  user: createAreaRoutes("user"),
} as const;

export const getAreaRoutes = (area: AppArea) => APP_ROUTES[area];
