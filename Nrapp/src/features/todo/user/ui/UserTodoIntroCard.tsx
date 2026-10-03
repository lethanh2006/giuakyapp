import { Ionicons } from "@expo/vector-icons";
import { Text, View } from "react-native";

export default function UserTodoIntroCard() {
  return (
    <View className="flex-row items-center rounded-3xl border border-blue-100 bg-blue-50 p-4">
      <View className="mr-3 h-12 w-12 items-center justify-center rounded-2xl bg-blue-600">
        <Ionicons name="checkmark-done-outline" size={24} color="#fff" />
      </View>
      <View className="flex-1">
        <Text className="text-lg font-black text-slate-800">Công việc của tôi</Text>
        <Text className="mt-1 text-xs leading-5 text-slate-500">
          Theo dõi việc được giao và cập nhật tiến độ thực hiện.
        </Text>
      </View>
    </View>
  );
}
