import { REVIEW_STARS } from "@/src/services/canteen/review.service";
import { Ionicons } from "@expo/vector-icons";
import { Pressable, View } from "react-native";

type UserStarRatingProps = {
  value: number;
  size?: number;
  disabled?: boolean;
  /** Có hàm này thì các sao chạm được; nếu không chỉ hiển thị. */
  onChange?: (value: number) => void;
};

export default function UserStarRating({
  value,
  size = 18,
  disabled = false,
  onChange,
}: UserStarRatingProps) {
  return (
    <View
      accessibilityLabel={`${value} trên 5 sao`}
      className="flex-row items-center"
      style={{ gap: 4 }}
    >
      {REVIEW_STARS.map((star) => {
        const filled = star <= value;
        const icon = (
          <Ionicons
            color={filled ? "#f59e0b" : "#cbd5e1"}
            name={filled ? "star" : "star-outline"}
            size={size}
          />
        );
        return onChange ? (
          <Pressable
            accessibilityLabel={`${star} sao`}
            accessibilityRole="button"
            accessibilityState={{ disabled, selected: star === value }}
            disabled={disabled}
            hitSlop={6}
            key={star}
            onPress={() => onChange(star)}
          >
            {icon}
          </Pressable>
        ) : (
          <View key={star}>{icon}</View>
        );
      })}
    </View>
  );
}
