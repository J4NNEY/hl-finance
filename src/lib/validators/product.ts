import { z } from "zod";

export const productSchema = z.object({
  nama: z.string().min(1, "Nama produk wajib diisi"),
  tipe: z.enum(["LM", "BR"], {
    message: "Tipe produk wajib dipilih",
  }),
  harga_modal: z.number().min(0, "Harga modal minimal 0"),
  harga_base: z.number().min(0, "Harga base minimal 0"),
});

export const productUpdateSchema = productSchema.extend({
  id: z.string().uuid(),
});

export type ProductInput = z.infer<typeof productSchema>;
export type ProductUpdateInput = z.infer<typeof productUpdateSchema>;
