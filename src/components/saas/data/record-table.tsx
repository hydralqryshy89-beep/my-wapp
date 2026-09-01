import Link from "next/link";
import { FieldValueDisplay } from "@/components/saas/data/field-value-display";
import { Table, Thead, Tbody, Tr, Th, Td } from "@/components/saas/ui/table";
import { ConfirmSubmitButton } from "@/components/saas/ui/confirm-submit-button";
import { deleteDataRecordAction } from "@/actions/saas/data-record.actions";

interface FieldLike {
  key: string;
  name: string;
  type: string;
  settings: unknown;
}

interface RecordRow {
  id: string;
  data: Record<string, unknown>;
  createdAt: Date;
}

/** Columns come entirely from the model's fields/position — no hardcoded field names (section 52). */
export function RecordTable({
  projectId,
  modelId,
  fields,
  records,
  canDelete,
}: {
  projectId: string;
  modelId: string;
  fields: FieldLike[];
  records: RecordRow[];
  canDelete: boolean;
}) {
  return (
    <Table>
      <Thead>
        <Tr>
          {fields.map((f) => (
            <Th key={f.key}>{f.name}</Th>
          ))}
          <Th>Created</Th>
          <Th />
        </Tr>
      </Thead>
      <Tbody>
        {records.map((record) => (
          <Tr key={record.id}>
            {fields.map((f) => (
              <Td key={f.key}>
                <FieldValueDisplay field={f} value={record.data[f.key]} />
              </Td>
            ))}
            <Td className="text-slate-400">{record.createdAt.toLocaleDateString()}</Td>
            <Td className="text-right">
              <div className="flex items-center justify-end gap-1">
                <Link
                  href={`/saas/projects/${projectId}/data/${modelId}/records/${record.id}`}
                  className="rounded px-2 py-1 text-xs font-semibold text-indigo-600 hover:bg-indigo-50"
                >
                  View
                </Link>
                {canDelete && (
                  <ConfirmSubmitButton
                    action={deleteDataRecordAction.bind(null, projectId, modelId, record.id)}
                    confirmText="Delete this record? This can't be undone."
                    label="Delete"
                    pendingLabel="Deleting..."
                  />
                )}
              </div>
            </Td>
          </Tr>
        ))}
      </Tbody>
    </Table>
  );
}
