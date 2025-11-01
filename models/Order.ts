// models/Order.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

// ==============================
// Types
// ==============================
export type OrderStatus = "PENDING" | "CONFIRMED" | "DELIVERED";

export interface OrderItem {
  name: string;
  qty: number;
  price: number;           // price PER UNIT (already includes dressing add-on if any)
  category: string;        // used for grouping in Sheets
  dressings?: string[];    // optional: e.g., ["Yogurt","Chipotle"]
}

export interface OrderDoc extends Document {
  orderNumber: number;
  categories: string[];
  items: OrderItem[];
  totalAmount: number;     // grand total for the order
  status: OrderStatus;
  deliveredAt?: Date;      // set when chef marks as delivered/done
  createdAt: Date;
  updatedAt: Date;
}

// ==============================
// Schemas
// ==============================
const OrderItemSchema = new Schema<OrderItem>({
  name:       { type: String, required: true },
  qty:        { type: Number, required: true },
  price:      { type: Number, required: true },
  category:   { type: String, required: true },
  dressings:  { type: [String], default: [] }, // ⬅️ keep optional but persisted
});

const OrderSchema = new Schema<OrderDoc>(
  {
    orderNumber: { type: Number, required: true, unique: true },
    categories:  { type: [String], required: true },
    items:       { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "DELIVERED"], // ⬅️ added DELIVERED
      default: "PENDING",
    },
    deliveredAt: { type: Date }, // ⬅️ timestamp when handed to customer
    // Do NOT define createdAt manually; let timestamps handle both fields
  },
  { timestamps: true } // adds createdAt & updatedAt
);

// ==============================
// Model
// ==============================
export const OrderModel =
  models.Order || model<OrderDoc>("Order", OrderSchema);

// Optional: helpful type guard for runtime use (if you need it elsewhere)
export function isDelivered(order: Pick<OrderDoc, "status">): boolean {
  return order.status === "DELIVERED";
}
