import { useEffect, useState } from "react";
import { AppState } from "react-native";
export function useNow(deadline?: string | null) {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    const at = deadline ? Date.parse(deadline) : NaN;
    const delay = at - Date.now();
    // Wake at the exact boundary as well as refreshing the visible minutes.
    const wake =
      Number.isFinite(delay) && delay > 0
        ? setTimeout(() => setNow(new Date()), Math.min(delay, 2147483647))
        : undefined;
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      if (wake !== undefined) clearTimeout(wake);
      listener.remove();
    };
  }, [deadline]);
  return now;
}
