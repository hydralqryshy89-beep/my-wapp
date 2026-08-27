"use client";

import { useId, useState } from "react";
import { ImagePlus } from "lucide-react";
import { cn } from "@/lib/utils";

export function LogoPicker({
  name,
  defaultLogo,
  size = "md",
  disabled,
}: {
  name: string;
  defaultLogo?: string | null;
  size?: "sm" | "md";
  disabled?: boolean;
}) {
  const inputId = useId();
  const [preview, setPreview] = useState<string | null>(defaultLogo ?? null);
  const [fileName, setFileName] = useState<string | null>(null);
  const dimension = size === "sm" ? "h-9 w-9" : "h-12 w-12";

  return (
    <div className="flex items-center gap-3">
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="" className={cn(dimension, "shrink-0 rounded-lg border border-border object-cover")} />
      ) : (
        <div
          className={cn(
            dimension,
            "flex shrink-0 items-center justify-center rounded-lg border border-dashed border-border text-muted"
          )}
        >
          <ImagePlus size={size === "sm" ? 14 : 18} />
        </div>
      )}
      <input
        id={inputId}
        name={name}
        type="file"
        accept="image/*"
        disabled={disabled}
        className="sr-only"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (!file) return;
          setFileName(file.name);
          const reader = new FileReader();
          reader.onload = () => setPreview(reader.result as string);
          reader.readAsDataURL(file);
        }}
      />
      <label
        htmlFor={inputId}
        className={cn(
          "inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-border bg-surface px-3 py-2 text-xs font-medium text-foreground hover:bg-muted-surface",
          disabled && "pointer-events-none opacity-50"
        )}
      >
        <ImagePlus size={14} />
        اختر صورة
      </label>
      {fileName && <span className="max-w-32 truncate text-xs text-muted">{fileName}</span>}
    </div>
  );
}
