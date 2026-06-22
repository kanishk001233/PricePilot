'use client';

import React, { useState, useEffect, useRef } from 'react';
import { 
  Scan, 
  Search, 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  Check, 
  AlertCircle, 
  Info,
  Package,
  TrendingUp,
  Tag,
  Archive,
  X
} from 'lucide-react';
import Link from 'next/link';
import { useTheme } from '@/lib/ThemeProvider';

export default function HomePage() {
  const { productsData, loadingProducts, preloadProducts, showAlert } = useTheme();

  const products = productsData;
  const loading = products.length === 0 && loadingProducts;
  
  // Search and Scanner States
  const [searchQuery, setSearchQuery] = useState('');
  const [barcodeInput, setBarcodeInput] = useState('');
  const [scannedMessage, setScannedMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
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
  
  // Cart State
  const [cart, setCart] = useState<any[]>([]);
  const [checkingOut, setCheckingOut] = useState(false);
  const [checkoutSuccess, setCheckoutSuccess] = useState(false);
  
  // Customer details States
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerEmail, setCustomerEmail] = useState('');
  const [lastInvoice, setLastInvoice] = useState<any>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  
  // Hidden Scanner input ref for key scanning listening
  const barcodeInputRef = useRef<HTMLInputElement>(null);

  // Fetch products
  const fetchProducts = async () => {
    try {
      await preloadProducts(true);
    } catch (err) {
      console.error('Error fetching products:', err);
    }
  };

  useEffect(() => {
    if (products.length === 0) {
      fetchProducts();
    }
    // Set cursor focus by default for external scanner integrations
    barcodeInputRef.current?.focus();

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
        barcodeInputRef.current?.focus();
      }, 0);
    };

    document.addEventListener("click", keepFocus);

    return () => {
      document.removeEventListener("click", keepFocus);
    };
  }, []);

  // Keyboard Scanner listener (simulating barcode hardware scanner, which dumps text and presses Enter)
  const handleBarcodeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!barcodeInput.trim()) return;

    // Search product by exact match on SKU or Barcode
    const match = products.find(
      p => p.sku.toLowerCase() === barcodeInput.trim().toLowerCase()
    );

    if (match) {
      addToCart(match);
      setScannedMessage({ 
        type: 'success', 
        text: `Scanned: ${match.name} (SKU: ${match.sku}) added to cart.` 
      });
      // Flash message for 3 seconds
      setTimeout(() => setScannedMessage(null), 3000);
    } else {
      setScannedMessage({ 
        type: 'error', 
        text: `No product found matching barcode/SKU: "${barcodeInput}"` 
      });
      setTimeout(() => setScannedMessage(null), 4000);
    }

    setBarcodeInput('');
    // Refocus scanner input
    barcodeInputRef.current?.focus();
  };

  // Cart operations
  const addToCart = (product: any) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        // Limit to available stock
        if (existing.quantity >= product.inventory) {
          setScannedMessage({
            type: 'error',
            text: `Cannot add more. Only ${product.inventory} units available in inventory.`
          });
          setTimeout(() => setScannedMessage(null), 3000);
          return prev;
        }
        return prev.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.id === productId) {
          const newQty = item.quantity + delta;
          if (newQty <= 0) return null;
          // Verify stock limit
          if (newQty > item.inventory) {
            setScannedMessage({
              type: 'error',
              text: `Only ${item.inventory} units available in stock.`
            });
            setTimeout(() => setScannedMessage(null), 3000);
            return item;
          }
          return { ...item, quantity: newQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.id !== productId));
  };

  // Checkout transaction execution
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setCheckingOut(true);
    setCheckoutSuccess(false);

    try {
      const itemsListForInvoice = [...cart];
      
      // Process sales sequentially or grouped
      for (const item of cart) {
        const res = await fetch('/api/products/sell', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            productId: item.id,
            quantity: item.quantity,
            customerName: customerName || undefined,
            customerPhone: customerPhone || undefined,
            customerEmail: customerEmail || undefined
          })
        });

        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || `Checkout failed for item ${item.name}`);
        }
      }

      // Generate invoice receipt details
      const invoiceData = {
        invoiceNumber: `INV-${Date.now().toString().substring(5)}`,
        date: new Date().toLocaleString(),
        customer: {
          name: customerName || 'Walk-in Customer',
          phone: customerPhone || 'N/A',
          email: customerEmail || 'N/A'
        },
        items: itemsListForInvoice,
        total: cartTotal
      };

      setLastInvoice(invoiceData);
      setCart([]);
      setCustomerName('');
      setCustomerPhone('');
      setCustomerEmail('');
      setShowCustomerModal(false);
      setCheckoutSuccess(true);
      await fetchProducts(); // Reload latest inventory

    } catch (err: any) {
      showAlert('Checkout Failed', err.message || 'An error occurred during checkout.', 'error');
    } finally {
      setCheckingOut(false);
    }
  };

  // Filtered catalog
  const filteredProducts = products.filter(p => {
    const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          p.sku.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          p.brand.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesSearch;
  });

  const cartTotal = cart.reduce((sum, item) => sum + (item.currentPrice * item.quantity), 0);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-white sm:text-3xl">Point of Sale (POS)</h1>
          <p className="text-slate-400 text-sm mt-0.5">Scan product barcodes, manage checkout carts, and update inventory levels instantly.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Barcode Scanner Input Box */}
        <div className="lg:col-span-8 order-1 lg:order-none bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-lg space-y-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-indigo-950/60 text-indigo-400 border border-indigo-900/30">
                <Scan className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">Barcode Scanner</h3>
                <p className="text-slate-500 text-xs">Simulate scanner inputs. Type SKU or barcode identifier and hit Enter.</p>
              </div>
            </div>

            <form onSubmit={handleBarcodeSubmit} className="flex gap-2">
              <div className="relative flex-1 flex items-center">
                <input
                  ref={barcodeInputRef}
                  type="text"
                  placeholder="Scan SKU (e.g. ELEC-S23-ULTRA)"
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  className="w-full h-11 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl pl-4 pr-10 text-sm text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                  autoFocus
                />
                 <button
                  type="button"
                  onClick={async () => {
                    try {
                      const Quagga = (await import('@ericblade/quagga2')).default;
                      
                      // Toggle scanner state
                      if ((window as any)._homeHtml5QrcodeScanner) {
                        try {
                          const Q = (window as any)._homeHtml5QrcodeScanner;
                          Q.stop();
                          Q.offDetected();
                        } catch (e) {}
                        (window as any)._homeHtml5QrcodeScanner = null;
                        setIsTorchOn(false);
                        const scanContainer = document.getElementById('home-qr-reader-wrapper');
                        if (scanContainer) {
                          scanContainer.style.display = 'none';
                          scanContainer.classList.add('hidden');
                        }
                        return;
                      }

                      const scanContainer = document.getElementById('home-qr-reader-wrapper');
                      if (scanContainer) {
                        scanContainer.style.display = 'flex';
                        scanContainer.classList.remove('hidden');
                      }

                      // Configure Quagga
                      Quagga.init({
                        inputStream: {
                          type: "LiveStream",
                          target: document.querySelector("#home-qr-reader") as HTMLElement,
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
                            const video = document.querySelector("#home-qr-reader video") as HTMLVideoElement;
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

                      (window as any)._homeHtml5QrcodeScanner = Quagga;

                      Quagga.onDetected(async (result) => {
                        if (result && result.codeResult && result.codeResult.code) {
                          const decodedText = result.codeResult.code;
                          const cleanText = (decodedText.length === 13 && decodedText.startsWith('0')) ? decodedText.substring(1) : decodedText;
                          
                          setBarcodeInput(cleanText);
                          
                          // Auto trigger submission for external/camera scanners to avoid double clicks
                          setTimeout(() => {
                            const event = new Event('submit', { cancelable: true, bubbles: true });
                            document.querySelector('form')?.dispatchEvent(event);
                          }, 50);

                          try {
                            Quagga.stop();
                            Quagga.offDetected();
                          } catch (e) {}
                          (window as any)._homeHtml5QrcodeScanner = null;
                          setIsTorchOn(false);
                          const scanContainer = document.getElementById('home-qr-reader-wrapper');
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
              <button
                type="submit"
                className="h-11 px-5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-xs font-bold text-white transition-all shadow-md cursor-pointer"
              >
                Enter Scan
              </button>
            </form>

            {/* Modal Scanner Backdrop and Box */}
            <div 
              id="home-qr-reader-wrapper"
              className="hidden fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-sm"
            >
              <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-slate-200">Scan UPC Barcode</h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => toggleTorch("#home-qr-reader")}
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
                        if ((window as any)._homeHtml5QrcodeScanner) {
                          try {
                            const Q = (window as any)._homeHtml5QrcodeScanner;
                            Q.stop();
                            Q.offDetected();
                          } catch (e) {}
                          (window as any)._homeHtml5QrcodeScanner = null;
                        }
                        setIsTorchOn(false);
                        const wrapper = document.getElementById('home-qr-reader-wrapper');
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
                  id="home-qr-reader" 
                  className="w-full overflow-hidden rounded-xl border border-slate-850 bg-black aspect-square relative"
                />
              </div>
            </div>

            {scannedMessage && (
              <div className={`p-3 rounded-lg border text-xs flex gap-2 items-center animate-in fade-in slide-in-from-top-2 duration-200 ${
                scannedMessage.type === 'success' 
                  ? 'bg-emerald-950/20 border-emerald-900/30 text-emerald-400' 
                  : 'bg-rose-950/20 border-rose-900/30 text-rose-400'
              }`}>
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{scannedMessage.text}</span>
              </div>
            )}
          </div>

          {/* Right Column: Checkout Cart */}
          <div className="lg:col-span-4 lg:row-span-2 order-2 lg:order-none flex flex-col h-full">
            <div className="bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-lg flex flex-col h-full min-h-[450px]">
              <div className="flex justify-between items-center border-b border-slate-850 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <ShoppingCart className="w-5 h-5 text-indigo-400" />
                  <h3 className="text-base font-bold text-white">Checkout Cart</h3>
                </div>
                <span className="px-2 py-0.5 rounded-full bg-slate-950 border border-slate-800 text-[10px] font-bold text-slate-400">
                  {cart.reduce((sum, item) => sum + item.quantity, 0)} Items
                </span>
              </div>

              {/* Cart Items list */}
              <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[300px]">
                {cart.length === 0 ? (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-slate-600 space-y-2">
                    <ShoppingCart className="w-10 h-10 stroke-[1.5]" />
                    <span className="text-xs">Your sales cart is empty</span>
                  </div>
                ) : (
                  cart.map((item) => (
                    <div key={item.id} className="p-3 rounded-lg border border-slate-850/60 bg-slate-950/20 flex justify-between items-center gap-3">
                      <div className="min-w-0 flex-1">
                        <h4 className="text-xs font-semibold text-slate-200 truncate">{item.name}</h4>
                        <p className="text-[10px] text-slate-500 mt-0.5">₹{item.currentPrice.toFixed(2)} each</p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-slate-800 rounded-lg bg-slate-950 overflow-hidden">
                          <button 
                            onClick={() => updateQuantity(item.id, -1)}
                            className="p-1 hover:bg-slate-900 text-slate-400 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="px-2 text-xs font-bold text-slate-200">{item.quantity}</span>
                          <button 
                            onClick={() => updateQuantity(item.id, 1)}
                            className="p-1 hover:bg-slate-900 text-slate-400 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button 
                          onClick={() => removeFromCart(item.id)}
                          className="p-1.5 rounded-lg border border-slate-850/60 text-slate-500 hover:text-rose-400 hover:border-rose-950/40 bg-slate-950/20 hover:bg-rose-950/10 transition-colors cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Total & Checkout button */}
              <div className="border-t border-slate-850 pt-4 mt-4 space-y-4">
                
                <div className="flex justify-between items-center text-xs font-semibold text-slate-400">
                  <span>Subtotal:</span>
                  <span className="text-white text-sm font-bold">₹{cartTotal.toFixed(2)}</span>
                </div>

                {checkoutSuccess && (
                  <div className="p-3 rounded-lg border border-emerald-950 bg-emerald-950/20 text-emerald-400 text-xs flex gap-2 items-center animate-in fade-in duration-200">
                    <Check className="w-4 h-4 shrink-0" />
                    <span>Sales transaction processed and inventory updated successfully!</span>
                  </div>
                )}

                <button
                  onClick={() => setShowCustomerModal(true)}
                  disabled={cart.length === 0}
                  className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-md shadow-indigo-950/50 hover:shadow-indigo-900/40 active:scale-95 cursor-pointer flex items-center justify-center gap-2"
                >
                  <Check className="w-4 h-4" />
                  <span>Process Checkout & Sell</span>
                </button>
              </div>
            </div>
          </div>

          {/* Product Catalog search */}
          <div className="lg:col-span-8 order-3 lg:order-none bg-slate-900/40 border border-slate-800/80 rounded-xl p-6 shadow-lg space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h3 className="text-base font-bold text-white">Product Catalog</h3>
                <p className="text-slate-500 text-xs mt-0.5">Click catalog items below to manually add them to checkout.</p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Search catalog..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full h-10 bg-slate-950 border border-slate-850 focus:border-indigo-500 rounded-lg pl-9 pr-4 text-xs text-slate-200 placeholder-slate-600 focus:outline-none transition-all"
                />
              </div>
            </div>

            {loading ? (
              <div className="text-center py-12 text-slate-500 text-xs">Loading catalog feeds...</div>
            ) : filteredProducts.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs border border-dashed border-slate-850 rounded-xl">
                No matching active catalog items found.
              </div>
            ) : (() => {
              // Sort products alphabetically
              const sorted = [...filteredProducts].sort((a, b) => a.name.localeCompare(b.name));
              
              // Group by first letter
              const groups: Record<string, any[]> = {};
              sorted.forEach(p => {
                const firstLetter = p.name.trim().charAt(0).toUpperCase() || '#';
                const key = /^[A-Z]$/.test(firstLetter) ? firstLetter : '#';
                if (!groups[key]) {
                  groups[key] = [];
                }
                groups[key].push(p);
              });

              // Sort keys so A is first, followed by B, etc.
              const sortedKeys = Object.keys(groups).sort((a, b) => {
                if (a === '#') return 1;
                if (b === '#') return -1;
                return a.localeCompare(b);
              });

              return (
                <div className="space-y-6">
                  {sortedKeys.map(letter => (
                    <div key={letter} className="space-y-3">
                      {/* Alphabetical hint section header */}
                      <div className="flex items-center gap-2 border-b border-slate-800/80 pb-1 mt-2">
                        <span className="text-sm font-black text-indigo-400 bg-indigo-950/40 border border-indigo-900/30 w-6 h-6 rounded-lg flex items-center justify-center">
                          {letter}
                        </span>
                        <div className="h-[1px] flex-1 bg-slate-850/60" />
                      </div>
                      
                      {/* Products matching this letter */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {groups[letter].map((p) => {
                          const outOfStock = p.inventory <= 0;
                          const cartItem = cart.find(item => item.id === p.id);
                          return (
                            <div
                              key={p.id}
                              onClick={() => {
                                if (outOfStock) return;
                                if (!cartItem) addToCart(p);
                              }}
                              className={`p-4 rounded-xl border transition-all text-left space-y-3 ${
                                outOfStock 
                                  ? 'bg-slate-950/20 border-slate-900 opacity-60 pointer-events-none' 
                                  : cartItem
                                    ? 'bg-slate-50 dark:bg-slate-950/30 border-blue-500 shadow-md shadow-blue-500/10'
                                    : 'bg-slate-50/90 dark:bg-slate-950/10 border-blue-200 dark:border-blue-900/40 hover:border-blue-500 hover:bg-slate-100 dark:hover:bg-slate-950/30 hover:shadow-md hover:shadow-blue-500/5 cursor-pointer'
                              }`}
                            >
                              <div>
                                <div className="flex justify-between items-start gap-2">
                                  <span className="text-[9px] text-slate-500 dark:text-slate-500 font-bold tracking-wide uppercase">{p.sku}</span>
                                  <span className={`text-[9px] font-bold px-1.5 py-0.5 rounded ${
                                    outOfStock 
                                      ? 'bg-rose-950/40 text-rose-400 border border-rose-900/10' 
                                      : p.inventory < 15 
                                        ? 'bg-amber-950/40 text-amber-400 border border-amber-900/10'
                                        : 'bg-emerald-950/40 text-emerald-400 border border-emerald-900/10'
                                  }`}>
                                    {outOfStock ? 'Out of Stock' : `${p.inventory} left`}
                                  </span>
                                </div>
                                <h4 className="text-xs font-bold text-slate-800 dark:text-slate-200 line-clamp-1 mt-1">{p.name}</h4>
                              </div>

                              <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-900/60 pt-2.5">
                                <div>
                                  <span className="text-[9px] text-slate-500 dark:text-slate-500 uppercase block font-semibold">Selling Price</span>
                                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">₹{p.currentPrice.toFixed(2)}</span>
                                </div>
                                
                                {cartItem ? (
                                  <div className="flex items-center gap-3 bg-blue-600 text-white px-3 py-1.5 rounded-lg text-xs font-bold shadow-sm shadow-blue-950/40">
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateQuantity(p.id, -1);
                                      }}
                                      className="hover:text-slate-200 transition-colors px-1 text-sm select-none cursor-pointer font-bold"
                                    >
                                      -
                                    </button>
                                    <span className="min-w-[12px] text-center">{cartItem.quantity}</span>
                                    <button
                                      type="button"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        updateQuantity(p.id, 1);
                                      }}
                                      className="hover:text-slate-200 transition-colors px-1 text-sm select-none cursor-pointer font-bold"
                                    >
                                      +
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      addToCart(p);
                                    }}
                                    className="bg-indigo-600 hover:bg-indigo-500 text-white px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer"
                                  >
                                    ADD
                                  </button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>



      </div>

      {/* Invoice modal overlay */}
      {lastInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Sale Invoice Generated</h3>
              <button 
                onClick={() => setLastInvoice(null)} 
                className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Close
              </button>
            </div>

            {/* Printable Receipt layout */}
            <div id="pos-invoice-receipt" className="p-4 rounded-xl border border-slate-800 bg-slate-950 text-slate-300 font-mono text-xs space-y-4">
              <div className="text-center border-b border-dashed border-slate-800 pb-3">
                <h4 className="font-bold text-white text-sm">PRICEPILOT STORE</h4>
                <p className="text-[10px] text-slate-500 mt-0.5">Automated Intelligence Retail POS</p>
                <p className="text-[10px] text-slate-500 mt-1">Invoice: {lastInvoice.invoiceNumber}</p>
                <p className="text-[10px] text-slate-500">{lastInvoice.date}</p>
              </div>

              <div className="space-y-1 text-[11px] border-b border-dashed border-slate-800 pb-3">
                <span className="text-slate-400 uppercase font-bold block text-[10px]">Customer:</span>
                <p className="text-white">{lastInvoice.customer.name}</p>
                <p className="text-slate-400">Phone: {lastInvoice.customer.phone}</p>
                <p className="text-slate-400">Gmail: {lastInvoice.customer.email}</p>
              </div>

              <div className="space-y-2 border-b border-dashed border-slate-800 pb-3">
                <div className="flex justify-between text-slate-400 font-bold text-[10px] uppercase">
                  <span>Item</span>
                  <span>Qty x Price</span>
                </div>
                {lastInvoice.items.map((item: any, idx: number) => (
                  <div key={idx} className="flex justify-between items-start gap-3">
                    <span className="truncate max-w-[180px]">{item.name}</span>
                    <span className="shrink-0">{item.quantity} x ₹{item.currentPrice.toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="flex justify-between items-center text-sm font-bold text-white">
                <span>Total:</span>
                <span>₹{lastInvoice.total.toFixed(2)}</span>
              </div>

              <div className="text-center text-[9px] text-slate-600 pt-2 border-t border-slate-900">
                Thank you for shopping with PricePilot!
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Customer details modal overlay */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex justify-between items-center pb-2 border-b border-slate-800">
              <h3 className="text-sm font-bold text-white uppercase tracking-wider">Customer Details</h3>
              <button 
                onClick={() => setShowCustomerModal(false)} 
                className="px-2.5 py-1 text-[10px] font-bold text-slate-400 hover:text-white hover:bg-slate-800 border border-slate-800 rounded-lg transition-colors cursor-pointer"
              >
                Cancel
              </button>
            </div>

            <div className="space-y-3">
              <div className="space-y-1 text-left">
                <label className="text-[10px] font-bold text-slate-400 uppercase">Customer Name</label>
                <input
                  type="text"
                  placeholder="e.g. John Doe"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="w-full h-11 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-200 placeholder-slate-650 focus:outline-none transition-colors"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Customer Phone</label>
                  <input
                    type="text"
                    placeholder="e.g. +91 98765 43210"
                    value={customerPhone}
                    onChange={(e) => setCustomerPhone(e.target.value)}
                    className="w-full h-11 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-200 placeholder-slate-650 focus:outline-none transition-colors"
                  />
                </div>

                <div className="space-y-1 text-left">
                  <label className="text-[10px] font-bold text-slate-400 uppercase">Customer Gmail</label>
                  <input
                    type="email"
                    placeholder="e.g. client@gmail.com"
                    value={customerEmail}
                    onChange={(e) => setCustomerEmail(e.target.value)}
                    className="w-full h-11 bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-200 placeholder-slate-650 focus:outline-none transition-colors"
                  />
                </div>
              </div>
            </div>

            <button
              onClick={handleCheckout}
              disabled={checkingOut}
              className="w-full h-11 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-xs font-bold text-white transition-all shadow-md cursor-pointer flex items-center justify-center gap-2"
            >
              {checkingOut ? (
                <div className="w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Finish Checkout & Sell</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
