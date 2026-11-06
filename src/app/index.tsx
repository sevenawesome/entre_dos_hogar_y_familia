import { ActivityIndicator, View } from "react-native";
import { colors } from "../components/ui";
export default function Index() {
  return (
    <View
      style={{
        flex: 1,
        justifyContent: "center",
        backgroundColor: colors.background,
      }}
    >
      <ActivityIndicator color={colors.navy} />
    </View>
  );
}
