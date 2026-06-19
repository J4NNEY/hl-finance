import { z } from "zod";

export const transactionLineSchema = z.object({
  product_id: z.string().uuid("Produk wajib dipilih"),
  quantity: z.number().int().min(1, "Quantity minimal 1"),
});

export const transactionSchema = z.object({
  nomor_bon: z
    .string()
    .min(1, "Nomor bon wajib diisi")
    .transform((val) => val.toUpperCase()),
  tanggal: z.string().min(1, "Tanggal wajib diisi"),
  customer_id: z.string().uuid("Pelanggan wajib dipilih"),
  ongkir: z.number().min(0, "Ongkir minimal 0").default(0),
  deskripsi: z.string().optional().default(""),
  is_bonus: z.boolean().default(false),
  lines: z
    .array(transactionLineSchema)
    .min(1, "Minimal 1 produk dalam bon"),
});

export const transactionUpdateSchema = transactionSchema.extend({
  id: z.string().uuid(),
});

export const settleSchema = z.object({
  tanggal_lunas: z.string().min(1, "Tanggal pelunasan wajib diisi"),
});

export type TransactionInput = z.infer<typeof transactionSchema>;
export type TransactionUpdateInput = z.infer<typeof transactionUpdateSchema>;
export type TransactionLineInput = z.infer<typeof transactionLineSchema>;
export type SettleInput = z.infer<typeof settleSchema>;
