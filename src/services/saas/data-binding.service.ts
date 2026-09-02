import { prisma } from "@/lib/prisma";
import { ValidationError } from "@/lib/saas/errors";
import { getComponentDefinition, isComponentType } from "@/lib/saas/page-builder/component-registry";
import { normalizeBindingValue, type BindingCapability } from "@/lib/saas/page-builder/binding-schema";

/**
 * The only place a Dynamic binding's `modelId`/`fieldKey` are checked
 * against the database before being saved — server-side, on every
 * create/update/duplicate/restore, never trusting the shape alone (a
 * well-formed BindingDefinition can still point at another project's
 * model). An incomplete binding (`modelId`/`fieldKey` still empty, e.g.
 * right after switching a prop to Dynamic mode) is always allowed to
 * save — there's nothing to validate yet.
 */
export async function validateNodePropsBindings(projectId: string, componentType: string, props: Record<string, unknown>): Promise<void> {
  if (!isComponentType(componentType)) return;
  const definition = getComponentDefinition(componentType);
  const bindableFields = definition.propertyFields.filter((f) => f.binding);
  if (bindableFields.length === 0) return;

  const entries = bindableFields
    .map((field) => ({ field, binding: normalizeBindingValue(props[field.key]) }))
    .filter((entry) => entry.binding.mode === "binding" && entry.binding.modelId && entry.binding.fieldKey);
  if (entries.length === 0) return;

  const modelIds = Array.from(
    new Set(entries.map((e) => (e.binding as { modelId: string }).modelId))
  );
  const models = await prisma.saasDataModel.findMany({
    where: { id: { in: modelIds }, projectId },
    include: { fields: true },
  });
  const modelById = new Map(models.map((m) => [m.id, m]));

  for (const { field, binding } of entries) {
    if (binding.mode !== "binding") continue;
    const model = modelById.get(binding.modelId);
    if (!model) {
      throw new ValidationError(`"${field.label}" is bound to a data model that doesn't belong to this project.`);
    }
    const dataField = model.fields.find((f) => f.key === binding.fieldKey);
    if (!dataField) {
      throw new ValidationError(`"${field.label}" is bound to a field that doesn't exist on "${model.name}".`);
    }
    const capability = field.binding as BindingCapability;
    if (!(capability.compatibleFieldTypes as readonly string[]).includes(dataField.type)) {
      throw new ValidationError(`"${dataField.name}" (${dataField.type}) isn't compatible with "${field.label}".`);
    }
  }
}
