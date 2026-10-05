import { REVIEW_STARS } from "@/src/services/canteen/review.service";
import { Ionicons } from "@expo/vector-icons";
import { View } from "react-native";

type AdminStarRatingProps = {
  value: number;
  size?: number;
};

export default function AdminStarRating({
  value,
  size = 16,
}: AdminStarRatingProps) {
  return (
    <View
      accessibilityLabel={`${value} trên 5 sao`}
      className="flex-row items-center"
      style={{ gap: 3 }}
    >
      {REVIEW_STARS.map((star) => {
        const filled = star <= Math.round(value);
        return (
          <Ionicons
            color={filled ? "#f59e0b" : "#cbd5e1"}
            key={star}
            name={filled ? "star" : "star-outline"}
            size={size}
          />
        );
      })}
    </View>
  );
}
