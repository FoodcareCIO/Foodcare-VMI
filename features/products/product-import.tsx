"use client";

import Link from "next/link";
import { useRef, useState } from "react";

import {
  Alert,
  Button,
  CompactCell,
  CompactRow,
  CompactTable,
  FileInput,
  Modal,
  StatTile,
} from "@/components/ui";
import { ApiError, api } from "@/lib/api/client";
import { notify } from "@/lib/notifications";
import type {
  ProductImportPreview,
  ProductImportResult,
} from "@/lib/product-import-types";

const TEMPLATE = [
  "Product code,Product name,Default unit,Pack size,Pack unit",
  'ABC-001,"Example product",case,12,each',
].join("\r\n");

const downloadTemplate = () => {
  const blob = new Blob([TEMPLATE], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = "foodcare-product-import-template.csv";
  link.click();
  URL.revokeObjectURL(url);
};

const submitFile = async <T,>(file: File, mode: "preview" | "import") => {
  const formData = new FormData();
  formData.set("file", file);
  formData.set("mode", mode);
  return api.postForm<T>("/api/products/import", formData);
};

export function ProductImport({ onImported }: { onImported: () => void | Promise<void> }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<ProductImportPreview | null>(null);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [result, setResult] = useState<ProductImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
    setPreviewError(null);
    setResult(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const close = () => {
    if (busy) return;
    setOpen(false);
    reset();
  };

  const selectFile = (nextFile?: File) => {
    setFile(nextFile ?? null);
    setPreview(null);
    setPreviewError(null);
    setResult(null);
  };

  const previewFile = async () => {
    if (!file) return;
    setBusy(true);
    setPreviewError(null);
    try {
      setPreview(await submitFile<ProductImportPreview>(file, "preview"));
    } catch (error) {
      // The shared API client also shows the error as a toast.
      if (error instanceof ApiError) setPreviewError(error.message);
    } finally {
      setBusy(false);
    }
  };

  const importFile = async () => {
    if (!file || !preview?.canImport) return;
    setBusy(true);
    try {
      const nextResult = await submitFile<ProductImportResult>(file, "import");
      setResult(nextResult);
      await onImported();
      notify.success(`${nextResult.imported} product${nextResult.imported === 1 ? "" : "s"} imported.`);
    } catch {
      // The shared API client displays the backend error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="secondary" icon="mdi:file-upload-outline" onClick={() => setOpen(true)}>
        Import from Excel or CSV
      </Button>

      <Modal open={open} title="Import products" size="lg" onClose={close}>
        {result ? (
          <div className="space-y-5">
            <Alert tone="success" title="Import complete">
              {result.imported} product{result.imported === 1 ? " was" : "s were"} added or updated.
            </Alert>
            <Summary created={result.created} updated={result.updated} restored={result.restored} />
            <div className="flex justify-end">
              <Button onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <Alert tone="neutral">
              <p>
                Upload a list of products as an <strong>Excel (.xlsx)</strong> or <strong>.csv</strong> file. New
                products are added, and existing ones (matched by product code) are updated. This does not change
                what any site stocks.
              </p>
              <p className="mt-2">
                To change the products at one site, open{" "}
                <Link href="/sites" className="font-medium text-primary-text hover:underline">
                  Sites
                </Link>
                , choose the site, then choose <strong>Upload product list</strong>.
              </p>
              <Button variant="ghost" size="sm" icon="mdi:download" className="mt-2 -ml-3" onClick={downloadTemplate}>
                Download a CSV template
              </Button>
            </Alert>

            <FileInput
              ref={inputRef}
              id="product-import-file"
              label="Your file"
              accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
              disabled={busy}
              onFile={selectFile}
              help="Up to 5 MB and 5,000 products."
            />

            {previewError ? <Alert tone="danger">{previewError}</Alert> : null}
            {preview ? <PreviewDetails preview={preview} /> : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-line pt-4">
              <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
              {!preview ? (
                <Button loading={busy} disabled={!file} onClick={previewFile}>Check file</Button>
              ) : (
                <>
                  <Button variant="secondary" disabled={busy} onClick={() => setPreview(null)}>Choose another file</Button>
                  <Button loading={busy} disabled={!preview.canImport} onClick={importFile}>
                    Import {preview.validRows} product{preview.validRows === 1 ? "" : "s"}
                  </Button>
                </>
              )}
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}

function Summary({ created, updated, restored }: { created: number; updated: number; restored: number }) {
  return (
    <div className="grid grid-cols-3 gap-3">
      <StatTile label="New" value={created} tone="success" />
      <StatTile label="Updated" value={updated} tone="info" />
      <StatTile label="Brought back" value={restored} />
    </div>
  );
}

function PreviewDetails({ preview }: { preview: ProductImportPreview }) {
  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-lg text-fg">What will happen</h3>
        <p className="text-sm text-fg-muted">
          {preview.fileName} · {preview.totalRows} product{preview.totalRows === 1 ? "" : "s"}
        </p>
      </div>
      <Summary created={preview.createCount} updated={preview.updateCount} restored={preview.restoreCount} />

      {preview.invalidRows > 0 ? (
        <Alert
          tone="danger"
          title={`Fix ${preview.invalidRows} row${preview.invalidRows === 1 ? "" : "s"} in your file before importing`}
        >
          <ul className="mt-1 max-h-44 list-disc space-y-1 overflow-y-auto pl-5 text-sm">
            {preview.errors.map((error, index) => (
              <li key={`${error.row}-${error.field ?? "file"}-${index}`}>Row {error.row}: {error.message}</li>
            ))}
          </ul>
          {preview.errorsTruncated ? <p className="mt-2 text-sm">Only the first 100 problems are shown.</p> : null}
        </Alert>
      ) : null}

      {preview.sample.length > 0 ? (
        <div>
          <CompactTable headers={["Action", "Code", "Name", "Unit", "Pack"]}>
            {preview.sample.map((row) => (
              <CompactRow key={row.row}>
                <CompactCell muted className="capitalize">{row.action}</CompactCell>
                <CompactCell strong>{row.sku}</CompactCell>
                <CompactCell>{row.name}</CompactCell>
                <CompactCell>{row.defaultUnit}</CompactCell>
                <CompactCell>{row.packSize ?? "-"}{row.packUnit ? ` ${row.packUnit}` : ""}</CompactCell>
              </CompactRow>
            ))}
          </CompactTable>
          {preview.validRows > preview.sample.length ? (
            <p className="mt-2 text-sm text-fg-muted">Showing the first {preview.sample.length} products.</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
