// models/Order.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

// ==============================
// Types
// ==============================
export type OrderStatus = "PENDING" | "CONFIRMED" | "DELIVERED";

export interface OrderItem {
  name: string;
  qty: number;
  price: number;        // unit price (already includes add-ons if any)
  category: string;     // used for grouping in Sheets / UI
  dressings?: string[]; // e.g., ["Yogurt","Chipotle"]
}

export interface OrderDoc extends Document {
  orderNumber: number;
  categories: string[];
  items: OrderItem[];
  totalAmount: number;   // grand total for the order
  status: OrderStatus;
  deliveredAt?: Date;    // set when marked as delivered
  createdAt: Date;
  updatedAt: Date;
}

// ==============================
// Schemas
// ==============================
const OrderItemSchema = new Schema<OrderItem>(
  {
    name:      { type: String, required: true },
    qty:       { type: Number, required: true },
    price:     { type: Number, required: true },
    category:  { type: String, required: true },
    dressings: { type: [String], default: [] },
  },
  { _id: true } // keep item-level _id (matches your stored documents)
);

const OrderSchema = new Schema<OrderDoc>(
  {
    orderNumber: { type: Number, required: true, unique: true },
    categories:  { type: [String], required: true, default: [] },
    items:       { type: [OrderItemSchema], required: true, default: [] },
    totalAmount: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "CONFIRMED", "DELIVERED"],
      default: "PENDING",
      required: true,
    },
    deliveredAt: { type: Date },
  },
  {
    timestamps: true,        // adds createdAt & updatedAt
    minimize: false,         // keep empty arrays/objects if set
  }
);

// Helpful index (unique already declared on the path; this is explicit)
OrderSchema.index({ orderNumber: 1 }, { unique: true });

// Optional: toJSON/toObject transform to stringify _id if you like
OrderSchema.set("toJSON", {
  virtuals: true,
  versionKey: true,
  transform: (_doc, ret) => {
    if (ret._id) ret._id = ret._id.toString();
    return ret;
  },
});
OrderSchema.set("toObject", {
  virtuals: true,
  versionKey: true,
  transform: (_doc, ret) => {
    if (ret._id) ret._id = ret._id.toString();
    return ret;
  },
});

// ==============================
// Model
// ==============================
export const OrderModel: mongoose.Model<OrderDoc> =
  (models.Order as mongoose.Model<OrderDoc>) || model<OrderDoc>("Order", OrderSchema);

// Optional: tiny helper you already had as an example
export function isDelivered(order: Pick<OrderDoc, "status">): boolean {
  return order.status === "DELIVERED";
}
