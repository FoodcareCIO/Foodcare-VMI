"use client";

import { useRef, useState, type ReactNode } from "react";

import {
  Button,
  Checkbox,
  ConfirmModal,
  EmptyState,
  Icon,
  LoadingPage,
  Modal,
  formatDateTime,
} from "@/components/ui";
import { api } from "@/lib/api/client";
import { useApiQuery } from "@/lib/api/use-query";
import { notify } from "@/lib/notifications";
import type {
  SiteProductListInfo,
  SiteProductListPreview,
  SiteProductListResult,
  SiteProductListRow,
  SiteProductListUpload,
} from "@/lib/product-import-types";

const TEMPLATE = [
  "Product code,Product name,Minimum stock,Unit",
  'ABC-001,"Example product",2,ctn',
].join("\r\n");

const downloadTemplate = () => {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "foodcare-site-product-list-template.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`;

const displayValue = (value: string | number | null) =>
  value === null || value === "" ? "(empty)" : String(value);

const changeSummary = (result: SiteProductListResult) =>
  `${result.added} added, ${result.updated} updated, ${result.removed} removed.`;

export function SiteProductListStatus({ info }: { info: SiteProductListInfo | null }) {
  if (!info) return null;
  const { site, lastUpload } = info;
  if (!site.product_list_updated_at) {
    return <p className="text-sm text-slate-500">Product list not uploaded yet.</p>;
  }
  // History older than 12 months is purged, so the last entry may be older.
  const upload = lastUpload && lastUpload.version === site.product_list_version ? lastUpload : null;
  return (
    <p className="text-sm text-slate-500">
      List last updated {formatDateTime(site.product_list_updated_at)}
      {upload?.uploaded_by_name ? ` by ${upload.uploaded_by_name}` : ""}
      {upload ? ` — ${upload.file_name}` : ""}
    </p>
  );
}

export function SiteProductListActions({
  siteId,
  siteName,
  onChanged,
}: {
  siteId: string;
  siteName: string;
  onChanged: () => void | Promise<void>;
}) {
  const [dialog, setDialog] = useState<"upload" | "tablet" | "history" | null>(null);
  const close = () => setDialog(null);

  return (
    <>
      <Button variant="outline" icon="mdi:tablet" onClick={() => setDialog("tablet")}>
        Preview tablet view
      </Button>
      <Button variant="outline" icon="mdi:history" onClick={() => setDialog("history")}>
        Upload history
      </Button>
      <Button variant="secondary" icon="mdi:file-upload-outline" onClick={() => setDialog("upload")}>
        Upload site product list
      </Button>
      {dialog === "upload" ? (
        <UploadSiteListModal siteId={siteId} siteName={siteName} onClose={close} onChanged={onChanged} />
      ) : null}
      {dialog === "tablet" ? <TabletViewModal siteId={siteId} siteName={siteName} onClose={close} /> : null}
      {dialog === "history" ? <UploadHistoryModal siteId={siteId} onClose={close} onChanged={onChanged} /> : null}
    </>
  );
}

function UploadSiteListModal({
  siteId,
  siteName,
  onClose,
  onChanged,
}: {
  siteId: string;
  siteName: string;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<SiteProductListPreview | null>(null);
  const [confirmSite, setConfirmSite] = useState(false);
  const [confirmRemoval, setConfirmRemoval] = useState(false);
  const [busy, setBusy] = useState(false);

  const send = <T,>(mode: "preview" | "replace", fields: Record<string, string> = {}) => {
    const formData = new FormData();
    formData.set("file", file as File);
    formData.set("mode", mode);
    for (const [key, value] of Object.entries(fields)) formData.set(key, value);
    return api.postForm<T>(`/api/sites/${siteId}/product-list`, formData);
  };

  const close = () => {
    if (!busy) onClose();
  };

  const selectFile = (nextFile?: File) => {
    setFile(nextFile ?? null);
    setPreview(null);
  };

  const previewFile = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setPreview(await send<SiteProductListPreview>("preview"));
      setConfirmSite(false);
      setConfirmRemoval(false);
    } catch {
      // The shared API client displays the backend error.
    } finally {
      setBusy(false);
    }
  };

  const replace = async () => {
    if (!file || !preview) return;
    setBusy(true);
    try {
      const result = await send<SiteProductListResult>("replace", {
        expectedVersion: String(preview.expectedVersion),
        confirmSiteMismatch: String(confirmSite),
        confirmLargeRemoval: String(confirmRemoval),
      });
      if (result.status === "unchanged") {
        notify.info("No changes — this site's list already matches the file.");
      } else {
        notify.success(`Site list replaced: ${changeSummary(result)}`);
      }
      await onChanged();
      onClose();
    } catch {
      // The error is shown as a toast; the list may have changed, so preview again.
      setPreview(null);
    } finally {
      setBusy(false);
    }
  };

  const blocked =
    !preview?.canReplace ||
    preview.noChanges ||
    (preview.siteNameMismatch && !confirmSite) ||
    (preview.largeRemoval && !confirmRemoval);

  return (
    <Modal title="Upload site product list" size="lg" onClose={close}>
      <div className="space-y-5">
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
          <p>
            The file replaces the whole product list of <strong>{siteName}</strong>. Products in the file are added or
            updated. Products not in the file are removed from this site only; other sites and old orders are not changed.
          </p>
          <p className="mt-2 text-sm">
            Required columns: Product code, Product name, Minimum stock. Optional: Unit, Pack size, Pack unit.
            Product names and units are shared by product code across all sites.
          </p>
          <Button variant="ghost" size="sm" icon="mdi:download" className="mt-2 -ml-2" onClick={downloadTemplate}>
            Download CSV template
          </Button>
        </div>

        <div>
          <label htmlFor="site-list-file" className="mb-1 block text-slate-700">Spreadsheet</label>
          <input
            ref={inputRef}
            id="site-list-file"
            type="file"
            accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
            disabled={busy}
            onChange={(event) => selectFile(event.target.files?.[0])}
            className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-slate-700"
          />
          <p className="mt-1 text-sm text-slate-500">.csv or .xlsx, maximum 5 MB and 5,000 product rows.</p>
        </div>

        {preview ? (
          <PreviewDetails
            preview={preview}
            confirmSite={confirmSite}
            onConfirmSite={setConfirmSite}
            confirmRemoval={confirmRemoval}
            onConfirmRemoval={setConfirmRemoval}
          />
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          {!preview ? (
            <Button variant="secondary" loading={busy} disabled={!file} onClick={previewFile}>Preview</Button>
          ) : (
            <>
              <Button
                variant="outline"
                disabled={busy}
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Choose another file
              </Button>
              <Button variant="primary" loading={busy} disabled={blocked} onClick={replace}>
                Replace site list
              </Button>
            </>
          )}
        </div>
      </div>
    </Modal>
  );
}

function PreviewDetails({
  preview,
  confirmSite,
  onConfirmSite,
  confirmRemoval,
  onConfirmRemoval,
}: {
  preview: SiteProductListPreview;
  confirmSite: boolean;
  onConfirmSite: (checked: boolean) => void;
  confirmRemoval: boolean;
  onConfirmRemoval: (checked: boolean) => void;
}) {
  const removedShare = preview.currentCount
    ? Math.round((preview.removed.length / preview.currentCount) * 100)
    : 0;
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg text-slate-900">Preview</h4>
        <p className="text-sm text-slate-500">
          {preview.fileName} · {plural(preview.totalRows, "product row")} in the file ·{" "}
          {plural(preview.currentCount, "product")} on this site now
        </p>
      </div>

      {preview.invalidRows > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h5 className="font-semibold text-red-900">
            Fix {plural(preview.invalidRows, "invalid row")} before replacing the list. Nothing was changed.
          </h5>
          <ul className="mt-2 max-h-44 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-red-800">
            {preview.errors.map((error, index) => (
              <li key={`${error.row}-${error.field ?? "file"}-${index}`}>Row {error.row}: {error.message}</li>
            ))}
          </ul>
          {preview.errorsTruncated ? <p className="mt-2 text-sm text-red-700">Only the first 100 errors are shown.</p> : null}
        </div>
      ) : null}

      {preview.canReplace ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            ["Added", preview.added.length, "text-emerald-700"],
            ["Updated", preview.updated.length, "text-sky-700"],
            ["Removed", preview.removed.length, "text-red-700"],
            ["Unchanged", preview.unchangedCount, "text-slate-900"],
          ].map(([label, value, color]) => (
            <div key={String(label)} className="rounded-xl border border-slate-200 p-3 text-center">
              <div className={`text-2xl font-semibold ${color}`}>{value}</div>
              <div className="text-sm text-slate-500">{label}</div>
            </div>
          ))}
        </div>
      ) : null}

      {preview.siteNameMismatch ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
          <p className="font-semibold text-amber-900">
            This file says &ldquo;{preview.fileSiteName}&rdquo; but you are uploading to &ldquo;{preview.siteName}&rdquo;.
          </p>
          <p className="mt-1 text-sm text-amber-800">Check that you chose the right file. The list is only applied to this site.</p>
          <Checkbox
            wrapperClassName="mt-3"
            checked={confirmSite}
            onChange={onConfirmSite}
            description={`Yes, upload this file to ${preview.siteName}`}
          />
        </div>
      ) : null}

      {preview.largeRemoval ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="font-semibold text-red-900">
            {preview.removed.length} of {preview.currentCount} products ({removedShare}%) will be removed from this site.
          </p>
          <p className="mt-1 text-sm text-red-800">
            They disappear from the tablet for this site. Other sites and old orders are not affected.
          </p>
          <Checkbox
            wrapperClassName="mt-3"
            checked={confirmRemoval}
            onChange={onConfirmRemoval}
            description={`Yes, remove ${plural(preview.removed.length, "product")} from ${preview.siteName}`}
          />
        </div>
      ) : null}

      {preview.renamedShared.length > 0 ? (
        <div className="rounded-xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
          <p>
            {preview.renamedShared.length === 1
              ? "1 renamed product is also used by other sites. It will show the new name there too;"
              : `${preview.renamedShared.length} renamed products are also used by other sites. They will show the new name there too;`}{" "}
            old orders keep their old names.
          </p>
          <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-sm text-sky-800">
            {preview.renamedShared.map((product) => (
              <li key={product.sku}>
                {product.sku}: {product.oldName} → {product.newName} ({plural(product.otherSites, "other site")})
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {preview.noChanges ? (
        <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-700">
          No changes — this site&apos;s list already matches the file.
        </div>
      ) : null}

      {preview.added.length > 0 ? (
        <ChangeTable title={`Added (${preview.added.length})`} headers={["Code", "Name", "Minimum", "Unit"]}>
          {preview.added.map((row) => <ProductRow key={row.sku} row={row} />)}
        </ChangeTable>
      ) : null}

      {preview.updated.length > 0 ? (
        <ChangeTable title={`Updated (${preview.updated.length})`} headers={["Code", "Name", "Changes"]}>
          {preview.updated.map((row) => (
            <tr key={row.sku} className="border-t border-slate-100 align-top">
              <td className="px-3 py-2 font-medium text-slate-800">{row.sku}</td>
              <td className="px-3 py-2 text-slate-700">{row.name}</td>
              <td className="px-3 py-2 text-slate-700">
                {row.changes.map((change) => (
                  <div key={change.field}>
                    <span className="text-slate-500">{change.label}:</span> {displayValue(change.before)} →{" "}
                    <strong className="font-medium text-slate-900">{displayValue(change.after)}</strong>
                  </div>
                ))}
              </td>
            </tr>
          ))}
        </ChangeTable>
      ) : null}

      {preview.removed.length > 0 ? (
        <ChangeTable title={`Removed from this site (${preview.removed.length})`} headers={["Code", "Name", "Minimum", "Unit"]}>
          {preview.removed.map((row) => <ProductRow key={row.sku} row={row} />)}
        </ChangeTable>
      ) : null}
    </div>
  );
}

function ChangeTable({ title, headers, children }: { title: string; headers: string[]; children: ReactNode }) {
  return (
    <div>
      <h5 className="mb-2 font-semibold text-slate-800">{title}</h5>
      <div className="max-h-64 overflow-auto rounded-xl border border-slate-200">
        <table className="w-full text-left text-sm">
          <thead className="sticky top-0 bg-slate-50 text-slate-600">
            <tr>
              {headers.map((header) => <th key={header} className="px-3 py-2">{header}</th>)}
            </tr>
          </thead>
          <tbody>{children}</tbody>
        </table>
      </div>
    </div>
  );
}

function ProductRow({ row }: { row: SiteProductListRow }) {
  return (
    <tr className="border-t border-slate-100">
      <td className="px-3 py-2 font-medium text-slate-800">{row.sku}</td>
      <td className="px-3 py-2 text-slate-700">{row.name}</td>
      <td className="px-3 py-2 text-slate-700">{row.minimum_quantity}</td>
      <td className="px-3 py-2 text-slate-700">{row.unit_of_measure}</td>
    </tr>
  );
}

function TabletViewModal({ siteId, siteName, onClose }: { siteId: string; siteName: string; onClose: () => void }) {
  const { data, error, loading } = useApiQuery<SiteProductListInfo>(`/api/sites/${siteId}/product-list`);

  return (
    <Modal title="Preview tablet view" size="lg" onClose={onClose}>
      {loading ? (
        <LoadingPage label="Loading the tablet list..." />
      ) : error || !data ? (
        <EmptyState message="Could not load the tablet list. Please try again." />
      ) : (
        <div className="space-y-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
            <p>
              This is the list the tablet shows for <strong>{siteName}</strong> after it downloads the latest lists,
              sorted by product name.
            </p>
            <p className="mt-1 text-sm">
              {plural(data.products.length, "product")} · List version {data.site.product_list_version}
              {data.site.product_list_updated_at
                ? ` · last updated ${formatDateTime(data.site.product_list_updated_at)}`
                : " · not uploaded yet"}
            </p>
          </div>
          {data.products.length === 0 ? (
            <EmptyState message="The tablet shows no products for this site." />
          ) : (
            <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2">Code</th>
                    <th className="px-3 py-2">Product</th>
                    <th className="px-3 py-2">Minimum</th>
                    <th className="px-3 py-2">Unit</th>
                    <th className="px-3 py-2">Notes</th>
                  </tr>
                </thead>
                <tbody>
                  {data.products.map((product) => (
                    <tr key={product.sku} className="border-t border-slate-100">
                      <td className="px-3 py-2 text-slate-600">{product.sku}</td>
                      <td className="px-3 py-2 font-medium text-slate-800">{product.name}</td>
                      <td className="px-3 py-2 text-slate-700">{product.minimum_quantity}</td>
                      <td className="px-3 py-2 text-slate-700">{product.unit_of_measure}</td>
                      <td className="px-3 py-2 text-slate-500">{product.notes ?? ""}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

function UploadHistoryModal({
  siteId,
  onClose,
  onChanged,
}: {
  siteId: string;
  onClose: () => void;
  onChanged: () => void | Promise<void>;
}) {
  const { data, error, loading, reload } = useApiQuery<{ uploads: SiteProductListUpload[] }>(
    `/api/sites/${siteId}/product-list/history`,
  );
  const [restoring, setRestoring] = useState<SiteProductListUpload | null>(null);
  const [busy, setBusy] = useState(false);
  const uploads = data?.uploads ?? [];

  const restore = async () => {
    if (!restoring) return;
    setBusy(true);
    try {
      const result = await api.post<SiteProductListResult>(
        `/api/sites/${siteId}/product-list/history/${restoring.id}/restore`,
        {},
      );
      if (result.status === "unchanged") {
        notify.info("No changes — this site's list already matches that version.");
      } else {
        notify.success(`Previous list restored: ${changeSummary(result)}`);
      }
      setRestoring(null);
      await Promise.all([reload(), onChanged()]);
    } catch {
      // The shared API client displays the backend error.
    } finally {
      setBusy(false);
    }
  };

  const previousCount = (upload: SiteProductListUpload) =>
    upload.unchanged_count + upload.updated_count + upload.removed_count;

  return (
    <Modal title="Upload history" size="lg" onClose={onClose}>
      <p className="mb-4 text-slate-600">
        Every upload and restore of this site&apos;s list is kept for 12 months. Restore puts back the list the site had
        just before that change; the list it replaces stays in the history.
      </p>
      {loading && !data ? (
        <LoadingPage label="Loading history..." />
      ) : error && !data ? (
        <EmptyState message="Could not load the upload history. Please try again." />
      ) : uploads.length === 0 ? (
        <EmptyState message="No product list has been uploaded for this site yet." />
      ) : (
        <div className="max-h-[60vh] overflow-auto rounded-xl border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="sticky top-0 bg-slate-50 text-slate-600">
              <tr>
                <th className="px-3 py-2">When</th>
                <th className="px-3 py-2">By</th>
                <th className="px-3 py-2">File</th>
                <th className="px-3 py-2">Changes</th>
                <th className="px-3 py-2" />
              </tr>
            </thead>
            <tbody>
              {uploads.map((upload) => (
                <tr key={upload.id} className="border-t border-slate-100 align-top">
                  <td className="whitespace-nowrap px-3 py-2 text-slate-700">{formatDateTime(upload.uploaded_at)}</td>
                  <td className="px-3 py-2 text-slate-700">{upload.uploaded_by_name ?? "-"}</td>
                  <td className="px-3 py-2 text-slate-700">
                    {upload.kind === "restore" ? (
                      <span className="inline-flex items-center gap-1">
                        <Icon icon="mdi:backup-restore" width={14} height={14} className="text-slate-400" />
                        {upload.file_name}
                      </span>
                    ) : (
                      upload.file_name
                    )}
                  </td>
                  <td className="px-3 py-2 text-slate-600">
                    {upload.added_count} added · {upload.updated_count} updated · {upload.removed_count} removed
                  </td>
                  <td className="px-3 py-2 text-right">
                    <Button variant="outline" size="sm" icon="mdi:backup-restore" onClick={() => setRestoring(upload)}>
                      Restore previous list
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <ConfirmModal
        open={Boolean(restoring)}
        tone="primary"
        title="Restore previous list"
        confirmLabel="Restore list"
        loading={busy}
        onClose={() => {
          if (!busy) setRestoring(null);
        }}
        onConfirm={restore}
        description={
          restoring
            ? `This puts back the list the site had before "${restoring.file_name}" (${formatDateTime(restoring.uploaded_at)}): ${
                previousCount(restoring) === 0
                  ? "no products, so every product is removed from this site."
                  : `${plural(previousCount(restoring), "product")}.`
              } The current list is replaced and kept in the history.`
            : ""
        }
      />
    </Modal>
  );
}
