import "firebase/auth";
import type { Persistence } from "firebase/auth";
// Firebase exports this API in its React Native build, but not in its web typings.
declare module "firebase/auth" {
  export function getReactNativePersistence(storage: {
    getItem(key: string): Promise<string | null>;
    setItem(key: string, value: string): Promise<void>;
    removeItem(key: string): Promise<void>;
  }): Persistence;
}
