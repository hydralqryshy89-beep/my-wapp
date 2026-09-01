import { z } from "zod";
import { FIELD_TYPES, RELATION_TYPES } from "@/lib/saas/data-constants";

export const dataModelNameSchema = z.string().trim().min(2, "Name must be at least 2 characters.").max(80);
export const dataModelDescriptionSchema = z.string().trim().max(500).optional().nullable();

export const dataModelCreateSchema = z.object({
  name: dataModelNameSchema,
  description: dataModelDescriptionSchema,
  icon: z.string().trim().max(16).optional().nullable(),
});

export const dataModelUpdateSchema = dataModelCreateSchema;

export const dataFieldNameSchema = z.string().trim().min(1, "Field name is required.").max(80);

export const dataFieldCreateSchema = z.object({
  name: dataFieldNameSchema,
  type: z.enum(FIELD_TYPES),
  required: z.boolean().optional(),
  unique: z.boolean().optional(),
  defaultValue: z.union([z.string(), z.number(), z.boolean(), z.null()]).optional().nullable(),
  options: z.array(z.string().trim().min(1)).max(50).optional().nullable(),
  validation: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional().nullable(),
  description: z.string().trim().max(500).optional().nullable(),
});

export const dataFieldUpdateSchema = dataFieldCreateSchema;

export const dataRelationCreateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  fromModelId: z.string().min(1),
  fromFieldId: z.string().min(1, "Choose a field on this model."),
  toModelId: z.string().min(1, "Choose a related model."),
  toFieldId: z.string().min(1, "Choose a field on the related model."),
  type: z.enum(RELATION_TYPES),
});

export const dataRelationUpdateSchema = z.object({
  name: z.string().trim().min(2, "Name must be at least 2 characters.").max(80),
  type: z.enum(RELATION_TYPES),
});
