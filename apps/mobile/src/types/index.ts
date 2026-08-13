// ============================================================
// Strict TypeScript Interfaces for Cashmitra DMS Mobile App
// ============================================================

// --- Auth ---
export interface DmsUser {
  user_id: number;
  firm_name: string;
  owner_name: string;
  phone_number: string;
  role: 'distributor' | 'admin';
}

// --- Products & Catalog ---
export interface Variant {
  variant_id: number;
  pack_size: string;
  mrp: number;
  price: number;
  stock_qty: number;
  uom: string;
  hsn_code: string;
}

export interface Product {
  product_id: number;
  product_name: string;
  category: string;
  description?: string;
  variants: Variant[];
}

// --- Orders & Invoices ---
export type OrderStatus = 'pending' | 'processing' | 'executed' | 'cancelled';

export interface OrderItem {
  order_item_id: number;
  product_name: string;
  pack_size: string;
  ordered_qty: number;
  executed_qty: number;
  price_at_order: number;
  uom: string;
}

export interface Order {
  order_id: number;
  invoice_number?: string;
  status: OrderStatus;
  created_at: string;
  updated_at: string;
  subtotal: number;
  cgst_amount: number;
  sgst_amount: number;
  grand_total: number;
  extra_discount?: number;
  wallet_used?: number;
  items: OrderItem[];
}

// --- Ledger & Payments ---
export interface Payment {
  payment_id: number;
  payment_date: string;
  payment_mode: string;
  amount: number;
  reference_no?: string;
  invoice_number: string;
}

export interface UnpaidInvoice {
  invoice_id: number;
  order_id: number;
  invoice_number: string;
  created_at: string;
  grand_total: number;
  paid_amount: number;
}

export interface LedgerData {
  summary: {
    total_billed: number;
    total_paid: number;
  };
  unpaid_invoices: UnpaidInvoice[];
  recent_payments: Payment[];
}

// --- Claims & Credit Notes ---
export interface CreditNote {
  credit_note_id: number;
  credit_note_number: string;
  invoice_number: string;
  created_at: string;
  amount: number;
  is_paid_out: boolean;
  payment_mode?: string;
}

// --- Reports ---
export interface PurchaseDataPoint {
  date: string;
  amount_spent: number;
}

export interface ProductDataPoint {
  product_name: string;
  total_bought: number;
}

// --- Distributor Profile ---
export interface DistributorProfile {
  distributor_id: number;
  firm_name: string;
  owner_name: string;
  phone_number: string;
  address: string;
  gst_number?: string;
  fssai_number?: string;
  has_pan: boolean;
  has_aadhar: boolean;
  has_photo: boolean;
}
