import { useEffect, useState } from "react";
import { AppState } from "react-native";
export function useNow() {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000);
    const listener = AppState.addEventListener("change", (state) => {
      if (state === "active") setNow(new Date());
    });
    return () => {
      clearInterval(timer);
      listener.remove();
    };
  }, []);
  return now;
}
