import { z } from "zod";

export const customerSchema = z.object({
  nama: z.string().min(1, "Nama pelanggan wajib diisi"),
  diskon_lm: z
    .array(z.number().min(0, "Diskon minimal 0").max(100, "Diskon maksimal 100"))
    .default([]),
  diskon_br: z
    .array(z.number().min(0, "Diskon minimal 0").max(100, "Diskon maksimal 100"))
    .default([]),
  bonus_threshold: z
    .number()
    .min(1, "Bonus threshold harus lebih dari 0"),
});

export const customerUpdateSchema = customerSchema.extend({
  id: z.string().uuid(),
});

export type CustomerInput = z.infer<typeof customerSchema>;
export type CustomerUpdateInput = z.infer<typeof customerUpdateSchema>;
