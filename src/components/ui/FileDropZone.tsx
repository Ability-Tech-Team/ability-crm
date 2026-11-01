'use client';

import { useRef, useState } from 'react';
import { FileText, Upload, X } from 'lucide-react';
import { useTranslations } from 'next-intl';
import { convertJpegToJpg } from '@/src/lib/convertJpegToJpg';

type FileDropZoneProps = {
  label: string;
  name: string;
  files: File[];
  onChange: (files: File[]) => void;
  containerClassName?: string;
  accept?: string;
};

const fileKey = (file: File) =>
  `${file.name}-${file.size}-${file.lastModified}`;

export default function FileDropZone({
  label,
  name,
  files,
  onChange,
  containerClassName = '',
  accept,
}: FileDropZoneProps) {
  const t = useTranslations('upload');
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragActive, setIsDragActive] = useState(false);

  const mergeFiles = async (incoming: File[]) => {
    if (!incoming.length) return;
    const converted = await Promise.all(
      incoming.map(async (file) => {
        try {
          return await convertJpegToJpg(file);
        } catch {
          return file;
        }
      }),
    );
    const existingKeys = new Set(files.map(fileKey));
    const merged = [
      ...files,
      ...converted.filter((file) => !existingKeys.has(fileKey(file))),
    ];
    onChange(merged);
  };

  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.currentTarget.contains(e.relatedTarget as Node | null)) return;
    setIsDragActive(false);
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragActive(false);
    const dropped = Array.from(e.dataTransfer.files ?? []);
    void mergeFiles(dropped);
    if (inputRef.current) inputRef.current.value = '';
  };

  const handleRemove = (key: string) => {
    onChange(files.filter((file) => fileKey(file) !== key));
  };

  return (
    <div className={containerClassName}>
      <label
        htmlFor={name}
        className="block text-sm font-medium text-gray-700 mb-1"
      >
        {label}
      </label>

      <div
        onClick={() => inputRef.current?.click()}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={`border-2 border-dashed rounded-xl p-4 text-center cursor-pointer transition-colors ${
          isDragActive
            ? 'border-sky-400 bg-sky-50'
            : 'border-slate-200 hover:border-sky-300 hover:bg-sky-50/50'
        }`}
      >
        <div className="flex flex-col items-center gap-1.5">
          <Upload size={22} className="text-slate-400" />
          <span className="text-sm text-slate-500">
            {isDragActive ? t('dropHere') : t('dragMultipleHint')}
          </span>
        </div>
        <input
          ref={inputRef}
          id={name}
          name={name}
          type="file"
          multiple
          accept={accept}
          className="hidden"
          onChange={(event) => {
            const selected = Array.from(event.currentTarget.files ?? []);
            void mergeFiles(selected);
            event.currentTarget.value = '';
          }}
        />
      </div>

      {!!files.length && (
        <ul className="mt-2 flex flex-col gap-1.5">
          {files.map((file) => {
            const key = fileKey(file);
            return (
              <li
                key={key}
                className="flex items-center justify-between gap-2 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1.5"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <FileText size={14} className="text-sky-600 shrink-0" />
                  <span
                    className="text-xs text-slate-700 truncate"
                    title={file.name}
                  >
                    {file.name}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemove(key);
                  }}
                  className="p-1 rounded-md text-slate-500 hover:bg-slate-200 hover:text-red-600 transition-colors shrink-0"
                  aria-label="remove"
                >
                  <X size={14} />
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
