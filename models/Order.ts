// models/Order.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

// ==============================
// Types
// ==============================
export interface OrderItem {
  name: string;
  qty: number;
  price: number;
  category: string; // ✅ Added category for proper grouping
}

export interface OrderDoc extends Document {
  orderNumber: number;
  categories: string[];
  items: OrderItem[];
  totalAmount: number;
  status: "PENDING" | "CONFIRMED";
  createdAt: Date;
  updatedAt: Date;
}

// ==============================
// Schemas
// ==============================
const OrderItemSchema = new Schema<OrderItem>({
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true }, // ✅ Added to schema
});

const OrderSchema = new Schema<OrderDoc>(
  {
    orderNumber: { type: Number, required: true, unique: true },
    categories: { type: [String], required: true },
    items: { type: [OrderItemSchema], required: true },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED"],
      default: "PENDING",
    },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

// ==============================
// Model
// ==============================
export const OrderModel =
  models.Order || model<OrderDoc>("Order", OrderSchema);
