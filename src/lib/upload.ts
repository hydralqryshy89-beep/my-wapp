// Logos are stored as data URLs directly in the database — there's no
// separate object storage configured for this deployment, and a small
// logo image easily fits in a text column. Capped well under Postgres's
// row-size limits.
const MAX_LOGO_BYTES = 1.5 * 1024 * 1024; // 1.5MB

export async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/png"};base64,${buffer.toString("base64")}`;
}

/**
 * Reads an optional image file field from a form submission.
 * Returns:
 * - a data URL string if a valid new file was uploaded
 * - `undefined` if no file was chosen (caller should keep the existing logo)
 * - throws a user-facing message string via the returned `error` field if the file is invalid
 */
export async function readOptionalLogoUpload(
  formData: FormData,
  key: string
): Promise<{ dataUrl?: string; error?: string }> {
  const file = formData.get(key);
  if (!(file instanceof File) || file.size === 0) {
    return {};
  }
  if (!file.type.startsWith("image/")) {
    return { error: "الملف المختار ليس صورة صالحة" };
  }
  if (file.size > MAX_LOGO_BYTES) {
    return { error: "حجم الصورة كبير جداً — الحد الأقصى 1.5 ميجابايت" };
  }
  return { dataUrl: await fileToDataUrl(file) };
}
