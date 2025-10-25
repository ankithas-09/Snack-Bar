// models/Refund.ts
import mongoose, { Schema, model, models, Document } from "mongoose";

export interface RefundItem {
  name: string;
  qty: number;
  price: number;
  category: string;
}

export interface RefundDoc extends Document {
  orderNumber: number;
  refundedItems: RefundItem[];
  refundAmount: number;
  createdAt: Date;
}

const RefundItemSchema = new Schema<RefundItem>({
  name: { type: String, required: true },
  qty: { type: Number, required: true },
  price: { type: Number, required: true },
  category: { type: String, required: true },
});

const RefundSchema = new Schema<RefundDoc>(
  {
    orderNumber: { type: Number, required: true },
    refundedItems: { type: [RefundItemSchema], required: true },
    refundAmount: { type: Number, required: true },
    createdAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

export const RefundModel = models.Refund || model<RefundDoc>("Refund", RefundSchema);
