"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";

import {
  Badge,
  Button,
  Checkbox,
  ConfirmModal,
  Input,
  Modal,
  Pagination,
  Select,
  SortableTableHeaderCell,
  Table,
  TableBodySection,
  TableHead,
  TableHeaderCell,
  TableSearch,
  Textarea,
} from "@/components/ui";
import { api } from "@/lib/api/client";
import { formFieldsToJson } from "@/lib/api/form-data";
import { resolveFieldPlaceholder } from "@/lib/field-placeholders";
import type { SortDir } from "@/lib/pagination";

export type FieldType =
  | "text"
  | "email"
  | "password"
  | "number"
  | "textarea"
  | "checkbox"
  | "select";

export interface FieldOption {
  value: string;
  label: string;
}

export interface FieldDef {
  name: string;
  label: string;
  type?: FieldType;
  required?: boolean;
  options?: FieldOption[];
  placeholder?: string;
  step?: string;
  help?: string;
  createOnly?: boolean;
  prefixIcon?: string;
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Row = Record<string, any>;

export type ColumnVariant =
  | "text"
  | "link"
  | "badge"
  | "boolean"
  | "truncate"
  | "lookup";

export interface ColumnDef {
  key: string;
  label: string;
  variant?: ColumnVariant;
  hrefTemplate?: string;
  lookup?: Record<string, string>;
  emptyText?: string;
  trueText?: string;
  sortable?: boolean;
  sortKey?: string;
}

export interface LinkAction {
  label: string;
  hrefTemplate: string;
}

const defaultFieldIcons: Partial<Record<FieldType, string>> = {
  email: "mdi:email-outline",
  password: "mdi:lock-outline",
  number: "mdi:numeric",
};

const buildHref = (template: string, row: Row): string =>
  template.replace(/:([a-zA-Z_]+)/g, (_, token: string) =>
    encodeURIComponent(String(row[token] ?? "")),
  );

const formatCell = (value: unknown): ReactNode => {
  if (value === null || value === undefined || value === "") return "-";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const CellContent = ({ col, row }: { col: ColumnDef; row: Row }): ReactNode => {
  const raw = row[col.key];
  switch (col.variant) {
    case "link":
      return (
        <Link
          href={buildHref(col.hrefTemplate ?? "", row)}
          className="font-medium text-emerald-600 hover:text-emerald-700 cursor-pointer"
        >
          {formatCell(raw)}
        </Link>
      );
    case "badge":
      return raw ? <Badge value={String(raw)} /> : (col.emptyText ?? "-");
    case "boolean":
      return raw ? (col.trueText ?? "Yes") : (col.emptyText ?? "-");
    case "truncate":
      return (
        <span className="line-clamp-2 block max-w-md text-slate-600">
          {formatCell(raw)}
        </span>
      );
    case "lookup":
      if (raw === null || raw === undefined || raw === "") {
        return col.emptyText ?? "-";
      }
      return col.lookup?.[String(raw)] ?? String(raw);
    default:
      return formatCell(raw);
  }
};

interface EntityManagerProps {
  apiBase: string;
  columns: ColumnDef[];
  rows: Row[];
  fields: FieldDef[];
  canUpdate?: boolean;
  canDelete?: boolean;
  idKey?: string;
  createLabel?: string;
  emptyMessage?: string;
  linkActions?: LinkAction[];
  hiddenFields?: Record<string, string>;
  onMutate?: () => void | Promise<void>;
  refreshing?: boolean;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    onPageChange: (page: number) => void;
    onLimitChange?: (limit: number) => void;
  };
  sort?: {
    column: string | null;
    dir: SortDir;
    onChange: (column: string) => void;
  };
  search?: {
    value: string;
    onChange: (value: string) => void;
    placeholder?: string;
  };
}

export const EntityManager = ({
  apiBase,
  columns,
  rows,
  fields,
  canUpdate = true,
  canDelete = true,
  idKey = "id",
  createLabel = "Add new",
  emptyMessage = "No records yet.",
  linkActions,
  hiddenFields,
  onMutate,
  refreshing = false,
  pagination,
  sort,
  search,
}: EntityManagerProps) => {
  const [creating, setCreating] = useState(false);
  const [editingRow, setEditingRow] = useState<Row | null>(null);
  const columnCount =
    columns.length + (canUpdate || canDelete || linkActions?.length ? 1 : 0);

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        {search ? (
          <TableSearch
            value={search.value}
            onChange={search.onChange}
            placeholder={search.placeholder ?? "Search..."}
            disabled={refreshing}
          />
        ) : (
          <div />
        )}
        <Button
          variant="primary"
          icon="mdi:plus"
          onClick={() => setCreating(true)}
        >
          {createLabel}
        </Button>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <TableBodySection loading={refreshing}>
          <Table>
            <TableHead>
              {columns.map((col) => {
                const sortKey = col.sortKey ?? col.key;
                const sortable = col.sortable !== false && Boolean(sort);

                if (sortable && sort) {
                  return (
                    <SortableTableHeaderCell
                      key={col.key}
                      sortKey={sortKey}
                      activeSort={sort.column}
                      activeDir={sort.dir}
                      onSort={sort.onChange}
                    >
                      {col.label}
                    </SortableTableHeaderCell>
                  );
                }

                return (
                  <TableHeaderCell key={col.key}>{col.label}</TableHeaderCell>
                );
              })}
              {(canUpdate || canDelete || linkActions?.length) && (
                <TableHeaderCell className="text-right">Actions</TableHeaderCell>
              )}
            </TableHead>
            <tbody>
              {rows.length === 0 ? (
                <tr>
                  <td
                    colSpan={columnCount}
                    className="px-6 py-12 text-center text-base text-slate-400"
                  >
                    {emptyMessage}
                  </td>
                </tr>
              ) : (
                rows.map((row) => (
                  <tr
                    key={String(row[idKey])}
                    className="border-b border-slate-100 last:border-0 hover:bg-slate-50"
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3 text-slate-700">
                        <CellContent col={col} row={row} />
                      </td>
                    ))}
                    {(canUpdate || canDelete || linkActions?.length) && (
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {linkActions?.map((action) => (
                            <Link
                              key={action.label}
                              href={buildHref(action.hrefTemplate, row)}
                              className="cursor-pointer rounded-md px-2 py-1 text-sm font-medium text-slate-500 hover:bg-slate-200 hover:text-slate-800"
                            >
                              {action.label}
                            </Link>
                          ))}
                          {canUpdate && (
                            <Button
                              variant="ghost"
                              size="sm"
                              icon="mdi:pencil-outline"
                              title="Edit"
                              aria-label="Edit"
                              className="p-1.5!"
                              onClick={() => setEditingRow(row)}
                            />
                          )}
                          {canDelete && (
                            <DeleteButton
                              apiBase={apiBase}
                              id={String(row[idKey])}
                              idKey={idKey}
                              deleted={Boolean(row.deleted_at ?? row.revoked_at)}
                              hiddenValues={hiddenFields}
                              onSuccess={onMutate}
                            />
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </Table>
        </TableBodySection>
        {pagination && pagination.total > 0 ? (
          <Pagination
            page={pagination.page}
            limit={pagination.limit}
            total={pagination.total}
            totalPages={pagination.totalPages}
            onPageChange={pagination.onPageChange}
            onLimitChange={pagination.onLimitChange}
            busy={refreshing}
          />
        ) : null}
      </div>

      <Modal
        open={creating}
        title={createLabel}
        onClose={() => setCreating(false)}
      >
        <ResourceForm
          apiBase={apiBase}
          fields={fields}
          submitLabel="Create"
          hiddenValues={hiddenFields}
          mode="create"
          onSuccess={async () => {
            setCreating(false);
            await onMutate?.();
          }}
        />
      </Modal>

      <Modal
        open={Boolean(editingRow && canUpdate)}
        title="Edit"
        onClose={() => setEditingRow(null)}
      >
        {editingRow && canUpdate ? (
          <ResourceForm
            apiBase={apiBase}
            fields={fields}
            submitLabel="Save changes"
            hiddenValues={{ ...hiddenFields, [idKey]: String(editingRow[idKey]) }}
            initialValues={editingRow}
            mode="edit"
            onSuccess={async () => {
              setEditingRow(null);
              await onMutate?.();
            }}
          />
        ) : null}
      </Modal>
    </div>
  );
};

const ResourceForm = ({
  apiBase,
  fields,
  submitLabel,
  hiddenValues,
  initialValues,
  mode = "create",
  onSuccess,
}: {
  apiBase: string;
  fields: FieldDef[];
  submitLabel: string;
  hiddenValues?: Record<string, string>;
  initialValues?: Record<string, string | number | boolean | null>;
  mode?: "create" | "edit";
  onSuccess?: () => void | Promise<void>;
}) => {
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);

  const visibleFields = fields.filter(
    (field) => !(mode === "edit" && field.createOnly),
  );

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setPending(true);
    setFieldErrors({});

    const formData = new FormData(event.currentTarget);
    const nextFieldErrors: Record<string, string> = {};

    for (const field of visibleFields) {
      if (!field.required || field.type === "checkbox") continue;
      const value = formData.get(field.name);
      if (value === null || String(value).trim() === "") {
        nextFieldErrors[field.name] = `${field.label} is required.`;
      }
    }

    if (Object.keys(nextFieldErrors).length > 0) {
      setFieldErrors(nextFieldErrors);
      setPending(false);
      return;
    }

    const body = {
      ...hiddenValues,
      ...formFieldsToJson(formData, fields, mode),
    };

    try {
      if (mode === "create") {
        await api.post(apiBase, body);
      } else {
        await api.patch(apiBase, body);
      }
      await onSuccess?.();
    } catch {
      // API client shows a toast for backend errors.
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      onInput={() => setFieldErrors({})}
      className="flex flex-col gap-4"
      noValidate
    >
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {visibleFields.map((field) => (
          <Field
            key={field.name}
            field={field}
            initialValue={initialValues?.[field.name]}
            error={fieldErrors[field.name]}
          />
        ))}
      </div>

      <div>
        <Button type="submit" variant="secondary" loading={pending}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
};

const Field = ({
  field,
  initialValue,
  error,
}: {
  field: FieldDef;
  initialValue?: string | number | boolean | null;
  error?: string;
}) => {
  const type = field.type ?? "text";
  const prefixIcon =
    field.prefixIcon ?? defaultFieldIcons[type as FieldType];
  const fullWidth = type === "textarea" ? "md:col-span-2" : "";
  const placeholder = resolveFieldPlaceholder(field);
  const defaultValue =
    initialValue === null || initialValue === undefined
      ? ""
      : String(initialValue);

  if (type === "textarea") {
    return (
      <Textarea
        name={field.name}
        label={field.label}
        required={field.required}
        placeholder={placeholder}
        defaultValue={defaultValue}
        help={field.help}
        error={error}
        rows={3}
        wrapperClassName={fullWidth}
      />
    );
  }

  if (type === "select") {
    return (
      <Select
        name={field.name}
        label={field.label}
        required={field.required}
        defaultValue={defaultValue}
        options={field.options ?? []}
        placeholder={placeholder}
        help={field.help}
        prefixIcon={prefixIcon ?? "mdi:form-select"}
        error={error}
        wrapperClassName={fullWidth}
      />
    );
  }

  if (type === "checkbox") {
    return (
      <Checkbox
        name={field.name}
        label={field.label}
        required={field.required}
        description={field.help}
        defaultChecked={Boolean(initialValue)}
        error={error}
        wrapperClassName={fullWidth}
      />
    );
  }

  return (
    <Input
      name={field.name}
      label={field.label}
      type={type}
      required={field.required}
      placeholder={placeholder}
      step={field.step}
      defaultValue={defaultValue}
      help={field.help}
      error={error}
      prefixIcon={prefixIcon}
      wrapperClassName={fullWidth}
    />
  );
};

const DeleteButton = ({
  apiBase,
  id,
  idKey,
  deleted,
  hiddenValues,
  onSuccess,
}: {
  apiBase: string;
  id: string;
  idKey: string;
  deleted: boolean;
  hiddenValues?: Record<string, string>;
  onSuccess?: () => void | Promise<void>;
}) => {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);

  const handleConfirm = async () => {
    setPending(true);
    try {
      await api.delete(apiBase, {
        ...hiddenValues,
        [idKey]: id,
        restore: deleted,
      });
      setOpen(false);
      await onSuccess?.();
    } catch {
      // API client shows a toast for backend errors.
    } finally {
      setPending(false);
    }
  };

  return (
    <>
      <Button
        type="button"
        variant="ghost"
        size="sm"
        icon={deleted ? "mdi:backup-restore" : "mdi:delete-outline"}
        title={deleted ? "Restore" : "Delete"}
        aria-label={deleted ? "Restore" : "Delete"}
        className={`p-1.5! ${deleted ? "text-emerald-600 hover:bg-emerald-50!" : "text-red-500 hover:bg-red-50!"}`}
        onClick={() => setOpen(true)}
      />

      <ConfirmModal
        open={open}
        onClose={() => setOpen(false)}
        onConfirm={handleConfirm}
        loading={pending}
        tone={deleted ? "primary" : "danger"}
        title={deleted ? "Restore this item?" : "Delete this item?"}
        description={
          deleted
            ? "This will be restored and shown again in the mobile app."
            : "This will be removed from the mobile app. Reps will no longer see it."
        }
        confirmLabel={deleted ? "Restore" : "Delete"}
      />
    </>
  );
};
