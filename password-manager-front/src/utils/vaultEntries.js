const normalize = (value) => (value || "").toString().toLowerCase();

export const entryMatchesSearch = (entry, query) => {
  const q = normalize(query).trim();
  if (!q) return true;

  return [entry.title, entry.username, entry.url]
    .some((value) => normalize(value).includes(q));
};

export const sortEntries = (entries, sortBy) => {
  const sorted = [...entries];
  sorted.sort((a, b) => {
    if (sortBy === "az") return (a.title || "").localeCompare(b.title || "");
    if (sortBy === "za") return (b.title || "").localeCompare(a.title || "");
    if (sortBy === "recent") return new Date(b.created_at || 0) - new Date(a.created_at || 0);
    if (sortBy === "old") return new Date(a.created_at || 0) - new Date(b.created_at || 0);
    if (sortBy === "fav") return (b.is_favorite ? 1 : 0) - (a.is_favorite ? 1 : 0);
    return 0;
  });
  return sorted;
};

export const filterAndSortEntries = (entries, search, sortBy) =>
  sortEntries(entries.filter((entry) => entryMatchesSearch(entry, search)), sortBy);

export const toVaultPayload = (form) => ({
  title: form.title,
  username: form.username,
  password: form.password,
  url: form.url,
  notes: form.notes,
});
