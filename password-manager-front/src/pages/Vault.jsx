import { useState, useEffect, useCallback, useMemo } from "react";
import { toast } from "react-toastify";
import { FiPlus, FiSearch, FiStar, FiGrid, FiShield, FiSettings, FiMenu, FiX, FiArrowDown, FiClock } from "react-icons/fi";
import Navbar from "../components/Navbar.jsx";
import EntryCard from "../components/EntryCard.jsx";
import VaultEntryModal from "../components/VaultEntryModal.jsx";
import ConfirmModal from "../components/ConfirmModal.jsx";
import CategoryModal from "../components/CategoryModal.jsx";
import { useAuth } from "../context/auth-context.js";
import { encryptData, decryptData } from "../utils/crypto.js";
import { getApiErrorMessage } from "../utils/errors.js";
import { filterAndSortEntries, toVaultPayload } from "../utils/vaultEntries.js";
import api from "../api/api.js";
import "../css/Vault.css";

export default function Vault() {
  const { encKeyRaw } = useAuth();

  const [entries,    setEntries]    = useState([]);
  const [categories, setCategories] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [loading,    setLoading]    = useState(true);

  const [search,      setSearch]      = useState("");
  const [activeCategory, setActiveCategory] = useState(null);
  const [favOnly,     setFavOnly]     = useState(false);

  const [modalOpen,   setModalOpen]   = useState(false);
  const [editEntry,   setEditEntry]   = useState(null);
  const [confirmId,   setConfirmId]   = useState(null);
  const [catModalOpen, setCatModalOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sortBy, setSortBy] = useState("az");

  // ── Fetch categories ──
  const fetchCategories = useCallback(async () => {
    try {
      const { data } = await api.get("/categories");
      setCategories(data);
    } catch { /* silencieux */ }
  }, []);

  // ── Fetch & decrypt entries ──
  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeCategory !== null) params.category_id = activeCategory;
      if (favOnly) params.favorites = true;

      const { data } = await api.get("/vault", { params });

      const decrypted = await Promise.all(
        data.map(async (e) => {
          try {
            const plain = await decryptData(e.encrypted_data, e.iv, encKeyRaw);
            return { id: e.id, category_id: e.category_id, is_favorite: e.is_favorite, ...plain };
          } catch {
            return { id: e.id, category_id: e.category_id, is_favorite: e.is_favorite, title: "⚠️ Erreur déchiffrement", password: "" };
          }
        })
      );
      setEntries(decrypted);
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de charger le coffre."));
    } finally {
      setLoading(false);
    }
  }, [encKeyRaw, activeCategory, favOnly]);

  // ── Fetch stats ──
  const fetchStats = useCallback(async () => {
    try {
      const { data } = await api.get("/vault/stats");
      setStats(data);
    } catch { /* silencieux */ }
  }, []);

  useEffect(() => {
    fetchCategories();
    fetchStats();
  }, [fetchCategories, fetchStats]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  // ── Save (add or edit) ──
  const handleSave = async (form) => {
    const payload = toVaultPayload(form);
    const { encrypted_data, iv } = await encryptData(payload, encKeyRaw);
    const body = {
      encrypted_data,
      iv,
      category_id: form.category_id || null,
    };

    try {
      if (editEntry) {
        await api.put(`/vault/${editEntry.id}`, body);
        toast.success("Entrée modifiée !");
      } else {
        await api.post("/vault", body);
        toast.success("Entrée ajoutée !");
      }

      setModalOpen(false);
      setEditEntry(null);
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible d'enregistrer l'entrée."));
      throw err;
    }
  };

  // ── Delete ──
  const handleDelete = (id) => setConfirmId(id);

  const confirmDelete = async () => {
    try {
      await api.delete(`/vault/${confirmId}`);
      toast.success("Entrée supprimée.");
      setConfirmId(null);
      fetchEntries();
      fetchStats();
    } catch (err) {
      toast.error(getApiErrorMessage(err, "Impossible de supprimer l'entrée."));
    }
  };

  // ── Favorite toggle ──
  const handleToggleFavorite = async (id) => {
    setEntries((prev) => prev.map((e) => e.id === id ? { ...e, is_favorite: !e.is_favorite } : e));
    try {
      await api.patch(`/vault/${id}/favorite`);
      fetchStats();
    } catch (err) {
      setEntries((prev) => prev.map((e) => e.id === id ? { ...e, is_favorite: !e.is_favorite } : e));
      toast.error(getApiErrorMessage(err, "Erreur lors de la mise à jour du favori."));
    }
  };

  // ── Open edit modal ──
  const openEdit = (entry) => {
    setEditEntry(entry);
    setModalOpen(true);
  };

  const filtered = useMemo(
    () => filterAndSortEntries(entries, search, sortBy),
    [entries, search, sortBy]
  );

  const toggleAlphaSort = () => {
    setSortBy((current) => current === "az" ? "za" : "az");
  };

  const alphaSortActive = sortBy === "az" || sortBy === "za";

  return (
    <div className="vault-layout">
      <Navbar />

      <div className="vault-body">
        {/* Sidebar */}
        <aside className={`vault-sidebar ${sidebarOpen ? "open" : ""}`}>
          <button className="sidebar-toggle" onClick={() => setSidebarOpen((v) => !v)} aria-expanded={sidebarOpen}>
            <FiMenu size={16} /> Filtres &amp; catégories
          </button>
          <p className="sidebar-label">Filtres</p>

          <button
            className={`sidebar-item ${activeCategory === null && !favOnly ? "active" : ""}`}
            onClick={() => { setActiveCategory(null); setFavOnly(false); }}
          >
            <FiGrid size={16} /> Tout
            <span className="sidebar-count">{stats?.total ?? 0}</span>
          </button>

          <button
            className={`sidebar-item ${favOnly ? "active" : ""}`}
            onClick={() => { setFavOnly(true); setActiveCategory(null); }}
          >
            <FiStar size={16} /> Favoris
            <span className="sidebar-count">{stats?.favorites ?? 0}</span>
          </button>

          <div className="sidebar-section-header">
            <p className="sidebar-label" style={{ marginTop: 16 }}>Catégories</p>
            <button
              className="btn-icon sidebar-gear"
              onClick={() => setCatModalOpen(true)}
              title="Gérer les catégories"
              aria-label="Gérer les catégories"
            >
              <FiSettings size={13} />
            </button>
          </div>
          {categories.map((c) => (
            <button
              key={c.id}
              className={`sidebar-item ${activeCategory === c.id && !favOnly ? "active" : ""}`}
              onClick={() => { setActiveCategory(c.id); setFavOnly(false); }}
            >
              <span>{c.icon}</span> {c.name}
            </button>
          ))}
        </aside>

        {/* Main */}
        <main className="vault-main">
          <div className="vault-toolbar">
            <div className="vault-search-group">
              <div className="search-wrap input-icon-wrap">
                <FiSearch className="input-icon" size={16} />
                <input
                  className="input input-with-icon search-input"
                  type="search"
                  placeholder="Rechercher un titre, identifiant ou site"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                />
                {search && (
                  <button
                    type="button"
                    className="btn-icon search-clear"
                    onClick={() => setSearch("")}
                    title="Effacer la recherche"
                    aria-label="Effacer la recherche"
                  >
                    <FiX size={14} />
                  </button>
                )}
              </div>

              <button
                type="button"
                className={`sort-pill ${alphaSortActive ? "active" : ""}`}
                onClick={toggleAlphaSort}
                title={sortBy === "az" ? "Trier de Z à A" : "Trier de A à Z"}
                aria-label={sortBy === "az" ? "Trier de Z à A" : "Trier de A à Z"}
              >
                <span>{sortBy === "za" ? "Z-A" : "A-Z"}</span>
                <FiArrowDown className={sortBy === "za" ? "sort-desc" : ""} size={14} />
              </button>

              <button
                type="button"
                className={`sort-pill icon-only ${sortBy === "recent" ? "active" : ""}`}
                onClick={() => setSortBy("recent")}
                title="Plus récent"
                aria-label="Trier par plus récent"
              >
                <FiClock size={15} />
              </button>
            </div>

            <div className="toolbar-meta">
              {filtered.length} / {entries.length}
            </div>

            <button className="btn btn-primary" onClick={() => { setEditEntry(null); setModalOpen(true); }}>
              <FiPlus size={16} /> Nouvelle entrée
            </button>
          </div>

          {loading ? (
            <div className="vault-empty">
              <span className="spinner" style={{ width: 32, height: 32 }} />
            </div>
          ) : filtered.length === 0 ? (
            <div className="vault-empty">
              <FiShield size={48} style={{ color: "var(--border)" }} />
              <p>Aucune entrée trouvée.</p>
              {entries.length === 0 && (
                <button className="btn btn-primary" onClick={() => setModalOpen(true)}>
                  <FiPlus size={16} /> Ajouter ton premier mot de passe
                </button>
              )}
            </div>
          ) : (
            <div className="entries-grid">
              {filtered.map((e) => (
                <EntryCard
                  key={e.id}
                  entry={e}
                  onEdit={openEdit}
                  onDelete={handleDelete}
                  onToggleFavorite={handleToggleFavorite}
                />
              ))}
            </div>
          )}
        </main>
      </div>

      <VaultEntryModal
        open={modalOpen}
        entry={editEntry}
        categories={categories}
        onSave={handleSave}
        onClose={() => { setModalOpen(false); setEditEntry(null); }}
      />

      <ConfirmModal
        open={!!confirmId}
        message="Supprimer cette entrée définitivement ? Cette action est irréversible."
        onConfirm={confirmDelete}
        onCancel={() => setConfirmId(null)}
      />

      <CategoryModal
        open={catModalOpen}
        categories={categories}
        onClose={() => setCatModalOpen(false)}
        onRefresh={() => { fetchCategories(); fetchEntries(); }}
      />
    </div>
  );
}
