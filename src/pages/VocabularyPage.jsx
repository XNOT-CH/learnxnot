/* ============================================
   VocabularyPage
   จัดการหมวดหมู่และคำศัพท์
   - มุมมองรายการหมวดหมู่: สร้าง / แก้ไข / ลบ หมวดหมู่
   - เข้าไปในหมวดหมู่: เพิ่ม / แก้ไข / ลบ / ค้นหา คำศัพท์ภายในหมวดนั้น
   ============================================ */

import { useState, useEffect, useRef } from 'react';
import {
  Plus,
  Search,
  Volume2,
  Pencil,
  Trash2,
  BookOpen,
  Save,
  X,
  Check,
  FolderPlus,
  Folder,
  FolderInput,
  ChevronRight,
  ArrowLeft,
  Download,
  Upload,
} from 'lucide-react';
import {
  saveVocabulary,
  loadStats,
  saveCategories,
  migrateData,
  exportData,
  importData,
  validateBackup,
} from '../utils/storage';
import { speakEnglish } from '../utils/speech';
import { generateId } from '../utils/quiz';

export default function VocabularyPage() {
  // --- Shared state ---
  const [categories, setCategories] = useState([]);
  const [vocabulary, setVocabulary] = useState([]);
  const [stats, setStats] = useState({});
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // null = หน้ารวมหมวดหมู่

  // --- Category management state ---
  const [newCategoryName, setNewCategoryName] = useState('');
  const [editingCategoryId, setEditingCategoryId] = useState(null);
  const [editCategoryName, setEditCategoryName] = useState('');
  const [deleteCategoryConfirmId, setDeleteCategoryConfirmId] = useState(null);

  // --- Word form state ---
  const [english, setEnglish] = useState('');
  const [thai, setThai] = useState('');
  const [editingId, setEditingId] = useState(null); // null = adding, string = editing
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [movingWordId, setMovingWordId] = useState(null); // word being moved to another category
  const [formError, setFormError] = useState(''); // ข้อความเตือนของฟอร์มคำศัพท์ เช่น คำซ้ำ

  // --- Backup (import/export) state ---
  const [importPreview, setImportPreview] = useState(null); // parsed data awaiting confirm
  const [importError, setImportError] = useState('');

  const englishInputRef = useRef(null);
  const newCategoryInputRef = useRef(null);
  const fileInputRef = useRef(null);

  // --- Load & migrate data on mount ---
  useEffect(() => {
    const { vocabulary: vocab, categories: cats } = migrateData();
    setVocabulary(vocab);
    setCategories(cats);
    setStats(loadStats());
  }, []);

  // --- Persist vocabulary/categories when they change (skip initial render) ---
  const isFirstRender = useRef(true);
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    saveVocabulary(vocabulary);
    saveCategories(categories);
  }, [vocabulary, categories]);

  // ============================================
  // Category helpers
  // ============================================
  const selectedCategory = categories.find((c) => c.id === selectedCategoryId) || null;

  const wordCountFor = (categoryId) =>
    vocabulary.filter((w) => w.categoryId === categoryId).length;

  // --- Create a new category ---
  const handleCreateCategory = (e) => {
    e.preventDefault();
    const name = newCategoryName.trim();
    if (!name) return;
    const newCat = { id: generateId(), name, createdAt: Date.now() };
    setCategories((prev) => [...prev, newCat]);
    setNewCategoryName('');
    newCategoryInputRef.current?.focus();
  };

  // --- Start renaming a category ---
  const handleStartEditCategory = (cat) => {
    setEditingCategoryId(cat.id);
    setEditCategoryName(cat.name);
    setDeleteCategoryConfirmId(null);
  };

  // --- Save renamed category ---
  const handleSaveCategory = (e) => {
    e.preventDefault();
    const name = editCategoryName.trim();
    if (!name) return;
    setCategories((prev) =>
      prev.map((c) => (c.id === editingCategoryId ? { ...c, name } : c))
    );
    setEditingCategoryId(null);
    setEditCategoryName('');
  };

  // --- Delete a category and all its words ---
  const handleDeleteCategory = (id) => {
    setCategories((prev) => prev.filter((c) => c.id !== id));
    setVocabulary((prev) => prev.filter((w) => w.categoryId !== id));
    setDeleteCategoryConfirmId(null);
    if (selectedCategoryId === id) setSelectedCategoryId(null);
  };

  // --- Enter a category ---
  const openCategory = (id) => {
    setSelectedCategoryId(id);
    // reset word-form state so it starts clean
    setEditingId(null);
    setEnglish('');
    setThai('');
    setSearchQuery('');
    setDeleteConfirmId(null);
    setFormError('');
  };

  // ============================================
  // Word helpers (scoped to selected category)
  // ============================================
  const wordsInCategory = vocabulary.filter(
    (w) => w.categoryId === selectedCategoryId
  );

  const filteredVocabulary = wordsInCategory.filter((word) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      word.english.toLowerCase().includes(q) ||
      word.thai.toLowerCase().includes(q)
    );
  });

  // --- Add or update a word ---
  const handleSubmit = (e) => {
    e.preventDefault();
    const trimmedEn = english.trim();
    const trimmedTh = thai.trim();
    if (!trimmedEn || !trimmedTh) {
      setFormError('กรุณากรอกทั้งคำภาษาอังกฤษและคำแปลภาษาไทย');
      return;
    }

    // กันคำซ้ำภายในหมวดเดียวกัน (ไม่สนตัวพิมพ์เล็ก-ใหญ่)
    const duplicate = vocabulary.find(
      (w) =>
        w.categoryId === selectedCategoryId &&
        w.id !== editingId &&
        w.english.trim().toLowerCase() === trimmedEn.toLowerCase()
    );
    if (duplicate) {
      setFormError(
        `มีคำว่า "${duplicate.english}" อยู่ในหมวดนี้แล้ว (แปลว่า ${duplicate.thai})`
      );
      englishInputRef.current?.focus();
      return;
    }
    setFormError('');

    if (editingId) {
      setVocabulary((prev) =>
        prev.map((w) =>
          w.id === editingId ? { ...w, english: trimmedEn, thai: trimmedTh } : w
        )
      );
      setEditingId(null);
    } else {
      const newWord = {
        id: generateId(),
        english: trimmedEn,
        thai: trimmedTh,
        categoryId: selectedCategoryId,
      };
      setVocabulary((prev) => [newWord, ...prev]);
    }

    setEnglish('');
    setThai('');
    englishInputRef.current?.focus();
  };

  const handleEdit = (word) => {
    setFormError('');
    setEditingId(word.id);
    setEnglish(word.english);
    setThai(word.thai);
    englishInputRef.current?.focus();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEnglish('');
    setThai('');
    setFormError('');
  };

  const handleDelete = (id) => {
    setVocabulary((prev) => prev.filter((w) => w.id !== id));
    setDeleteConfirmId(null);
    if (editingId === id) handleCancelEdit();
  };

  // --- Move a word to another category ---
  const handleMoveWord = (wordId, targetCategoryId) => {
    setVocabulary((prev) =>
      prev.map((w) =>
        w.id === wordId ? { ...w, categoryId: targetCategoryId } : w
      )
    );
    setMovingWordId(null);
  };

  const getAccuracy = (id) => {
    const stat = stats[id];
    if (!stat) return null;
    const total = stat.correct + stat.wrong;
    if (total === 0) return null;
    return Math.round((stat.correct / total) * 100);
  };

  // ============================================
  // Backup: export / import
  // ============================================
  const handleExport = () => {
    const data = exportData();
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const date = new Date().toISOString().slice(0, 10);
    a.download = `learnxnot-backup-${date}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // --- Read a chosen file and stage it for confirmation ---
  const handleFileChosen = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file later
    if (!file) return;
    setImportError('');

    const reader = new FileReader();
    reader.onload = () => {
      let parsed;
      try {
        parsed = JSON.parse(reader.result);
      } catch {
        setImportError('ไฟล์ไม่ถูกต้อง — กรุณาเลือกไฟล์สำรองของ LearnXNot');
        return;
      }
      try {
        // ตรวจและทำความสะอาดข้อมูลก่อน เพื่อให้ตัวเลขในหน้ายืนยันตรงกับที่จะนำเข้าจริง
        setImportPreview(validateBackup(parsed));
      } catch (err) {
        setImportError(
          err.message || 'ไฟล์ไม่ถูกต้อง — กรุณาเลือกไฟล์สำรองของ LearnXNot'
        );
      }
    };
    reader.onerror = () => setImportError('อ่านไฟล์ไม่สำเร็จ');
    reader.readAsText(file);
  };

  // --- Confirm import: replace all data ---
  const handleConfirmImport = () => {
    if (!importPreview) return;
    try {
      const { vocabulary: vocab, categories: cats } = importData(importPreview);
      setVocabulary(vocab);
      setCategories(cats);
      setStats(loadStats());
      setSelectedCategoryId(null);
      setImportPreview(null);
    } catch (err) {
      setImportError(err.message || 'นำเข้าไม่สำเร็จ');
      setImportPreview(null);
    }
  };

  // ============================================
  // RENDER: Category list view
  // ============================================
  if (!selectedCategory) {
    return (
      <div className="min-h-screen px-4 py-8">
        <div className="mx-auto max-w-3xl space-y-6">
          {/* Header */}
          <div className="animate-slide-up text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700">
              <Folder size={16} />
              หมวดหมู่คำศัพท์
            </div>
            <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
              หมวดหมู่ของฉัน
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              สร้างหมวดหมู่ แล้วเข้าไปเก็บคำศัพท์ไว้ข้างใน
            </p>
          </div>

          {/* Create category form */}
          <form
            onSubmit={handleCreateCategory}
            className="glass-card animate-fade-in space-y-4 p-5 sm:p-6"
          >
            <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
              <FolderPlus size={18} className="text-primary-500" />
              สร้างหมวดหมู่ใหม่
            </h2>
            <div className="flex flex-col gap-3 sm:flex-row">
              <input
                ref={newCategoryInputRef}
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                placeholder="ชื่อหมวดหมู่ เช่น หมวด A, คำกริยา, สัตว์"
                className="w-full flex-1 rounded-xl border border-border bg-white/80 px-4 py-2.5 text-text-primary
                           placeholder:text-text-muted
                           focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-200
                           transition-colors"
              />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white
                           shadow-sm hover:bg-primary-700 active:scale-[0.97]
                           transition-all cursor-pointer"
              >
                <Plus size={16} />
                สร้าง
              </button>
            </div>
          </form>

          {/* ===== Backup: export / import ===== */}
          <div className="animate-fade-in">
            {/* Hidden file input for import */}
            <input
              ref={fileInputRef}
              type="file"
              accept="application/json,.json"
              onChange={handleFileChosen}
              className="hidden"
            />

            {importPreview ? (
              /* Import confirmation card */
              <div className="glass-card animate-scale-in space-y-3 p-5 text-center">
                <Upload size={28} className="mx-auto text-primary-500" />
                <p className="font-semibold text-text-primary">ยืนยันการนำเข้าข้อมูล?</p>
                <p className="text-sm text-text-secondary">
                  ไฟล์นี้มี {importPreview.categories.length} หมวด และ{' '}
                  {importPreview.vocabulary.length} คำ
                </p>
                {(importPreview.skipped.words > 0 ||
                  importPreview.skipped.categories > 0) && (
                  <p className="text-xs text-warning">
                    ข้ามรายการที่ข้อมูลไม่ครบ{' '}
                    {importPreview.skipped.categories > 0 &&
                      `${importPreview.skipped.categories} หมวด`}
                    {importPreview.skipped.categories > 0 &&
                      importPreview.skipped.words > 0 &&
                      ' และ '}
                    {importPreview.skipped.words > 0 &&
                      `${importPreview.skipped.words} คำ`}
                  </p>
                )}
                <p className="text-xs text-error">
                  ⚠️ ข้อมูลปัจจุบันทั้งหมดจะถูกแทนที่และไม่สามารถกู้คืนได้
                </p>
                <div className="flex justify-center gap-3 pt-1">
                  <button
                    onClick={handleConfirmImport}
                    className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-4 py-2 text-sm font-semibold text-white hover:bg-primary-700 transition-colors cursor-pointer"
                  >
                    <Check size={16} />
                    นำเข้าเลย
                  </button>
                  <button
                    onClick={() => setImportPreview(null)}
                    className="rounded-xl border border-border bg-white px-4 py-2 text-sm font-medium text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer"
                  >
                    ยกเลิก
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleExport}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white hover:text-primary-600 transition-colors cursor-pointer"
                >
                  <Download size={16} />
                  สำรองข้อมูล
                </button>
                <button
                  onClick={() => {
                    setImportError('');
                    fileInputRef.current?.click();
                  }}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white/70 px-4 py-2 text-sm font-medium text-text-secondary hover:bg-white hover:text-primary-600 transition-colors cursor-pointer"
                >
                  <Upload size={16} />
                  นำเข้าข้อมูล
                </button>
              </div>
            )}

            {importError && (
              <p className="mt-2 text-center text-sm text-error">{importError}</p>
            )}
          </div>

          {/* Category grid */}
          <div className="space-y-3">
            {categories.length === 0 ? (
              <div className="glass-card animate-fade-in py-16 text-center">
                <Folder size={48} className="mx-auto mb-4 text-primary-300" />
                <p className="text-lg font-semibold text-text-secondary">
                  ยังไม่มีหมวดหมู่
                </p>
                <p className="mt-1 text-sm text-text-muted">
                  สร้างหมวดหมู่แรกของคุณด้านบนเลย! 📁
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {categories.map((cat) => {
                  const isEditing = editingCategoryId === cat.id;
                  const isConfirmingDelete = deleteCategoryConfirmId === cat.id;
                  const count = wordCountFor(cat.id);

                  return (
                    <div
                      key={cat.id}
                      className="glass-card animate-fade-in p-4 sm:p-5"
                    >
                      {isEditing ? (
                        /* Rename form */
                        <form
                          onSubmit={handleSaveCategory}
                          className="flex items-center gap-2"
                        >
                          <input
                            autoFocus
                            type="text"
                            value={editCategoryName}
                            onChange={(e) => setEditCategoryName(e.target.value)}
                            className="min-w-0 flex-1 rounded-lg border border-border bg-white/80 px-3 py-2 text-sm text-text-primary
                                       focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-200"
                          />
                          <button
                            type="submit"
                            title="บันทึก"
                            className="rounded-lg bg-primary-600 p-2 text-white hover:bg-primary-700 transition-colors cursor-pointer"
                          >
                            <Save size={16} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setEditingCategoryId(null)}
                            title="ยกเลิก"
                            className="rounded-lg border border-border bg-white p-2 text-text-muted hover:bg-surface-hover transition-colors cursor-pointer"
                          >
                            <X size={16} />
                          </button>
                        </form>
                      ) : isConfirmingDelete ? (
                        /* Delete confirmation */
                        <div className="space-y-3 animate-scale-in">
                          <p className="text-sm font-medium text-text-primary">
                            ลบหมวด “{cat.name}” ?
                          </p>
                          <p className="text-xs text-text-muted">
                            คำศัพท์ {count} คำในหมวดนี้จะถูกลบไปด้วย
                          </p>
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleDeleteCategory(cat.id)}
                              className="inline-flex items-center gap-1.5 rounded-lg bg-error px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-600 transition-colors cursor-pointer"
                            >
                              <Trash2 size={14} />
                              ลบเลย
                            </button>
                            <button
                              onClick={() => setDeleteCategoryConfirmId(null)}
                              className="rounded-lg border border-border bg-white px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-surface-hover transition-colors cursor-pointer"
                            >
                              ยกเลิก
                            </button>
                          </div>
                        </div>
                      ) : (
                        /* Normal card */
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => openCategory(cat.id)}
                            className="flex min-w-0 flex-1 items-center gap-3 text-left cursor-pointer group"
                          >
                            <div className="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-xl bg-primary-100 text-primary-600 group-hover:bg-primary-500 group-hover:text-white transition-colors">
                              <Folder size={22} />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="truncate font-bold text-text-primary group-hover:text-primary-700 transition-colors">
                                {cat.name}
                              </p>
                              <p className="text-xs text-text-muted">
                                {count} คำ
                              </p>
                            </div>
                            <ChevronRight
                              size={18}
                              className="flex-shrink-0 text-text-muted group-hover:text-primary-500 transition-colors"
                            />
                          </button>
                          {/* Card actions */}
                          <div className="flex flex-shrink-0 items-center gap-1">
                            <button
                              onClick={() => handleStartEditCategory(cat)}
                              title="แก้ไขชื่อ"
                              className="rounded-lg p-2 text-text-muted hover:bg-primary-50 hover:text-primary-600 transition-colors cursor-pointer"
                            >
                              <Pencil size={16} />
                            </button>
                            <button
                              onClick={() => {
                                setDeleteCategoryConfirmId(cat.id);
                                setEditingCategoryId(null);
                              }}
                              title="ลบหมวดหมู่"
                              className="rounded-lg p-2 text-text-muted hover:bg-error-light hover:text-error transition-colors cursor-pointer"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER: Words inside a category
  // ============================================
  return (
    <div className="min-h-screen px-4 py-8">
      <div className="mx-auto max-w-3xl space-y-6">

        {/* Back + category header */}
        <div className="animate-slide-up">
          <button
            onClick={() => setSelectedCategoryId(null)}
            className="mb-3 inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-medium text-text-secondary hover:bg-white/70 hover:text-primary-600 transition-colors cursor-pointer"
          >
            <ArrowLeft size={16} />
            หมวดหมู่ทั้งหมด
          </button>
          <div className="text-center">
            <div className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary-100 px-4 py-1.5 text-sm font-medium text-primary-700">
              <Folder size={16} />
              {selectedCategory.name}
            </div>
            <h1 className="text-2xl font-bold text-text-primary sm:text-3xl">
              จัดการคำศัพท์
            </h1>
            <p className="mt-1 text-sm text-text-muted">
              เพิ่ม แก้ไข และจัดการคำศัพท์ในหมวด “{selectedCategory.name}”
            </p>
          </div>
        </div>

        {/* Add / Edit word form */}
        <form
          onSubmit={handleSubmit}
          className="glass-card animate-fade-in space-y-4 p-5 sm:p-6"
        >
          <h2 className="flex items-center gap-2 text-lg font-semibold text-text-primary">
            {editingId ? (
              <>
                <Pencil size={18} className="text-primary-500" />
                แก้ไขคำศัพท์
              </>
            ) : (
              <>
                <Plus size={18} className="text-primary-500" />
                เพิ่มคำศัพท์ใหม่
              </>
            )}
          </h2>

          {/* English input */}
          <div>
            <label htmlFor="english-input" className="mb-1 block text-sm font-medium text-text-secondary">
              English
            </label>
            <input
              ref={englishInputRef}
              id="english-input"
              type="text"
              value={english}
              onChange={(e) => {
                setEnglish(e.target.value);
                if (formError) setFormError('');
              }}
              aria-invalid={formError ? true : undefined}
              aria-describedby={formError ? 'word-form-error' : undefined}
              placeholder="English word, e.g. cat"
              className="w-full rounded-xl border border-border bg-white/80 px-4 py-2.5 text-text-primary
                         placeholder:text-text-muted
                         focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-200
                         transition-colors"
            />
          </div>

          {/* Thai input */}
          <div>
            <label htmlFor="thai-input" className="mb-1 block text-sm font-medium text-text-secondary">
              ความหมายภาษาไทย
            </label>
            <input
              id="thai-input"
              type="text"
              value={thai}
              onChange={(e) => setThai(e.target.value)}
              placeholder="คำแปลภาษาไทย เช่น แมว, เหมียว"
              className="w-full rounded-xl border border-border bg-white/80 px-4 py-2.5 text-text-primary
                         placeholder:text-text-muted
                         focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-200
                         transition-colors"
            />
            <p className="mt-1.5 text-xs text-text-muted">
              คั่นหลายคำตอบด้วยเครื่องหมาย , (comma)
            </p>
          </div>

          {/* Inline error (เช่น คำซ้ำในหมวดเดียวกัน) */}
          {formError && (
            <p
              id="word-form-error"
              role="alert"
              className="rounded-xl bg-error-light/60 px-3 py-2 text-sm text-error"
            >
              {formError}
            </p>
          )}

          {/* Action buttons */}
          <div className="flex items-center gap-3">
            {editingId ? (
              <>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white
                             shadow-sm hover:bg-primary-700 active:scale-[0.97]
                             transition-all cursor-pointer"
                >
                  <Save size={16} />
                  บันทึก
                </button>
                <button
                  type="button"
                  onClick={handleCancelEdit}
                  className="inline-flex items-center gap-2 rounded-xl border border-border bg-white px-5 py-2.5 text-sm font-medium text-text-secondary
                             hover:bg-surface-hover active:scale-[0.97]
                             transition-all cursor-pointer"
                >
                  <X size={16} />
                  ยกเลิก
                </button>
              </>
            ) : (
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-primary-600 px-5 py-2.5 text-sm font-semibold text-white
                           shadow-sm hover:bg-primary-700 active:scale-[0.97]
                           transition-all cursor-pointer"
              >
                <Plus size={16} />
                เพิ่มคำศัพท์
              </button>
            )}
          </div>
        </form>

        {/* Search bar */}
        <div className="animate-fade-in">
          <div className="relative">
            <Search
              size={18}
              className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted"
            />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="ค้นหาคำศัพท์ในหมวดนี้..."
              className="w-full rounded-xl border border-border bg-white/80 py-2.5 pl-10 pr-4 text-text-primary
                         placeholder:text-text-muted
                         focus:border-border-focus focus:outline-none focus:ring-2 focus:ring-primary-200
                         transition-colors"
            />
          </div>
          <p className="mt-2 text-xs text-text-muted">
            {searchQuery.trim()
              ? `พบ ${filteredVocabulary.length} จาก ${wordsInCategory.length} คำ`
              : `ทั้งหมด ${wordsInCategory.length} คำ`}
          </p>
        </div>

        {/* Vocabulary list */}
        <div className="space-y-3">
          {filteredVocabulary.length === 0 ? (
            <div className="glass-card animate-fade-in py-16 text-center">
              <BookOpen size={48} className="mx-auto mb-4 text-primary-300" />
              {wordsInCategory.length === 0 ? (
                <>
                  <p className="text-lg font-semibold text-text-secondary">
                    ยังไม่มีคำศัพท์ในหมวดนี้
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    เริ่มเพิ่มคำศัพท์แรกด้านบนเลย! 🚀
                  </p>
                </>
              ) : (
                <>
                  <p className="text-lg font-semibold text-text-secondary">
                    ไม่พบคำศัพท์
                  </p>
                  <p className="mt-1 text-sm text-text-muted">
                    ลองค้นหาด้วยคำอื่น
                  </p>
                </>
              )}
            </div>
          ) : (
            filteredVocabulary.map((word) => {
              const accuracy = getAccuracy(word.id);
              const isConfirmingDelete = deleteConfirmId === word.id;
              const isMoving = movingWordId === word.id;
              const otherCategories = categories.filter(
                (c) => c.id !== word.categoryId
              );

              return (
                <div
                  key={word.id}
                  className="glass-card animate-fade-in px-4 py-3 sm:px-5 sm:py-4"
                >
                  <div className="flex items-center justify-between gap-3">
                  {/* Left: word info */}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-lg font-bold text-primary-700 sm:text-xl">
                        {word.english}
                      </span>
                      {accuracy !== null && (
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium
                            ${accuracy >= 70
                              ? 'bg-success-light text-success'
                              : accuracy >= 40
                                ? 'bg-warning-light text-warning'
                                : 'bg-error-light text-error'
                            }`}
                        >
                          <Check size={12} />
                          {accuracy}%
                        </span>
                      )}
                    </div>
                    <p className="mt-0.5 text-sm text-text-secondary truncate">
                      {word.thai}
                    </p>
                  </div>

                  {/* Right: action buttons */}
                  <div className="flex items-center gap-1 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => speakEnglish(word.english)}
                      title="ฟังเสียง"
                      className="rounded-lg p-2 text-text-muted hover:bg-primary-50 hover:text-primary-600
                                 transition-colors cursor-pointer"
                    >
                      <Volume2 size={18} />
                    </button>

                    <button
                      type="button"
                      onClick={() => handleEdit(word)}
                      title="แก้ไข"
                      className="rounded-lg p-2 text-text-muted hover:bg-primary-50 hover:text-primary-600
                                 transition-colors cursor-pointer"
                    >
                      <Pencil size={18} />
                    </button>

                    {/* Move button (only if there is somewhere to move to) */}
                    {otherCategories.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setMovingWordId(isMoving ? null : word.id);
                          setDeleteConfirmId(null);
                        }}
                        title="ย้ายไปหมวดอื่น"
                        className={`rounded-lg p-2 transition-colors cursor-pointer
                          ${isMoving
                            ? 'bg-primary-100 text-primary-600'
                            : 'text-text-muted hover:bg-primary-50 hover:text-primary-600'
                          }`}
                      >
                        <FolderInput size={18} />
                      </button>
                    )}

                    {isConfirmingDelete ? (
                      <div className="flex items-center gap-1 animate-scale-in">
                        <button
                          type="button"
                          onClick={() => handleDelete(word.id)}
                          title="ยืนยันลบ"
                          className="rounded-lg bg-error p-2 text-white hover:bg-red-600
                                     transition-colors cursor-pointer"
                        >
                          <Check size={18} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setDeleteConfirmId(null)}
                          title="ยกเลิก"
                          className="rounded-lg border border-border bg-white p-2 text-text-muted hover:bg-surface-hover
                                     transition-colors cursor-pointer"
                        >
                          <X size={18} />
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setDeleteConfirmId(word.id)}
                        title="ลบ"
                        className="rounded-lg p-2 text-text-muted hover:bg-error-light hover:text-error
                                   transition-colors cursor-pointer"
                      >
                        <Trash2 size={18} />
                      </button>
                    )}
                  </div>
                  </div>

                  {/* Move panel: pick a target category */}
                  {isMoving && (
                    <div className="mt-3 border-t border-border pt-3 animate-scale-in">
                      <p className="mb-2 text-xs font-medium text-text-secondary">
                        ย้าย “{word.english}” ไปยังหมวด:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {otherCategories.map((cat) => (
                          <button
                            key={cat.id}
                            type="button"
                            onClick={() => handleMoveWord(word.id, cat.id)}
                            className="inline-flex items-center gap-1.5 rounded-full border border-border bg-white/70 px-3 py-1.5 text-xs font-medium text-text-secondary hover:bg-primary-50 hover:text-primary-600 hover:border-primary-200 transition-colors cursor-pointer"
                          >
                            <Folder size={13} />
                            {cat.name}
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setMovingWordId(null)}
                          className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 text-xs font-medium text-text-muted hover:bg-surface-hover transition-colors cursor-pointer"
                        >
                          <X size={13} />
                          ยกเลิก
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
