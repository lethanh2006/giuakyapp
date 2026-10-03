import { Ionicons } from "@expo/vector-icons";
import React from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";
import {
  PRIORITY_MAP,
  PRIORITY_OPTIONS,
  STATUS_MAP,
  STATUS_OPTIONS,
  type TaskPriority,
  type TaskStatus,
} from "@/src/services/todo/constant";
import type { AppArea } from "@/src/application/access/roles";

type Props = {
  area: AppArea;
  status: TaskStatus | null;
  priority: TaskPriority | null;
  searchInput: string;
  appliedSearch: string;
  page: number;
  total: number;
  totalPages: number;
  loading: boolean;
  onChangeStatus: (status: TaskStatus | null) => void;
  onChangePriority: (priority: TaskPriority | null) => void;
  onChangeSearchInput: (value: string) => void;
  onApplySearch: () => void;
  onReset: () => void;
  onChangePage: (page: number) => void;
};

export default function AdminTodoTaskFilters({
  area,
  status,
  priority,
  searchInput,
  appliedSearch,
  page,
  total,
  totalPages,
  loading,
  onChangeStatus,
  onChangePriority,
  onChangeSearchInput,
  onApplySearch,
  onReset,
  onChangePage,
}: Props) {
  const isAdminArea = area === "admin";
  const hasFilter =
    status !== null ||
    priority !== null ||
    !!searchInput.trim() ||
    !!appliedSearch;
  const safeTotalPages = Math.max(totalPages, 1);

  return (
    <View className="rounded-2xl border border-slate-100 bg-white p-4" style={{ elevation: 2 }}>
      <View className="mb-3 flex-row items-center justify-between">
        <View className="flex-row items-center">
          <View
            className={`mr-2 rounded-lg p-1.5 ${
              isAdminArea ? "bg-red-50" : "bg-indigo-50"
            }`}
          >
            <Ionicons
              name="filter-outline"
              size={18}
              color={isAdminArea ? "#dc2626" : "#6366f1"}
            />
          </View>
          <Text className="text-sm font-bold text-slate-800">Bộ lọc công việc</Text>
        </View>
        {hasFilter ? (
          <Pressable onPress={onReset} className="rounded-lg px-2 py-1">
            <Text className="text-xs font-bold text-rose-500">Xóa lọc</Text>
          </Pressable>
        ) : null}
      </View>

      <View className="mb-3 flex-row items-center rounded-xl border border-slate-200 bg-slate-50 px-3">
        <Ionicons name="search-outline" size={17} color="#94a3b8" />
        <TextInput
          value={searchInput}
          onChangeText={onChangeSearchInput}
          onSubmitEditing={onApplySearch}
          returnKeyType="search"
          maxLength={100}
          placeholder="Tìm theo tiêu đề hoặc mô tả"
          placeholderTextColor="#94a3b8"
          className="min-w-0 flex-1 px-2 py-3 text-sm text-slate-800"
        />
        <Pressable
          onPress={onApplySearch}
          disabled={loading}
          className={`rounded-lg px-3 py-2 ${isAdminArea ? "bg-red-600" : "bg-slate-800"}`}
          style={loading ? { opacity: 0.5 } : undefined}
        >
          <Text className="text-xs font-bold text-white">Tìm</Text>
        </Pressable>
      </View>

      <Text className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Trạng thái
      </Text>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
        <View className="flex-row py-0.5" style={{ gap: 7 }}>
          <FilterChip
            active={status === null}
            adminTheme={isAdminArea}
            label="Tất cả"
            onPress={() => onChangeStatus(null)}
          />
          {STATUS_OPTIONS.map((value) => (
            <FilterChip
              key={value}
              active={status === value}
              adminTheme={isAdminArea}
              label={STATUS_MAP[value].label}
              onPress={() => onChangeStatus(value)}
            />
          ))}
        </View>
      </ScrollView>

      <Text className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
        Mức ưu tiên
      </Text>
      <View className="flex-row flex-wrap" style={{ gap: 7 }}>
        <FilterChip
          active={priority === null}
          adminTheme={isAdminArea}
          label="Tất cả"
          onPress={() => onChangePriority(null)}
        />
        {PRIORITY_OPTIONS.map((value) => (
          <FilterChip
            key={value}
            active={priority === value}
            adminTheme={isAdminArea}
            label={PRIORITY_MAP[value].label.replace("Ưu tiên ", "")}
            onPress={() => onChangePriority(value)}
          />
        ))}
      </View>

      <View className="mt-4 flex-row items-center justify-between border-t border-slate-100 pt-3">
        <Text className="text-xs font-semibold text-slate-500">
          {loading ? "Đang tải..." : `${total} công việc`}
        </Text>
        <Text className="text-xs font-semibold text-slate-400">
          Trang {Math.min(page, safeTotalPages)}/{safeTotalPages}
        </Text>
      </View>

      {totalPages > 1 ? (
        <View className="mt-3 flex-row" style={{ gap: 8 }}>
          <Pressable
            onPress={() => onChangePage(Math.max(1, page - 1))}
            disabled={loading || page <= 1}
            className="flex-1 items-center rounded-xl border border-slate-200 bg-white py-2.5"
            style={loading || page <= 1 ? { opacity: 0.4 } : undefined}
          >
            <Text className="text-xs font-bold text-slate-600">Trang trước</Text>
          </Pressable>
          <Pressable
            onPress={() => onChangePage(Math.min(totalPages, page + 1))}
            disabled={loading || page >= totalPages}
            className={`flex-1 items-center rounded-xl py-2.5 ${isAdminArea ? "bg-red-600" : "bg-slate-800"}`}
            style={loading || page >= totalPages ? { opacity: 0.4 } : undefined}
          >
            <Text className="text-xs font-bold text-white">Trang sau</Text>
          </Pressable>
        </View>
      ) : null}
    </View>
  );
}

function FilterChip({
  active,
  adminTheme,
  label,
  onPress,
}: {
  active: boolean;
  adminTheme: boolean;
  label: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      className={`rounded-full border px-3 py-2 ${
        active
          ? adminTheme
            ? "border-red-500 bg-red-50"
            : "border-indigo-500 bg-indigo-50"
          : "border-slate-200 bg-white"
      }`}
    >
      <Text
        className={`text-xs font-bold ${
          active
            ? adminTheme
              ? "text-red-600"
              : "text-indigo-600"
            : "text-slate-500"
        }`}
      >
        {label}
      </Text>
    </Pressable>
  );
}
