'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Upload, 
  Search, 
  Filter, 
  Edit, 
  Trash, 
  Download, 
  X, 
  AlertTriangle,
  Info,
  DollarSign,
  Package,
  Layers,
  ChevronRight,
  ChevronLeft,
  RefreshCw,
  Scan
} from 'lucide-react';
import { useTheme } from '@/lib/ThemeProvider';

export default function ProductsPage() {
  const { 
    productsData, 
    loadingProducts, 
    preloadProducts, 
    categoriesData, 
    loadingCategories, 
    preloadCategories,
    userRole,
    showAlert,
    showConfirm
  } = useTheme();

  const products = productsData;
  const categories = categoriesData;
  const loading = products.length === 0 && (loadingProducts || loadingCategories);
  
  // Search & Filter State
  const [search, setSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedStatus, setSelectedStatus] = useState('all');
  const [isTorchOn, setIsTorchOn] = useState(false);

  const toggleTorch = (selector: string) => {
    try {
      const video = document.querySelector(`${selector} video`) as HTMLVideoElement;
      if (video && video.srcObject) {
        const stream = video.srcObject as MediaStream;
        const track = stream.getVideoTracks()[0];
        if (track && typeof track.getCapabilities === 'function') {
          const capabilities = track.getCapabilities() as any;
          if (capabilities && capabilities.torch) {
            const constraints = track.getConstraints() as any;
            const currentTorch = constraints.advanced?.find((c: any) => 'torch' in c)?.torch || false;
            const zoomConstraint = constraints.advanced?.find((c: any) => 'zoom' in c)?.zoom || 1;
            track.applyConstraints({
              advanced: [{ zoom: zoomConstraint, torch: !currentTorch } as any]
            });
            setIsTorchOn(!currentTorch);
          } else {
            alert("Flashlight (torch) is not supported on this camera/device.");
          }
        }
      }
    } catch (err) {
      console.warn("Failed to toggle camera flash:", err);
    }
  };
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newCategoryDesc, setNewCategoryDesc] = useState('');
  const [categoryError, setCategoryError] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [creatingProduct, setCreatingProduct] = useState(false);
  const [importing, setImporting] = useState(false);

  
  // Form values
  const [sku, setSku] = useState('');
  const [name, setName] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [brand, setBrand] = useState('');
  const [costPrice, setCostPrice] = useState(0);
  const [currentPrice, setCurrentPrice] = useState(0);
  const [minPrice, setMinPrice] = useState(0);
  const [maxPrice, setMaxPrice] = useState(0);
  const [targetMargin, setTargetMargin] = useState(30);
  const [inventory, setInventory] = useState(0);
  const [seasonalRelevance, setSeasonalRelevance] = useState('All Year');
  const [customCategory, setCustomCategory] = useState('');

  const searchInputRef = React.useRef<HTMLInputElement>(null);
  const addSkuInputRef = React.useRef<HTMLInputElement>(null);

  // Fetch products and categories
  const fetchData = async () => {
    try {
      await Promise.all([preloadProducts(true), preloadCategories(true)]);
    } catch (err) {
      console.error('Error fetching catalog data:', err);
    }
  };

  useEffect(() => {
    if (products.length === 0) {
      fetchData();
    }
    // Default cursor focus for search box
    searchInputRef.current?.focus();

    const keepFocus = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.tagName === 'INPUT' || 
        target.tagName === 'SELECT' || 
        target.tagName === 'BUTTON' || 
        target.tagName === 'TEXTAREA' ||
        target.closest('button') ||
        target.closest('a')
      ) {
        return;
      }
      setTimeout(() => {
        searchInputRef.current?.focus();
      }, 0);
    };

    document.addEventListener("click", keepFocus);

    return () => {
      document.removeEventListener("click", keepFocus);
    };
  }, []);

  useEffect(() => {
    if (showAddModal) {
      setTimeout(() => {
        addSkuInputRef.current?.focus();
      }, 80);
    }
  }, [showAddModal]);

  useEffect(() => {
    if (categories.length > 0 && !categoryId) {
      setCategoryId(categories[0].id);
    }
  }, [categories, categoryId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingProduct) return;
    setCreatingProduct(true);

    try {
      const res = await fetch('/api/products', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku, 
          name, 
          categoryId, 
          brand, 
          costPrice, 
          currentPrice, 
          minPrice, 
          maxPrice, 
          targetMargin, 
          inventory, 
          seasonalRelevance,
          categoryName: categoryId === 'new' ? customCategory : undefined
        })
      });
      
      if (res.ok) {
        setShowAddModal(false);
        fetchData();
        resetForm();
      } else {
        const data = await res.json();
        showAlert('Product Error', data.error || 'Failed to create product', 'error');
      }
    } catch (err) {
      console.error('Create product error:', err);
    } finally {
      setCreatingProduct(false);
    }
  };

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct) return;
    
    try {
      const res = await fetch(`/api/products/${selectedProduct.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sku, 
          name, 
          categoryId, 
          brand, 
          costPrice, 
          currentPrice, 
          minPrice, 
          maxPrice, 
          targetMargin, 
          inventory, 
          seasonalRelevance,
          categoryName: categoryId === 'new' ? customCategory : undefined
        })
      });
      if (res.ok) {
        setShowEditModal(false);
        fetchData();
        resetForm();
      } else {
        const data = await res.json();
        showAlert('Product Error', data.error || 'Failed to update product', 'error');
      }
    } catch (err) {
      console.error('Update product error:', err);
    }
  };

  const handleDelete = async (id: string) => {
    showConfirm(
      "Delete Product",
      "Are you sure you want to delete this product? All related snapshots will be lost.",
      async () => {
        try {
          const res = await fetch(`/api/products/${id}`, { method: 'DELETE' });
          if (res.ok) {
            fetchData();
          } else {
            const data = await res.json();
            showAlert('Delete Error', data.error || 'Failed to delete product', 'error');
          }
        } catch (err) {
          console.error('Delete product error:', err);
        }
      }
    );
  };

  // CSV Import parser simulation
  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) {
        setImporting(false);
        return;
      }

      const rows = text.split('\n').map(row => row.trim()).filter(row => row.length > 0);
      const headers = rows[0].split(',').map(h => h.trim());
      
      const parsedData = rows.slice(1).map(row => {
        // Split with care of commas
        const cols = row.split(',').map(c => c.trim());
        const obj: Record<string, any> = {};
        headers.forEach((header, index) => {
          obj[header] = cols[index];
        });
        return obj;
      }).filter(item => {
        return (item.sku && item.sku.trim() !== '') || (item.name && item.name.trim() !== '');
      });

      // Send to server in bulk
      try {
        const res = await fetch('/api/products', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(parsedData)
        });

        if (res.ok) {
          showAlert('CSV Imported', 'CSV imported successfully! Background competitor matching initiated.', 'success');
          fetchData();
        } else {
          const data = await res.json();
          showAlert('Import Failed', data.error || 'Failed to import CSV.', 'error');
        }
      } catch (err) {
        console.error('Error uploading CSV:', err);
      } finally {
        setImporting(false);
      }
    };
    reader.readAsText(file);
  };

  const downloadSampleCSV = () => {
    const headers = 'sku,name,brand,categoryName,costPrice,currentPrice,minPrice,maxPrice,targetMargin,inventory,seasonalRelevance\n';
    const row1 = 'PP-SAMPLE-1,Wireless Keyboard,AeroLogix,Consumer Electronics,20.00,49.99,35.00,89.00,45,25,All Year\n';
    const row2 = 'PP-SAMPLE-2,Smart Air Fryer,BakeFast,Home Appliances,40.00,99.99,75.00,149.00,40,4,All Year\n';
    
    const blob = new Blob([headers + row1 + row2], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.setAttribute('href', url);
    a.setAttribute('download', 'pricepilot_catalog_template.csv');
    a.click();
  };

  const openAddModal = () => {
    resetForm();
    setShowAddModal(true);
  };

  const openEditModal = (product: any) => {
    setSelectedProduct(product);
    setSku(product.sku);
    setName(product.name);
    setCategoryId(product.categoryId);
    setCustomCategory('');
    setBrand(product.brand);
    setCostPrice(product.costPrice);
    setCurrentPrice(product.currentPrice);
    setMinPrice(product.minPrice);
    setMaxPrice(product.maxPrice);
    setTargetMargin(product.targetMargin);
    setInventory(product.inventory);
    setSeasonalRelevance(product.seasonalRelevance);
    setShowEditModal(true);
  };

  const resetForm = () => {
    setSelectedProduct(null);
    setSku('');
    setName('');
    if (categories.length > 0) {
      setCategoryId(categories[0].id);
    } else {
      setCategoryId('');
    }
    setCustomCategory('');
    setBrand('');
    setCostPrice(0);
    setCurrentPrice(0);
    setMinPrice(0);
    setMaxPrice(0);
    setTargetMargin(30);
    setInventory(0);
    setSeasonalRelevance('All Year');
  };

  // Filter products locally for searchability
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(search.toLowerCase()) || p.sku.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesStatus = selectedStatus === 'all' || p.status === selectedStatus;
    return matchesSearch && matchesCategory && matchesStatus;
  });

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [loadedPages, setLoadedPages] = useState<number[]>([1]);
  const [pageTransitionLoading, setPageTransitionLoading] = useState(false);
  const pageSize = 10;

  // Reset to page 1 and clear prefetch cache on filter changes
  useEffect(() => {
    setCurrentPage(1);
    setLoadedPages([1]);
  }, [search, selectedCategory, selectedStatus]);

  const totalPages = Math.ceil(filteredProducts.length / pageSize) || 1;

  // Background preload next page
  useEffect(() => {
    const nextPage = currentPage + 1;
    if (nextPage <= totalPages && !loadedPages.includes(nextPage)) {
      const timer = setTimeout(() => {
        setLoadedPages((prev) => [...prev, nextPage]);
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [currentPage, totalPages, loadedPages]);

  const handlePageChange = (newPage: number) => {
    if (loadedPages.includes(newPage)) {
      setCurrentPage(newPage);
    } else {
      setPageTransitionLoading(true);
      setTimeout(() => {
        setLoadedPages((prev) => [...prev, newPage]);
        setCurrentPage(newPage);
        setPageTransitionLoading(false);
      }, 350);
    }
  };

  const paginatedProducts = filteredProducts.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  const isViewer = userRole === 'Viewer';

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white sm:text-3xl">Catalog Management</h1>
          <p className="text-slate-400 text-sm mt-0.5">Edit boundaries, track target margins, and review product statuses.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">
          {/* CSV Import */}
          <div className="relative">
            <input
              type="file"
              accept=".csv"
              onChange={handleCSVImport}
              disabled={isViewer || importing}
              id="csv-file-input"
              className="hidden"
            />
            <label
              htmlFor={importing || isViewer ? undefined : "csv-file-input"}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-xs font-semibold text-slate-300 transition-all cursor-pointer ${
                isViewer || importing ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              <Upload className={`w-3.5 h-3.5 ${importing ? 'animate-spin' : ''}`} />
              <span>{importing ? 'Importing...' : 'Import CSV'}</span>
            </label>
          </div>

          <button
            onClick={downloadSampleCSV}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 text-slate-300 text-xs font-semibold transition-all"
            title="Download CSV Template"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Template</span>
          </button>

          {/* Add Category Button */}
          <button
            onClick={() => setShowCategoryModal(true)}
            disabled={isViewer}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-emerald-700/50 bg-emerald-900/30 hover:bg-emerald-800/40 text-emerald-300 text-xs font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-all"
            title="Add New Category"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Category</span>
          </button>

          {/* Add Product Button */}
          <button
            onClick={openAddModal}
            disabled={isViewer}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold shadow-lg shadow-indigo-600/10 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Add Product</span>
          </button>
        </div>
      </div>

      {isViewer && (
        <div className="p-3.5 rounded-xl border border-amber-900/30 bg-amber-950/20 flex gap-2.5 items-start text-xs text-amber-300 text-left">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>You are logged in with read-only Viewer privileges. Adding, updating, or importing catalogs is restricted. Switch roles in the top navbar to modify data.</span>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-12 gap-4 p-4 rounded-2xl border border-slate-800/80 bg-slate-900/20 backdrop-blur-xl">
        <div className="sm:col-span-6 relative flex items-center">
          <Search className="absolute left-3 w-4 h-4 text-slate-500" />
          <input
            ref={searchInputRef}
            type="text"
            placeholder="Search by name or SKU..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-10 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 placeholder-slate-600 focus:border-indigo-600 focus:outline-none transition-all"
            autoFocus
          />
          <button
            type="button"
            onClick={async () => {
              try {
                const Quagga = (await import('@ericblade/quagga2')).default;
                
                // Toggle scanner state
                if ((window as any)._searchHtml5QrcodeScanner) {
                  try {
                    const Q = (window as any)._searchHtml5QrcodeScanner;
                    Q.stop();
                    Q.offDetected();
                  } catch (e) {}
                  (window as any)._searchHtml5QrcodeScanner = null;
                  setIsTorchOn(false);
                  const scanContainer = document.getElementById('search-qr-reader-wrapper');
                  if (scanContainer) {
                    scanContainer.style.display = 'none';
                    scanContainer.classList.add('hidden');
                  }
                  return;
                }

                const scanContainer = document.getElementById('search-qr-reader-wrapper');
                if (scanContainer) {
                  scanContainer.style.display = 'flex';
                  scanContainer.classList.remove('hidden');
                }

                Quagga.init({
                  inputStream: {
                    type: "LiveStream",
                    target: document.querySelector("#search-qr-reader") as HTMLElement,
                    constraints: {
                      facingMode: "environment",
                      width: { min: 640, ideal: 3840 },
                      height: { min: 480, ideal: 2160 },
                    },
                  },
                  numOfWorkers: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
                  decoder: {
                    readers: [
                      "upc_reader",
                      "upc_e_reader",
                      "ean_reader",
                      "ean_reader",
                      "code_128_reader"
                    ],
                    multiple: false
                  },
                  locate: true,
                  locator: {
                    halfSample: true,
                    patchSize: "medium"
                  }
                }, (err) => {
                  if (err) {
                    alert(`Camera access failed: ${err.message || err}`);
                    return;
                  }
                  Quagga.start();

                  // Apply hardware zoom and torch fix on mobile devices
                  setTimeout(() => {
                    try {
                      const video = document.querySelector("#search-qr-reader video") as HTMLVideoElement;
                      if (video && video.srcObject) {
                        const stream = video.srcObject as MediaStream;
                        const track = stream.getVideoTracks()[0];
                        if (track && typeof track.getCapabilities === 'function') {
                          const capabilities = track.getCapabilities() as any;
                          
                          const constraints: any = {};
                          if (capabilities.zoom) {
                            const maxZoom = capabilities.zoom.max || 1;
                            const minZoom = capabilities.zoom.min || 1;
                            constraints.zoom = maxZoom > 1 ? Math.min(maxZoom, 2) : minZoom;
                          }
                          
                          if (capabilities.torch) {
                            constraints.torch = true;
                            setIsTorchOn(true);
                          }
                          
                          track.applyConstraints({
                            advanced: [constraints]
                          });
                        }
                      }
                    } catch (zoomErr) {
                      console.warn("Failed to apply hardware zoom/torch:", zoomErr);
                    }
                  }, 800);
                });

                (window as any)._searchHtml5QrcodeScanner = Quagga;

                Quagga.onDetected(async (result) => {
                  if (result && result.codeResult && result.codeResult.code) {
                    const decodedText = result.codeResult.code;
                    const cleanText = (decodedText.length === 13 && decodedText.startsWith('0')) ? decodedText.substring(1) : decodedText;
                    setSearch(cleanText);
                    try {
                      Quagga.stop();
                      Quagga.offDetected();
                    } catch (e) {}
                    (window as any)._searchHtml5QrcodeScanner = null;
                    setIsTorchOn(false);
                    if (scanContainer) {
                      scanContainer.style.display = 'none';
                      scanContainer.classList.add('hidden');
                    }
                  }
                });
              } catch (err: any) {
                alert(`Camera access failed: ${err.message || err}`);
              }
            }}
            className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-850 transition-all cursor-pointer"
            title="Scan barcode with camera"
          >
            <Scan className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="sm:col-span-3 flex items-center gap-2">
          <select
            value={selectedCategory}
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-400 focus:outline-none"
          >
            <option value="all">All Categories</option>
            {categories.map(c => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>
        </div>

        <div className="sm:col-span-3">
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full px-3 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-400 focus:outline-none"
          >
            <option value="all">All Statuses</option>
            <option value="Active">Active</option>
            <option value="Draft">Draft</option>
            <option value="Archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Barcode scanner view container for search */}
      <div 
        id="search-qr-reader-wrapper" 
        className="hidden fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
      >
        <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-slate-200">Scan UPC Barcode</h3>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => toggleTorch("#search-qr-reader")}
                className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                  isTorchOn 
                    ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                    : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-white hover:border-slate-700'
                }`}
                title={isTorchOn ? "Turn off Flash" : "Turn on Flash"}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </button>
              <button
                type="button"
                onClick={async () => {
                  if ((window as any)._searchHtml5QrcodeScanner) {
                    try {
                      const Q = (window as any)._searchHtml5QrcodeScanner;
                      Q.stop();
                      Q.offDetected();
                    } catch (e) {}
                    (window as any)._searchHtml5QrcodeScanner = null;
                  }
                  setIsTorchOn(false);
                  const scanContainer = document.getElementById('search-qr-reader-wrapper');
                  if (scanContainer) {
                    scanContainer.style.display = 'none';
                    scanContainer.classList.add('hidden');
                  }
                }}
                className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-slate-700 bg-slate-950/40"
                title="Close Scanner"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>
          <div 
            id="search-qr-reader" 
            className="w-full overflow-hidden rounded-xl border border-slate-850 bg-black aspect-square relative"
          />
        </div>
      </div>

      {/* Catalog Table */}
      <div className="bg-slate-900/40 border border-slate-800/80 rounded-2xl shadow-xl overflow-hidden">
        {loading || pageTransitionLoading ? (
          <div className="py-24 text-center">
            <div className="w-8 h-8 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
            <p className="mt-3 text-slate-500 text-xs">Loading items page...</p>
          </div>
        ) : filteredProducts.length === 0 ? (
          <div className="py-20 text-center text-slate-500 space-y-2">
            <Package className="w-10 h-10 mx-auto text-slate-700" />
            <p className="text-xs font-semibold">No products found</p>
            <p className="text-[11px] text-slate-600">Try adjusting your filters or importing items via CSV.</p>
          </div>
        ) : (
              <>
              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 bg-slate-950/20 text-slate-400 font-bold uppercase tracking-wider">
                      <th className="px-6 py-4 font-semibold">SKU / Product Info</th>
                      <th className="px-6 py-4 font-semibold">Brand</th>
                      <th className="px-6 py-4 font-semibold text-right">Cost Price</th>
                      <th className="px-6 py-4 font-semibold text-right">Selling Price</th>
                      <th className="px-6 py-4 font-semibold text-right">Price Boundaries (Min / Max)</th>
                      <th className="px-6 py-4 font-semibold text-right">Target Margin</th>
                      <th className="px-6 py-4 font-semibold text-center">Stock</th>
                      <th className="px-6 py-4 font-semibold text-center">Status</th>
                      {!isViewer && <th className="px-6 py-4 font-semibold text-right">Actions</th>}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {paginatedProducts.map((p) => {
                      const currentMargin = Math.round(((p.currentPrice - p.costPrice) / p.currentPrice) * 100);
                      
                      return (
                        <tr key={p.id} className="hover:bg-slate-900/10 transition-colors group">
                          <td className="px-6 py-4">
                            <span className="text-[10px] font-bold text-slate-500 block mb-0.5">{p.sku}</span>
                            <div className="font-semibold text-slate-200">{p.name}</div>
                            <span className="text-[10px] text-slate-400 block mt-0.5">{p.categoryName}</span>
                          </td>
                          <td className="px-6 py-4 text-slate-400">{p.brand}</td>
                          <td className="px-6 py-4 text-right text-slate-300">₹{p.costPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right font-black text-indigo-400">₹{p.currentPrice.toFixed(2)}</td>
                          <td className="px-6 py-4 text-right text-slate-400">
                            ₹{p.minPrice.toFixed(2)} - ₹{p.maxPrice.toFixed(2)}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <span className="font-semibold text-slate-200">{p.targetMargin}%</span>
                            <span className={`text-[10px] block mt-0.5 ${currentMargin >= p.targetMargin ? 'text-emerald-400' : 'text-rose-400'}`}>
                              (Actual: {currentMargin}%)
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] ${
                              p.inventory < 15 
                                ? 'bg-rose-950/40 text-rose-400 border border-rose-900/20 animate-pulse' 
                                : 'bg-slate-800 text-slate-300'
                            }`}>
                              {p.inventory}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] ${
                              p.status === 'Active' 
                                ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' 
                                : p.status === 'Draft' 
                                  ? 'bg-amber-950/40 text-amber-400 border border-amber-900/20' 
                                  : 'bg-slate-850 text-slate-500'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          {!isViewer && (
                            <td className="px-6 py-4 text-right">
                              <div className="flex justify-end gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                                <button
                                  onClick={() => openEditModal(p)}
                                  className="p-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/30 text-indigo-400 hover:text-indigo-300 transition-all"
                                  title="Edit product bounds"
                                >
                                  <Edit className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => handleDelete(p.id)}
                                  className="p-1.5 rounded-lg border border-slate-800 hover:border-rose-900 bg-slate-950/30 text-rose-400 hover:text-rose-300 transition-all"
                                  title="Delete product"
                                >
                                  <Trash className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </td>
                          )}
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Mobile Card View */}
              <div className="grid grid-cols-1 gap-4 p-4 md:hidden">
                {paginatedProducts.map((p) => {
                  const currentMargin = Math.round(((p.currentPrice - p.costPrice) / p.currentPrice) * 100);
                  return (
                    <div key={p.id} className="p-4 rounded-xl border border-slate-800 bg-slate-950/20 space-y-3.5 text-left">
                      <div className="flex justify-between items-start gap-2">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-500 font-bold block">{p.sku}</span>
                          <span className="text-sm font-bold text-slate-200 block truncate max-w-[200px]">{p.name}</span>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{p.categoryName} • {p.brand}</span>
                        </div>
                        <span className={`inline-block px-2 py-0.5 rounded-full font-bold text-[9px] ${
                          p.status === 'Active' 
                            ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/20' 
                            : p.status === 'Draft' 
                              ? 'bg-amber-950/40 text-amber-400 border border-amber-900/20' 
                              : 'bg-slate-850 text-slate-500'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-900/60">
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Cost Price</span>
                          <span className="text-slate-300 font-medium">₹{p.costPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Selling Price</span>
                          <span className="text-indigo-400 font-bold">₹{p.currentPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Min / Max Bounds</span>
                          <span className="text-slate-400">₹{p.minPrice.toFixed(2)} - ₹{p.maxPrice.toFixed(2)}</span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Target Margin</span>
                          <span className="text-slate-300 font-medium">{p.targetMargin}%</span>
                          <span className={`text-[9px] font-bold block ${currentMargin >= p.targetMargin ? 'text-emerald-400' : 'text-rose-400'}`}>
                            (Actual: {currentMargin}%)
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500 text-[10px] uppercase font-bold block">Stock Inventory</span>
                          <span className={`inline-block px-2 py-0.5 rounded font-bold text-[10px] mt-0.5 ${
                            p.inventory < 15 
                              ? 'bg-rose-950/40 text-rose-400 border border-rose-900/20 animate-pulse' 
                              : 'bg-slate-800 text-slate-300'
                          }`}>
                            {p.inventory}
                          </span>
                        </div>
                      </div>

                      {!isViewer && (
                        <div className="flex justify-end gap-2 pt-2 border-t border-slate-900/60">
                          <button 
                            onClick={() => openEditModal(p)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-slate-700 bg-slate-950/30 text-indigo-400 text-xs font-semibold cursor-pointer"
                          >
                            <Edit className="w-3.5 h-3.5" />
                            <span>Edit</span>
                          </button>
                          <button 
                            onClick={() => handleDelete(p.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-slate-800 hover:border-rose-900 bg-slate-950/30 text-rose-400 text-xs font-semibold cursor-pointer"
                          >
                            <Trash className="w-3.5 h-3.5" />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Pagination controls */}
              {totalPages > 1 && (
                <div className="flex items-center justify-between border-t border-slate-800/80 p-4 bg-slate-950/20">
                  <span className="text-xs text-slate-400">
                    Page {currentPage} of {totalPages} ({filteredProducts.length} items)
                  </span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`w-7 h-7 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                          page === currentPage
                            ? 'bg-indigo-600 text-white shadow-md'
                            : 'border border-slate-800 text-slate-400 hover:bg-slate-950'
                        }`}
                      >
                        {page}
                      </button>
                    ))}
                    <button
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="p-1.5 rounded-lg border border-slate-800 bg-slate-950 text-slate-400 hover:bg-slate-900 disabled:opacity-40 disabled:cursor-not-allowed transition-all cursor-pointer"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              )}
            </>
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add Product to Catalog</h3>
              <button 
                onClick={async () => {
                  if ((window as any)._html5QrcodeScanner) {
                    try {
                      await (window as any)._html5QrcodeScanner.stop();
                    } catch (e) {}
                    (window as any)._html5QrcodeScanner = null;
                  }
                  setShowAddModal(false);
                }} 
                className="p-1 rounded hover:bg-slate-800 text-slate-400 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleCreate} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Product SKU</label>
                  <div className="relative flex items-center">
                    <input
                      ref={addSkuInputRef}
                      type="text"
                      required
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="PP-EL-004"
                      className="w-full pl-3.5 pr-10 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={async () => {
                        try {
                          // Toggle scanner state
                          if ((window as any)._html5QrcodeScanner) {
                            const Q = (window as any)._html5QrcodeScanner;
                            try {
                              Q.stop();
                              Q.offDetected();
                            } catch (e) {}
                            (window as any)._html5QrcodeScanner = null;
                            setIsTorchOn(false);
                            const scanContainer = document.getElementById('sku-qr-reader-wrapper');
                            if (scanContainer) {
                              scanContainer.style.display = 'none';
                              scanContainer.classList.add('hidden');
                            }
                            return;
                          }

                          const scanContainer = document.getElementById('sku-qr-reader-wrapper');
                          if (scanContainer) {
                            scanContainer.style.display = 'flex';
                            scanContainer.classList.remove('hidden');
                            
                            const Quagga = (await import('@ericblade/quagga2')).default;
                            Quagga.init({
                              inputStream: {
                                type: "LiveStream",
                                target: document.querySelector("#sku-qr-reader") as HTMLElement,
                                constraints: {
                                  facingMode: "environment",
                                  width: { min: 640, ideal: 3840 },
                                  height: { min: 480, ideal: 2160 },
                                },
                              },
                              numOfWorkers: typeof navigator !== 'undefined' ? navigator.hardwareConcurrency || 4 : 4,
                              decoder: {
                                readers: [
                                  "upc_reader",
                                  "upc_e_reader",
                                  "ean_reader",
                                  "ean_reader",
                                  "code_128_reader"
                                ],
                                multiple: false
                              },
                              locate: true,
                              locator: {
                                halfSample: true,
                                patchSize: "medium"
                              }
                            }, (err) => {
                              if (err) {
                                alert(`Camera access failed: ${err.message || err}`);
                                return;
                              }
                              Quagga.start();

                              // Apply hardware zoom and torch fix on mobile devices
                              setTimeout(() => {
                                try {
                                  const video = document.querySelector("#sku-qr-reader video") as HTMLVideoElement;
                                  if (video && video.srcObject) {
                                    const stream = video.srcObject as MediaStream;
                                    const track = stream.getVideoTracks()[0];
                                    if (track && typeof track.getCapabilities === 'function') {
                                      const capabilities = track.getCapabilities() as any;
                                      
                                      const constraints: any = {};
                                      if (capabilities.zoom) {
                                        const maxZoom = capabilities.zoom.max || 1;
                                        const minZoom = capabilities.zoom.min || 1;
                                        constraints.zoom = maxZoom > 1 ? Math.min(maxZoom, 2) : minZoom;
                                      }
                                      
                                      if (capabilities.torch) {
                                        constraints.torch = true;
                                        setIsTorchOn(true);
                                      }
                                      
                                      track.applyConstraints({
                                        advanced: [constraints]
                                      });
                                    }
                                  }
                                } catch (zoomErr) {
                                  console.warn("Failed to apply hardware zoom/torch:", zoomErr);
                                }
                              }, 800);
                            });

                            (window as any)._html5QrcodeScanner = Quagga;

                            Quagga.onDetected(async (result) => {
                              if (result && result.codeResult && result.codeResult.code) {
                                const decodedText = result.codeResult.code;
                                const cleanText = (decodedText.length === 13 && decodedText.startsWith('0')) ? decodedText.substring(1) : decodedText;
                                setSku(cleanText);
                                try {
                                  Quagga.stop();
                                  Quagga.offDetected();
                                } catch (e) {}
                                (window as any)._html5QrcodeScanner = null;
                                setIsTorchOn(false);
                                if (scanContainer) {
                                  scanContainer.style.display = 'none';
                                  scanContainer.classList.add('hidden');
                                }
                              }
                            });
                          }
                        } catch (err: any) {
                          alert(`Camera access failed: ${err.message || err}`);
                        }
                      }}
                      className="absolute right-2 p-1.5 rounded-lg text-slate-400 hover:text-indigo-400 hover:bg-slate-850 transition-all cursor-pointer"
                      title="Scan barcode with camera"
                    >
                      <Scan className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  {/* Modal Scanner Backdrop and Box */}
                  <div 
                    id="sku-qr-reader-wrapper"
                    className="hidden fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
                  >
                    <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-semibold text-slate-200">Scan SKU Barcode</h3>
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleTorch("#sku-qr-reader")}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer flex items-center justify-center ${
                              isTorchOn 
                                ? 'bg-amber-500/20 border-amber-500/40 text-amber-400' 
                                : 'bg-slate-950/40 border-transparent text-slate-400 hover:text-white hover:border-slate-700'
                            }`}
                            title={isTorchOn ? "Turn off Flash" : "Turn on Flash"}
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if ((window as any)._html5QrcodeScanner) {
                                try {
                                  const Q = (window as any)._html5QrcodeScanner;
                                  Q.stop();
                                  Q.offDetected();
                                } catch (e) {}
                                (window as any)._html5QrcodeScanner = null;
                              }
                              setIsTorchOn(false);
                              const wrapper = document.getElementById('sku-qr-reader-wrapper');
                              if (wrapper) {
                                wrapper.style.display = 'none';
                                wrapper.classList.add('hidden');
                              }
                            }}
                            className="p-1.5 hover:bg-slate-850 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer flex items-center justify-center border border-transparent hover:border-slate-700 bg-slate-950/40"
                            title="Close Scanner"
                          >
                            <X className="w-5 h-5" />
                          </button>
                        </div>
                      </div>
                      
                      <div 
                        id="sku-qr-reader" 
                        className="w-full overflow-hidden rounded-xl border border-slate-850 bg-black aspect-square relative"
                      />
                    </div>
                  </div>
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Product Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="SmartWatch Plus"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    placeholder="BrandName"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-400 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="new">+ Add New Category...</option>
                  </select>
                </div>

                {categoryId === 'new' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">New Category Name</label>
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Beverages, Apparel"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice || ''}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Current Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentPrice || ''}
                    onChange={(e) => setCurrentPrice(Number(e.target.value))}
                    placeholder="0.00"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Minimum Price Boundary (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minPrice || ''}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    placeholder="Floor boundary"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Maximum Price Boundary (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={maxPrice || ''}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    placeholder="Ceiling boundary"
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Margin (%)</label>
                  <input
                    type="number"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Inventory Quantity</label>
                  <input
                    type="number"
                    value={inventory}
                    onChange={(e) => setInventory(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Seasonal Profile</label>
                  <select
                    value={seasonalRelevance}
                    onChange={(e) => setSeasonalRelevance(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-400 focus:outline-none"
                  >
                    <option value="All Year">All Year</option>
                    <option value="Summer">Summer</option>
                    <option value="Winter">Winter</option>
                    <option value="Spring">Spring</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  disabled={creatingProduct}
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950/40 text-slate-400 hover:text-slate-200 disabled:opacity-50 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={creatingProduct}
                  className="px-4 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold disabled:opacity-50 transition-all"
                >
                  Add Product
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Category Modal */}
      {showCategoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Add New Category</h3>
              <button onClick={() => { setShowCategoryModal(false); setCategoryError(''); }} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>

            {categoryError && (
              <div className="p-2.5 rounded-lg bg-red-950/40 border border-red-900/50 text-xs text-red-300">
                {categoryError}
              </div>
            )}

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!newCategoryName.trim()) return;
                setCategoryError('');
                try {
                  const res = await fetch('/api/categories', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                      name: newCategoryName.trim(),
                      description: newCategoryDesc.trim() || null
                    })
                  });
                  const data = await res.json();
                  if (res.ok) {
                    setShowCategoryModal(false);
                    setNewCategoryName('');
                    setNewCategoryDesc('');
                    setCategoryError('');
                    fetchData();
                  } else {
                    setCategoryError(data.error || 'Failed to create category');
                  }
                } catch (err: any) {
                  console.error('Create category error:', err);
                  setCategoryError('Network error. Please try again.');
                }
              }}
              className="space-y-4"
            >
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Category Name *</label>
                <input
                  type="text"
                  required
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  placeholder="e.g. Beverages, Apparel, Home Decor"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-600 transition-all"
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Description (optional)</label>
                <input
                  type="text"
                  value={newCategoryDesc}
                  onChange={(e) => setNewCategoryDesc(e.target.value)}
                  placeholder="e.g. Clothing, footwear, and fashion accessories"
                  className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none focus:border-indigo-600 transition-all"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => { setShowCategoryModal(false); setCategoryError(''); }}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button type="submit" className="px-4 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all">
                  Add Category
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Edit Modal */}
      {showEditModal && selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-base font-bold text-white">Update Product Boundaries & Cost</h3>
              <button onClick={() => setShowEditModal(false)} className="p-1 rounded hover:bg-slate-800 text-slate-400">
                <X className="w-4 h-4" />
              </button>
            </div>
            
            <form onSubmit={handleEdit} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Product SKU</label>
                  <input
                    type="text"
                    disabled
                    value={sku}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-500 cursor-not-allowed focus:outline-none"
                  />
                </div>
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Product Name</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Brand</label>
                  <input
                    type="text"
                    value={brand}
                    onChange={(e) => setBrand(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Category</label>
                  <select
                    value={categoryId}
                    onChange={(e) => setCategoryId(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-400 focus:outline-none"
                  >
                    {categories.map(c => (
                      <option key={c.id} value={c.id}>{c.name}</option>
                    ))}
                    <option value="new">+ Add New Category...</option>
                  </select>
                </div>

                {categoryId === 'new' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase">New Category Name</label>
                    <input
                      type="text"
                      required
                      value={customCategory}
                      onChange={(e) => setCustomCategory(e.target.value)}
                      placeholder="e.g. Beverages, Apparel"
                      className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                    />
                  </div>
                )}

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Cost Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={costPrice}
                    onChange={(e) => setCostPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Current Selling Price (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    value={currentPrice}
                    onChange={(e) => setCurrentPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Minimum Price Boundary (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={minPrice}
                    onChange={(e) => setMinPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Maximum Price Boundary (₹)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={maxPrice}
                    onChange={(e) => setMaxPrice(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Target Margin (%)</label>
                  <input
                    type="number"
                    value={targetMargin}
                    onChange={(e) => setTargetMargin(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Inventory Quantity</label>
                  <input
                    type="number"
                    value={inventory}
                    onChange={(e) => setInventory(Number(e.target.value))}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-200 focus:outline-none"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Seasonal Profile</label>
                  <select
                    value={seasonalRelevance}
                    onChange={(e) => setSeasonalRelevance(e.target.value)}
                    className="w-full px-3.5 py-2 text-xs rounded-xl border border-slate-800 bg-slate-950 text-slate-400 focus:outline-none"
                  >
                    <option value="All Year">All Year</option>
                    <option value="Summer">Summer</option>
                    <option value="Winter">Winter</option>
                    <option value="Spring">Spring</option>
                    <option value="Fall">Fall</option>
                  </select>
                </div>
              </div>

              <div className="flex justify-end gap-2.5 pt-4 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 text-xs rounded-xl border border-slate-850 bg-slate-950/40 text-slate-400 hover:text-slate-200 transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-semibold transition-all"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}



    </div>
  );
}
