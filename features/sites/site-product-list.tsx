"use client";

import { useRef, useState, type ReactNode } from "react";

import {
  Alert,
  Button,
  Checkbox,
  CompactCell,
  CompactRow,
  CompactTable,
  ConfirmModal,
  EmptyState,
  FileInput,
  Icon,
  LoadingPage,
  Modal,
  StatTile,
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
    return <span>No product list has been uploaded yet.</span>;
  }
  // History older than 12 months is purged, so the last entry may be older.
  const upload = lastUpload && lastUpload.version === site.product_list_version ? lastUpload : null;
  return (
    <span>
      Last updated {formatDateTime(site.product_list_updated_at)}
      {upload?.uploaded_by_name ? ` by ${upload.uploaded_by_name}` : ""}
      {upload ? ` — ${upload.file_name}` : ""}
    </span>
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
      <Button variant="secondary" icon="mdi:tablet" onClick={() => setDialog("tablet")}>
        See tablet view
      </Button>
      <Button variant="secondary" icon="mdi:history" onClick={() => setDialog("history")}>
        Past uploads
      </Button>
      <Button icon="mdi:file-upload-outline" onClick={() => setDialog("upload")}>
        Upload product list
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
        notify.info("No changes. This site's list already matches the file.");
      } else {
        notify.success(`Product list replaced: ${changeSummary(result)}`);
      }
      await onChanged();
      onClose();
    } catch {
      // The error is shown as a toast; the list may have changed, so check the file again.
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
    <Modal title="Upload product list" size="lg" onClose={close}>
      <div className="space-y-5">
        <Alert tone="neutral">
          <p>
            This replaces the whole product list for <strong>{siteName}</strong>. Products in your file are added or
            updated. Products that are not in your file are removed from this site only. Other sites and past orders are
            not changed.
          </p>
          <p className="mt-2 text-sm">
            Your file needs these columns: Product code, Product name and Minimum stock. You can also include Unit, Pack
            size and Pack unit. A product&apos;s name and unit are shared by every site that uses the same code.
          </p>
          <Button variant="ghost" size="sm" icon="mdi:download" className="mt-2 -ml-3" onClick={downloadTemplate}>
            Download a CSV template
          </Button>
        </Alert>

        <FileInput
          ref={inputRef}
          id="site-list-file"
          label="Your file"
          accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
          disabled={busy}
          onFile={selectFile}
          help="An Excel (.xlsx) or .csv file, up to 5 MB and 5,000 products."
        />

        {preview ? (
          <PreviewDetails
            preview={preview}
            confirmSite={confirmSite}
            onConfirmSite={setConfirmSite}
            confirmRemoval={confirmRemoval}
            onConfirmRemoval={setConfirmRemoval}
          />
        ) : null}

        <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
          <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
          {!preview ? (
            <Button loading={busy} disabled={!file} onClick={previewFile}>Check file</Button>
          ) : (
            <>
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() => {
                  setPreview(null);
                  setFile(null);
                  if (inputRef.current) inputRef.current.value = "";
                }}
              >
                Choose another file
              </Button>
              <Button loading={busy} disabled={blocked} onClick={replace}>
                Replace product list
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
        <h3 className="text-lg text-fg">What will happen</h3>
        <p className="text-sm text-fg-muted">
          {preview.fileName} · {plural(preview.totalRows, "product")} in the file ·{" "}
          {plural(preview.currentCount, "product")} on this site now
        </p>
      </div>

      {preview.invalidRows > 0 ? (
        <Alert
          tone="danger"
          title={`Fix ${plural(preview.invalidRows, "row")} in your file before replacing the list. Nothing has been changed.`}
        >
          <ul className="mt-1 max-h-44 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
            {preview.errors.map((error, index) => (
              <li key={`${error.row}-${error.field ?? "file"}-${index}`}>Row {error.row}: {error.message}</li>
            ))}
          </ul>
          {preview.errorsTruncated ? <p className="mt-2 text-sm">Only the first 100 problems are shown.</p> : null}
        </Alert>
      ) : null}

      {preview.canReplace ? (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Added" value={preview.added.length} tone="success" />
          <StatTile label="Updated" value={preview.updated.length} tone="info" />
          <StatTile label="Removed" value={preview.removed.length} tone="danger" />
          <StatTile label="Unchanged" value={preview.unchangedCount} />
        </div>
      ) : null}

      {preview.siteNameMismatch ? (
        <Alert
          tone="warning"
          title={`This file says “${preview.fileSiteName}”, but you are uploading to “${preview.siteName}”.`}
        >
          <p className="text-sm">Check that you chose the right file. The list is only applied to this site.</p>
          <Checkbox
            wrapperClassName="mt-3"
            checked={confirmSite}
            onChange={onConfirmSite}
            description={`Yes, upload this file to ${preview.siteName}`}
          />
        </Alert>
      ) : null}

      {preview.largeRemoval ? (
        <Alert
          tone="danger"
          title={`${preview.removed.length} of ${preview.currentCount} products (${removedShare}%) will be removed from this site.`}
        >
          <p className="text-sm">
            They will disappear from the tablet for this site. Other sites and past orders are not affected.
          </p>
          <Checkbox
            wrapperClassName="mt-3"
            checked={confirmRemoval}
            onChange={onConfirmRemoval}
            description={`Yes, remove ${plural(preview.removed.length, "product")} from ${preview.siteName}`}
          />
        </Alert>
      ) : null}

      {preview.renamedShared.length > 0 ? (
        <Alert tone="info">
          <p>
            {preview.renamedShared.length === 1
              ? "1 renamed product is also used by other sites, so it will show the new name there too."
              : `${preview.renamedShared.length} renamed products are also used by other sites, so they will show the new name there too.`}{" "}
            Past orders keep their old names.
          </p>
          <ul className="mt-2 max-h-32 space-y-0.5 overflow-y-auto text-sm">
            {preview.renamedShared.map((product) => (
              <li key={product.sku}>
                {product.sku}: {product.oldName} <ChangeArrow /> {product.newName} ({plural(product.otherSites, "other site")})
              </li>
            ))}
          </ul>
        </Alert>
      ) : null}

      {preview.noChanges ? (
        <Alert tone="neutral">No changes. This site&apos;s list already matches the file.</Alert>
      ) : null}

      {preview.added.length > 0 ? (
        <ChangeTable title={`Added (${preview.added.length})`} headers={["Code", "Name", "Minimum", "Unit"]}>
          {preview.added.map((row) => <ProductRow key={row.sku} row={row} />)}
        </ChangeTable>
      ) : null}

      {preview.updated.length > 0 ? (
        <ChangeTable title={`Updated (${preview.updated.length})`} headers={["Code", "Name", "Changes"]}>
          {preview.updated.map((row) => (
            <CompactRow key={row.sku}>
              <CompactCell strong>{row.sku}</CompactCell>
              <CompactCell>{row.name}</CompactCell>
              <CompactCell>
                {row.changes.map((change) => (
                  <div key={change.field}>
                    <span className="text-fg-muted">{change.label}:</span> {displayValue(change.before)} <ChangeArrow />{" "}
                    <strong className="font-medium text-fg">{displayValue(change.after)}</strong>
                  </div>
                ))}
              </CompactCell>
            </CompactRow>
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
      <h4 className="mb-2 text-subhead font-medium text-fg">{title}</h4>
      <CompactTable headers={headers}>{children}</CompactTable>
    </div>
  );
}

function ProductRow({ row }: { row: SiteProductListRow }) {
  return (
    <CompactRow>
      <CompactCell strong>{row.sku}</CompactCell>
      <CompactCell>{row.name}</CompactCell>
      <CompactCell>{row.minimum_quantity}</CompactCell>
      <CompactCell>{row.unit_of_measure}</CompactCell>
    </CompactRow>
  );
}

function TabletViewModal({ siteId, siteName, onClose }: { siteId: string; siteName: string; onClose: () => void }) {
  const { data, error, loading } = useApiQuery<SiteProductListInfo>(`/api/sites/${siteId}/product-list`);

  return (
    <Modal title="What the tablet shows" size="lg" onClose={onClose}>
      {loading ? (
        <LoadingPage compact label="Loading the tablet list..." />
      ) : error || !data ? (
        <EmptyState message="Could not load the tablet list. Please try again." />
      ) : (
        <div className="space-y-4">
          <Alert tone="neutral">
            <p>
              This is the list reps see for <strong>{siteName}</strong> after their tablet downloads the latest lists,
              sorted by product name.
            </p>
            <p className="mt-1 text-sm">
              {plural(data.products.length, "product")} · List version {data.site.product_list_version}
              {data.site.product_list_updated_at
                ? ` · last updated ${formatDateTime(data.site.product_list_updated_at)}`
                : " · not uploaded yet"}
            </p>
          </Alert>
          {data.products.length === 0 ? (
            <EmptyState message="The tablet shows no products for this site." />
          ) : (
            <CompactTable className="max-h-[60vh]" headers={["Code", "Product", "Minimum", "Unit", "Notes"]}>
              {data.products.map((product) => (
                <CompactRow key={product.sku}>
                  <CompactCell muted>{product.sku}</CompactCell>
                  <CompactCell strong>{product.name}</CompactCell>
                  <CompactCell>{product.minimum_quantity}</CompactCell>
                  <CompactCell>{product.unit_of_measure}</CompactCell>
                  <CompactCell muted>{product.notes ?? ""}</CompactCell>
                </CompactRow>
              ))}
            </CompactTable>
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
        notify.info("No changes. This site's list already matches that version.");
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
    <Modal title="Past uploads" size="lg" onClose={onClose}>
      <p className="mb-4 text-base text-fg-muted">
        Every upload and restore for this site is kept for 12 months. Restoring puts back the list the site had just
        before that change. The list it replaces stays in this history.
      </p>
      {loading && !data ? (
        <LoadingPage compact label="Loading past uploads..." />
      ) : error && !data ? (
        <EmptyState message="Could not load past uploads. Please try again." />
      ) : uploads.length === 0 ? (
        <EmptyState message="No product list has been uploaded for this site yet." />
      ) : (
        <CompactTable className="max-h-[60vh]" headers={["When", "By", "File", "Changes", ""]}>
          {uploads.map((upload) => (
            <CompactRow key={upload.id}>
              <CompactCell className="whitespace-nowrap">{formatDateTime(upload.uploaded_at)}</CompactCell>
              <CompactCell>{upload.uploaded_by_name ?? "-"}</CompactCell>
              <CompactCell>
                {upload.kind === "restore" ? (
                  <span className="inline-flex items-center gap-1">
                    <Icon icon="mdi:backup-restore" size="sm" className="text-fg-muted" />
                    {upload.file_name}
                  </span>
                ) : (
                  upload.file_name
                )}
              </CompactCell>
              <CompactCell muted>
                {upload.added_count} added · {upload.updated_count} updated · {upload.removed_count} removed
              </CompactCell>
              <CompactCell className="text-right">
                <Button variant="secondary" size="sm" icon="mdi:backup-restore" onClick={() => setRestoring(upload)}>
                  Restore
                </Button>
              </CompactCell>
            </CompactRow>
          ))}
        </CompactTable>
      )}
      <ConfirmModal
        open={Boolean(restoring)}
        tone="primary"
        title="Restore the previous list?"
        confirmLabel="Restore"
        loading={busy}
        onClose={() => {
          if (!busy) setRestoring(null);
        }}
        onConfirm={restore}
        description={
          restoring
            ? `This puts back the list the site had before “${restoring.file_name}” (${formatDateTime(restoring.uploaded_at)}): ${
                previousCount(restoring) === 0
                  ? "no products, so every product is removed from this site."
                  : `${plural(previousCount(restoring), "product")}.`
              } The current list is replaced, and kept in the history.`
            : ""
        }
      />
    </Modal>
  );
}

/** "old → new": an arrow icon between a value and the value it changes to. */
const ChangeArrow = () => (
  <>
    <Icon icon="mdi:arrow-right" size="sm" className="inline align-[-3px] text-fg-muted" />
    <span className="sr-only">changes to</span>
  </>
);
