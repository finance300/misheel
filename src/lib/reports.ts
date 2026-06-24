import { supabase } from "./supabase";

// Category keys are managed by the admin (cms.ReportCategory) and stored free-form.
export type ReportRecord = {
  id: string;
  group_key: string;
  title: string;
  file_path: string;
  sort_order: number;
  created_at: string;
};

const BUCKET = "reports";

/** All published reports, ordered by group then sort order. */
export async function listReports(): Promise<ReportRecord[]> {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("reports")
    .select("*")
    .order("group_key", { ascending: true })
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ReportRecord[];
}

/** Public URL for a stored file (bucket is public-read). */
export function reportFileUrl(filePath: string): string {
  if (!supabase) return "#";
  return supabase.storage.from(BUCKET).getPublicUrl(filePath).data.publicUrl;
}

/** Upload a PDF (or any file) and return its storage path. */
export async function uploadReportFile(file: File): Promise<string> {
  if (!supabase) throw new Error("Supabase not configured");
  const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_");
  const path = `${Date.now()}-${safeName}`;
  const { error } = await supabase.storage
    .from(BUCKET)
    .upload(path, file, { cacheControl: "3600", upsert: false });
  if (error) throw error;
  return path;
}

export async function createReport(input: {
  group_key: string;
  title: string;
  file_path: string;
}): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("reports").insert({
    group_key: input.group_key,
    title: input.title,
    file_path: input.file_path
  });
  if (error) throw error;
}

export async function deleteReport(record: ReportRecord): Promise<void> {
  if (!supabase) throw new Error("Supabase not configured");
  const { error } = await supabase.from("reports").delete().eq("id", record.id);
  if (error) throw error;
  // Best-effort remove of the stored file; ignore storage errors.
  await supabase.storage.from(BUCKET).remove([record.file_path]);
}
