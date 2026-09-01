"use client";

import { useRef, useState } from "react";

import { Button, Icon, Modal } from "@/components/ui";
import { api } from "@/lib/api/client";
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
  const [result, setResult] = useState<ProductImportResult | null>(null);
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setPreview(null);
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
    setResult(null);
  };

  const previewFile = async () => {
    if (!file) return;
    setBusy(true);
    try {
      setPreview(await submitFile<ProductImportPreview>(file, "preview"));
    } catch {
      // The shared API client displays the backend error.
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
      notify.success(
        nextResult.site
          ? `${nextResult.imported} products and ${nextResult.minimumsImported} site minimums imported.`
          : `${nextResult.imported} product${nextResult.imported === 1 ? "" : "s"} imported.`,
      );
    } catch {
      // The shared API client displays the backend error.
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <Button variant="outline" icon="mdi:file-upload-outline" onClick={() => setOpen(true)}>
        Import Excel/CSV
      </Button>

      <Modal open={open} title="Import products" size="lg" onClose={close}>
        {result ? (
          <div className="space-y-5">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-5">
              <div className="flex items-start gap-3">
                <Icon icon="mdi:check-circle-outline" width={24} height={24} className="text-emerald-600" />
                <div>
                  <h4 className="text-lg text-emerald-900">Import complete</h4>
                  <p className="mt-1 text-emerald-800">
                    {result.imported} products
                    {result.site ? ` and ${result.minimumsImported} site minimums` : ""} were processed successfully.
                  </p>
                </div>
              </div>
            </div>
            {result.site ? <SiteDetails site={result.site} /> : null}
            <div>
              <h5 className="mb-2 font-semibold text-slate-800">Product changes</h5>
              <Summary created={result.created} updated={result.updated} restored={result.restored} />
            </div>
            {result.site ? (
              <div>
                <h5 className="mb-2 font-semibold text-slate-800">Site minimum changes</h5>
                <Summary created={result.minimumsCreated} updated={result.minimumsUpdated} restored={result.minimumsRestored} />
              </div>
            ) : null}
            <div className="flex justify-end">
              <Button variant="secondary" onClick={close}>Done</Button>
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 text-slate-600">
              <p>
                Upload a product catalog or an existing Foodcare VMI sheet in <strong>.xlsx</strong> or <strong>.csv</strong> format.
                VMI sheets also update minimum stock for the customer site identified inside the workbook.
                Existing product codes are updated; missing products are left unchanged.
              </p>
              <Button variant="ghost" size="sm" icon="mdi:download" className="mt-2 -ml-2" onClick={downloadTemplate}>
                Download CSV template
              </Button>
            </div>

            <div>
              <label htmlFor="product-import-file" className="mb-1 block text-slate-700">Spreadsheet</label>
              <input
                ref={inputRef}
                id="product-import-file"
                type="file"
                accept=".xlsx,.csv,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
                disabled={busy}
                onChange={(event) => selectFile(event.target.files?.[0])}
                className="block w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-slate-700 file:mr-3 file:rounded-md file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-slate-700"
              />
              <p className="mt-1 text-sm text-slate-500">Maximum 5 MB and 5,000 product rows.</p>
            </div>

            {preview ? <PreviewDetails preview={preview} /> : null}

            <div className="flex flex-wrap justify-end gap-2 border-t border-slate-200 pt-4">
              <Button variant="ghost" onClick={close} disabled={busy}>Cancel</Button>
              {!preview ? (
                <Button variant="secondary" loading={busy} disabled={!file} onClick={previewFile}>Preview import</Button>
              ) : (
                <>
                  <Button variant="outline" disabled={busy} onClick={() => setPreview(null)}>Choose another file</Button>
                  <Button variant="secondary" loading={busy} disabled={!preview.canImport} onClick={importFile}>
                    Import {preview.validRows} products{preview.site ? " & minimums" : ""}
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
      {[["New", created], ["Updated", updated], ["Restored", restored]].map(([label, value]) => (
        <div key={String(label)} className="rounded-xl border border-slate-200 p-3 text-center">
          <div className="text-2xl font-semibold text-slate-900">{value}</div>
          <div className="text-sm text-slate-500">{label}</div>
        </div>
      ))}
    </div>
  );
}

function PreviewDetails({ preview }: { preview: ProductImportPreview }) {
  return (
    <div className="space-y-4">
      <div>
        <h4 className="text-lg text-slate-900">Preview</h4>
        <p className="text-sm text-slate-500">
          {preview.fileName} · {preview.totalRows} product rows · {preview.format === "vmi" ? "VMI workbook" : "Product catalog"}
        </p>
      </div>
      {preview.site ? <SiteDetails site={preview.site} /> : null}
      <div>
        <h5 className="mb-2 font-semibold text-slate-800">Product changes</h5>
        <Summary created={preview.createCount} updated={preview.updateCount} restored={preview.restoreCount} />
      </div>
      {preview.site ? (
        <div>
          <h5 className="mb-2 font-semibold text-slate-800">Site minimum changes</h5>
          <Summary created={preview.minimumCreateCount} updated={preview.minimumUpdateCount} restored={preview.minimumRestoreCount} />
        </div>
      ) : null}

      {preview.invalidRows > 0 ? (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4">
          <h5 className="font-semibold text-red-900">Fix {preview.invalidRows} invalid row{preview.invalidRows === 1 ? "" : "s"} before importing</h5>
          <ul className="mt-2 max-h-44 list-disc space-y-1 overflow-y-auto pl-5 text-sm text-red-800">
            {preview.errors.map((error, index) => (
              <li key={`${error.row}-${error.field ?? "file"}-${index}`}>Row {error.row}: {error.message}</li>
            ))}
          </ul>
          {preview.errorsTruncated ? <p className="mt-2 text-sm text-red-700">Only the first 100 errors are shown.</p> : null}
        </div>
      ) : null}

      {preview.sample.length > 0 ? (
        <div className="overflow-hidden rounded-xl border border-slate-200">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-600">
                <tr>
                  <th className="px-3 py-2">Action</th>
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Name</th>
                  <th className="px-3 py-2">Unit</th>
                  <th className="px-3 py-2">Pack</th>
                  {preview.site ? <th className="px-3 py-2">Minimum</th> : null}
                </tr>
              </thead>
              <tbody>
                {preview.sample.map((row) => (
                  <tr key={row.row} className="border-t border-slate-100">
                    <td className="px-3 py-2 capitalize text-slate-500">{row.action}</td>
                    <td className="px-3 py-2 font-medium text-slate-800">{row.sku}</td>
                    <td className="px-3 py-2 text-slate-700">{row.name}</td>
                    <td className="px-3 py-2 text-slate-700">{row.defaultUnit}</td>
                    <td className="px-3 py-2 text-slate-700">{row.packSize ?? "-"}{row.packUnit ? ` ${row.packUnit}` : ""}</td>
                    {preview.site ? (
                      <td className="px-3 py-2 text-slate-700">
                        {row.minimumQuantity ?? 0} {row.minimumUnit}
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.validRows > preview.sample.length ? <p className="border-t border-slate-100 px-3 py-2 text-sm text-slate-500">Showing the first {preview.sample.length} valid rows.</p> : null}
        </div>
      ) : null}
    </div>
  );
}

function SiteDetails({ site }: { site: NonNullable<ProductImportPreview["site"]> }) {
  return (
    <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
      <div className="flex items-start gap-3">
        <Icon icon="mdi:map-marker-check-outline" width={22} height={22} className="mt-0.5 text-blue-600" />
        <div>
          <h5 className="font-semibold text-blue-900">Matched site: {site.customerName} — {site.siteName}</h5>
          <p className="mt-0.5 text-sm text-blue-800">{site.address}</p>
        </div>
      </div>
    </div>
  );
}
