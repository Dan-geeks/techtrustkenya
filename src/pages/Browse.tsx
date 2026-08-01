import { useEffect, useState } from "react";
import { Link } from "react-router-dom";

const pageHtml = `
<main class="flex-grow w-full max-w-container-max mx-auto px-6 md:px-12 pt-8 md:pt-12 pb-16 md:pb-24 flex flex-col md:flex-row gap-8 md:gap-12">
  <!-- Filter Sidebar -->
  <aside class="w-full md:w-64 flex-shrink-0 flex flex-col gap-6">
    <!-- Mobile Search & Filter Toggle (Visible only on mobile) -->
    <div class="md:hidden flex flex-col gap-4 mb-4">
      <div class="relative w-full">
        <span class="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
        <input class="w-full pl-10 pr-4 py-2.5 bg-surface-container-lowest border border-outline-variant rounded-xl font-body-md text-body-md" placeholder="Search electronics..." type="text"/>
      </div>
      <button class="flex items-center justify-center gap-2 bg-surface-container-low py-2.5 rounded-xl border border-outline-variant font-ui-label text-ui-label">
        <span class="material-symbols-outlined">tune</span> Filters
      </button>
    </div>

    <!-- Desktop Filters Wrapper -->
    <div class="hidden md:flex flex-col gap-8 sticky top-24">
      <div class="flex items-center justify-between pb-2 border-b border-outline-variant/30">
        <h2 class="font-body-md-bold text-lg text-on-surface font-bold">Filters</h2>
        <button class="font-ui-label text-xs text-secondary hover:underline font-semibold">Clear all</button>
      </div>

      <!-- Category -->
      <div class="flex flex-col gap-3">
        <h3 class="font-ui-label text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Category</h3>
        <div class="flex flex-col gap-2.5">
          <label class="flex items-center gap-3 cursor-pointer">
            <input checked="" class="rounded border-outline-variant text-primary-container focus:ring-primary-container w-4 h-4" type="checkbox"/>
            <span class="font-body-md text-sm text-on-surface">Laptops</span>
            <span class="ml-auto font-data-id text-xs text-outline">124</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input class="rounded border-outline-variant text-primary-container focus:ring-primary-container w-4 h-4" type="checkbox"/>
            <span class="font-body-md text-sm text-on-surface">Smartphones</span>
            <span class="ml-auto font-data-id text-xs text-outline">89</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input class="rounded border-outline-variant text-primary-container focus:ring-primary-container w-4 h-4" type="checkbox"/>
            <span class="font-body-md text-sm text-on-surface">Tablets</span>
            <span class="ml-auto font-data-id text-xs text-outline">45</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input class="rounded border-outline-variant text-primary-container focus:ring-primary-container w-4 h-4" type="checkbox"/>
            <span class="font-body-md text-sm text-on-surface">Components &amp; Accessories</span>
            <span class="ml-auto font-data-id text-xs text-outline">210</span>
          </label>
        </div>
      </div>

      <!-- Condition -->
      <div class="flex flex-col gap-3">
        <h3 class="font-ui-label text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Condition</h3>
        <div class="flex flex-col gap-2.5">
          <label class="flex items-center gap-3 cursor-pointer">
            <input class="rounded border-outline-variant text-primary-container focus:ring-primary-container w-4 h-4" type="checkbox"/>
            <span class="font-body-md text-sm text-on-surface">Brand New</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input checked="" class="rounded border-outline-variant text-primary-container focus:ring-primary-container w-4 h-4" type="checkbox"/>
            <span class="font-body-md text-sm text-on-surface">Refurbished - Grade A</span>
          </label>
          <label class="flex items-center gap-3 cursor-pointer">
            <input class="rounded border-outline-variant text-primary-container focus:ring-primary-container w-4 h-4" type="checkbox"/>
            <span class="font-body-md text-sm text-on-surface">Used - Good</span>
          </label>
        </div>
      </div>

      <!-- Price Range -->
      <div class="flex flex-col gap-3">
        <h3 class="font-ui-label text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Price Range (KES)</h3>
        <div class="flex items-center gap-2">
          <input class="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-data-id text-xs focus:border-primary-container focus:ring-0" placeholder="Min" type="number"/>
          <span class="text-outline">-</span>
          <input class="w-full px-3 py-2 bg-surface-container-lowest border border-outline-variant rounded-lg font-data-id text-xs focus:border-primary-container focus:ring-0" placeholder="Max" type="number"/>
        </div>
      </div>

      <!-- Location -->
      <div class="flex flex-col gap-3">
        <h3 class="font-ui-label text-xs text-on-surface-variant uppercase tracking-wider font-semibold">Location</h3>
        <div class="relative">
          <select class="w-full appearance-none bg-surface-container-lowest border border-outline-variant rounded-lg py-2.5 pl-3 pr-8 font-body-md text-sm focus:border-primary-container focus:ring-0 cursor-pointer">
            <option>All Locations</option>
            <option>Nairobi</option>
            <option>Mombasa</option>
            <option>Kisumu</option>
            <option>Nakuru</option>
          </select>
          <span class="material-symbols-outlined absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-outline">expand_more</span>
        </div>
      </div>
    </div>
  </aside>

  <!-- Main Product Grid Area -->
  <div class="flex-grow flex flex-col gap-8">
    <!-- Page Header & Active Filters -->
    <div class="flex flex-col gap-4">
      <div>
        <h1 class="font-display-h2 text-3xl font-bold text-on-surface mb-1">Browse Verified Marketplace</h1>
        <p class="text-sm text-on-surface-variant">Every purchase is protected by Float escrow until delivery confirmation.</p>
      </div>

      <div class="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 pt-2">
        <!-- Active Chips -->
        <div class="flex flex-wrap gap-2">
          <div class="flex items-center gap-1.5 px-3 py-1 bg-[#EEF2FF] rounded-full font-ui-label text-xs text-primary-container border border-[#adc6ff]">
            Laptops
            <button class="material-symbols-outlined text-[14px] hover:text-primary transition-colors">close</button>
          </div>
          <div class="flex items-center gap-1.5 px-3 py-1 bg-[#EEF2FF] rounded-full font-ui-label text-xs text-primary-container border border-[#adc6ff]">
            Refurbished - Grade A
            <button class="material-symbols-outlined text-[14px] hover:text-primary transition-colors">close</button>
          </div>
        </div>

        <!-- Sorting -->
        <div class="flex items-center gap-2 ml-auto">
          <span class="font-ui-label text-xs text-on-surface-variant">Sort by:</span>
          <select class="bg-transparent border border-outline-variant/40 rounded-lg px-3 py-1.5 font-ui-label text-xs text-primary-container font-semibold focus:ring-0 cursor-pointer">
            <option>Recommended</option>
            <option>Price: Low to High</option>
            <option>Price: High to Low</option>
            <option>Newest Arrivals</option>
          </select>
        </div>
      </div>
    </div>

    <!-- Product Grid -->
    <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
      <!-- Product Card 1 -->
      <div class="product-card bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col overflow-hidden relative hover:shadow-md transition-all duration-300">
        <div class="h-[220px] w-full bg-surface-container-low relative group">
          <img alt="ThinkPad T14" class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAdleXUwqWkylQCOowAj-deG4t_yt5eqlkSDpOfJTsUE_TEzXc2uwMThZ5SiHnN4rGaXPLltFx2e2bvBMXlmt7h23D9JDcAwrgBWnk25yrtWV9Y65uWX4j_tb8tGMGlMBZ3kDnVCqv3GmuFs0CVE5VSET-436nAbEtiAsCJ217dw8VPw0BH0P8ziSkZ7oaop3Rb6RvJGLRvpEGYLwt07Ki1eXqe8a8R7OUlStgnkRU_I1_zwX-pEuifwg"/>
          <div class="absolute top-3 right-3 flex gap-1">
            <span class="px-2.5 py-1 bg-surface-container-lowest/90 backdrop-blur text-primary-container font-data-id text-xs rounded-md shadow-sm border border-outline-variant/30">Refurbished</span>
          </div>
        </div>
        <div class="p-6 flex flex-col gap-3 flex-grow">
          <div class="flex items-center gap-1.5">
            <span class="font-data-id text-xs text-on-surface-variant font-medium">TechHub Nairobi</span>
            <span class="material-symbols-outlined fill text-on-tertiary-container text-[14px]">verified</span>
          </div>
          <h3 class="font-body-md-bold text-base text-on-surface line-clamp-2">Lenovo ThinkPad T14 Gen 2 - 16GB RAM, 512GB SSD</h3>
          <div class="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
            <div class="font-data-price text-xl font-bold text-primary-container">KES 85,000</div>
            <div class="flex items-center gap-1 text-on-tertiary-container font-data-id text-xs">
              <span class="material-symbols-outlined text-[14px]">shield</span>
              Protected by Float
            </div>
            <a href="/cart" class="mt-2 w-full text-center py-2.5 bg-[#EEF2FF] hover:bg-primary-container hover:text-on-primary text-primary-container font-ui-label text-sm rounded-xl transition-all border border-primary-container/20 block font-semibold">
              Buy with Float
            </a>
          </div>
        </div>
      </div>

      <!-- Product Card 2 -->
      <div class="product-card bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col overflow-hidden relative hover:shadow-md transition-all duration-300">
        <div class="h-[220px] w-full bg-surface-container-low relative group">
          <img alt="iPhone 13" class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBrAVOO-8QraKP-C9Q1BT_ANbGgN4ma4AkBUSrEtjap_A16QmSssQFV6XKp67QkcCAAvrUgH4-sXXvkHUt8OGZKKjMTQjzyZctoJPCq78q5or9dZlgqa4sbDpW5sqmQYBqRC4olTWpCZ0kkycV-jep1JAn9PzVOEhSwblYg_a0oUwfDVo7uHsaH7A6nACPKsyobb53asm6bwkPz-JRXBLQv8x3E5aPOvJa_w6KqhwVlzf671kYr-XIvTg"/>
          <div class="absolute top-3 right-3 flex gap-1">
            <span class="px-2.5 py-1 bg-surface-container-lowest/90 backdrop-blur text-primary-container font-data-id text-xs rounded-md shadow-sm border border-outline-variant/30">New</span>
          </div>
        </div>
        <div class="p-6 flex flex-col gap-3 flex-grow">
          <div class="flex items-center gap-1.5">
            <span class="font-data-id text-xs text-on-surface-variant font-medium">Gadget Haven CBD</span>
            <span class="material-symbols-outlined fill text-on-tertiary-container text-[14px]">verified</span>
          </div>
          <h3 class="font-body-md-bold text-base text-on-surface line-clamp-2">iPhone 13 Pro Max - 256GB - Sierra Blue</h3>
          <div class="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
            <div class="font-data-price text-xl font-bold text-primary-container">KES 120,000</div>
            <div class="flex items-center gap-1 text-on-tertiary-container font-data-id text-xs">
              <span class="material-symbols-outlined text-[14px]">shield</span>
              Protected by Float
            </div>
            <a href="/cart" class="mt-2 w-full text-center py-2.5 bg-[#EEF2FF] hover:bg-primary-container hover:text-on-primary text-primary-container font-ui-label text-sm rounded-xl transition-all border border-primary-container/20 block font-semibold">
              Buy with Float
            </a>
          </div>
        </div>
      </div>

      <!-- Product Card 3 -->
      <div class="product-card bg-surface-container-lowest rounded-2xl shadow-sm border border-outline-variant/30 flex flex-col overflow-hidden relative hover:shadow-md transition-all duration-300">
        <div class="h-[220px] w-full bg-surface-container-low relative group">
          <img alt="Dell Monitor" class="w-full h-full object-contain p-4 group-hover:scale-105 transition-transform duration-300" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBeDkgSjm_9dl_5_plv-StG9dwpsWMvmlKWoa02qBgjtpCluwvyQaumFyFOV8vvS7giHdOgpIBd_zTOfJ4Lu7cbSzj7852i3uxlo3Uc4NnoIrVmLgarTxvxa77QgwDtsmmioCZZ69Q608DxacnzKLMfZa79I0dLmXL3s7lZ6OgjhHZu_2rCF315CuISy3iONbZat4pml9413pA1Pvvm8x7PTd10YzHwdz5P3GrIGajEqCDC92l1Jj129A"/>
          <div class="absolute top-3 right-3 flex gap-1">
            <span class="px-2.5 py-1 bg-surface-container-lowest/90 backdrop-blur text-primary-container font-data-id text-xs rounded-md shadow-sm border border-outline-variant/30">Refurbished</span>
          </div>
        </div>
        <div class="p-6 flex flex-col gap-3 flex-grow">
          <div class="flex items-center gap-1.5">
            <span class="font-data-id text-xs text-on-surface-variant font-medium">Electro World</span>
            <span class="material-symbols-outlined fill text-on-tertiary-container text-[14px]">verified</span>
          </div>
          <h3 class="font-body-md-bold text-base text-on-surface line-clamp-2">Dell UltraSharp 27 4K USB-C Hub Monitor - U2723QE</h3>
          <div class="mt-auto pt-4 border-t border-outline-variant/20 flex flex-col gap-2">
            <div class="font-data-price text-xl font-bold text-primary-container">KES 65,500</div>
            <div class="flex items-center gap-1 text-on-tertiary-container font-data-id text-xs">
              <span class="material-symbols-outlined text-[14px]">shield</span>
              Protected by Float
            </div>
            <a href="/cart" class="mt-2 w-full text-center py-2.5 bg-[#EEF2FF] hover:bg-primary-container hover:text-on-primary text-primary-container font-ui-label text-sm rounded-xl transition-all border border-primary-container/20 block font-semibold">
              Buy with Float
            </a>
          </div>
        </div>
      </div>
    </div>

    <!-- Pagination -->
    <div class="mt-12 flex justify-center items-center gap-2">
      <button class="p-2.5 rounded-lg border border-outline-variant text-on-surface-variant hover:bg-surface-container-low disabled:opacity-50" disabled="">
        <span class="material-symbols-outlined text-[20px]">chevron_left</span>
      </button>
      <button class="w-9 h-9 rounded-lg bg-primary-container text-on-primary font-data-id text-sm flex items-center justify-center font-bold">1</button>
      <button class="w-9 h-9 rounded-lg hover:bg-surface-container-low text-on-surface font-data-id text-sm flex items-center justify-center transition-colors">2</button>
      <button class="w-9 h-9 rounded-lg hover:bg-surface-container-low text-on-surface font-data-id text-sm flex items-center justify-center transition-colors">3</button>
      <span class="text-outline px-1">...</span>
      <button class="w-9 h-9 rounded-lg hover:bg-surface-container-low text-on-surface font-data-id text-sm flex items-center justify-center transition-colors">12</button>
      <button class="p-2.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container-low transition-colors">
        <span class="material-symbols-outlined text-[20px]">chevron_right</span>
      </button>
    </div>
  </div>
</main>
`;

const Browse = () => {
  useEffect(() => {
    document.title = "Browse Verified Marketplace | TechTrust Kenya";

    const ensureStylesheet = (href: string) => {
      const exists = Array.from(document.querySelectorAll('link[rel="stylesheet"]')).some(
        (link) => link.getAttribute("href") === href
      );
      if (exists) return;
      const el = document.createElement("link");
      el.rel = "stylesheet";
      el.href = href;
      document.head.appendChild(el);
    };

    ensureStylesheet("https://fonts.googleapis.com/css2?family=Material+Symbols+Outlined:wght,FILL@100..700,0..1&display=swap");
  }, []);

  return <div dangerouslySetInnerHTML={{ __html: pageHtml }} />;
};

export default Browse;
