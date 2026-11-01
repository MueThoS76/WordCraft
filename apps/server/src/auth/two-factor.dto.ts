import { z } from "zod";

export const totpCodeSchema = z.object({
  code: z.string().regex(/^\d{6}$/, "Code muss aus 6 Ziffern bestehen."),
});
