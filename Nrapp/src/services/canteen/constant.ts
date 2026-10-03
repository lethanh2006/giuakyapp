export type OrderStatus = "CREATED" | "COMPLETED" | "CANCELLED";

export type OrderPaymentStatus = "PENDING" | "PAID";
/** Phương thức được phép tạo đơn ở giai đoạn hiện tại. */
export type CreateOrderPaymentMethod = "CASH";
export type OrderPaymentMethod = CreateOrderPaymentMethod;

export interface MenuItemOption {
  name: string;
  price: number;
}

export interface MenuItem {
  _id: string;
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable: boolean;
  options?: MenuItemOption[];
}

export interface MenuCategory {
  _id: string;
  name: string;
  description?: string;
  displayOrder?: number;
  isActive?: boolean;
}

export interface MenuGroup {
  category: MenuCategory;
  items: MenuItem[];
}

export interface AdminMenuCatalog {
  categories: MenuCategory[];
  items: MenuItem[];
}

export interface CreateMenuItemInput {
  categoryId: string;
  name: string;
  description?: string;
  price: number;
  imageUrl?: string;
  isAvailable?: boolean;
  options?: MenuItemOption[];
}

export type UpdateMenuItemInput = Partial<CreateMenuItemInput>;

export interface CreateOrderItemInput {
  menuItemId: string;
  quantity: number;
  selectedOptions?: { name: string }[];
  note?: string;
}

export interface CreateOrderInput {
  tableId: string;
  items: CreateOrderItemInput[];
  paymentMethod: CreateOrderPaymentMethod;
}

export interface OrderSelectedOption {
  name: string;
  price: number;
}

export interface OrderItem {
  menuItemId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  selectedOptions?: OrderSelectedOption[];
  note?: string;
}

export interface CanteenOrder {
  _id: string;
  orderNumber: string;
  userId: string;
  userRole: string;
  tableId?: string | null;
  items: OrderItem[];
  totalAmount: number;
  finalAmount: number;
  status: OrderStatus;
  paymentStatus: OrderPaymentStatus;
  paymentMethod: OrderPaymentMethod;
  paidAt?: string;
  cancelledAt?: string;
  cancelledBy?: string;
  cancellationReason?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrderListQuery {
  status?: OrderStatus;
  paymentStatus?: OrderPaymentStatus;
  userId?: string;
  tableId?: string;
  from?: string;
  to?: string;
  page?: number;
  limit?: number;
}

export interface OrderPagination {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface PaginatedOrders {
  orders: CanteenOrder[];
  pagination: OrderPagination;
}

export const ORDER_STATUSES: OrderStatus[] = [
  "CREATED",
  "COMPLETED",
  "CANCELLED",
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  CREATED: "Mới tạo",
  COMPLETED: "Hoàn thành",
  CANCELLED: "Đã hủy",
};

export const ORDER_PAYMENT_STATUS_LABELS: Record<OrderPaymentStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
};

export const ORDER_PAYMENT_METHOD_LABELS: Record<OrderPaymentMethod, string> = {
  CASH: "Tiền mặt",
};
