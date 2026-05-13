import { pgTable, uuid, text, boolean, timestamp, jsonb } from 'drizzle-orm/pg-core';

export const adminUsers = pgTable('admin_users', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').unique().notNull(),
  passwordHash: text('password_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const siteConfig = pgTable('site_config', {
  id: uuid('id').primaryKey().defaultRandom(),
  data: jsonb('data').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const members = pgTable('members', {
  id: uuid('id').primaryKey().defaultRandom(),
  email: text('email').notNull(),
  name: text('name').notNull(),
  tierId: text('tier_id').notNull(),
  paymentStatus: text('payment_status').default('inactive'),
  payerId: text('payer_id'),
  orderId: text('order_id'),
  lastTransactionId: text('last_transaction_id'),
  hasPaymentConsent: boolean('has_payment_consent').default(false),
  nextChargeAt: timestamp('next_charge_at', { withTimezone: true }),
  selectedDate: text('selected_date'),
  rdpResponse: jsonb('rdp_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow(),
});

export const transactions = pgTable('transactions', {
  id: uuid('id').primaryKey().defaultRandom(),
  memberId: text('member_id').notNull(),
  memberName: text('member_name').notNull(),
  amount: text('amount').notNull(),
  status: text('status').notNull(),
  tierName: text('tier_name').notNull(),
  type: text('type').notNull(),
  transactionId: text('transaction_id'),
  rdpResponse: jsonb('rdp_response'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow(),
});

export const webhookLogs = pgTable('webhook_logs', {
  id: uuid('id').primaryKey().defaultRandom(),
  payload: jsonb('payload').notNull(),
  timestamp: timestamp('timestamp', { withTimezone: true }).defaultNow(),
});
