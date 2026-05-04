import { decryptData } from "./crypto.js";

export const buildExportEntries = async (rawEntries, categories, encKeyRaw) => {
  const categoryById = new Map(categories.map((category) => [category.id, category]));
  const decrypted = await Promise.all(
    rawEntries.map(async (entry) => {
      try {
        const plain = await decryptData(entry.encrypted_data, entry.iv, encKeyRaw);
        const category = categoryById.get(entry.category_id);
        return { ...plain, category: category?.name || null, is_favorite: entry.is_favorite };
      } catch {
        return null;
      }
    })
  );

  return decrypted.filter(Boolean);
};

export const downloadJson = (filename, data) => {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
