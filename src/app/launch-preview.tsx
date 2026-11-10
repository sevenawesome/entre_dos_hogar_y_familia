import { router } from "expo-router";
import { LaunchArtwork } from "../components/BrandedLaunch";
export default function LaunchPreview() {
  return <LaunchArtwork onClose={() => router.back()} />;
}
