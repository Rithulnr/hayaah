"use client";

import React, { useState, useEffect, useRef } from "react";
import Link from "next/link";
import "./hayaa-header.css";

export default function HayaaHeader() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [cartOpen, setCartOpen] = useState(false);
  const [activeDropdown, setActiveDropdown] = useState<string | null>(null);
  const [mobileAccordion, setMobileAccordion] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [wishlistCount] = useState(0);
  const [cartCount] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 40);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  useEffect(() => {
    if (searchOpen && searchInputRef.current) {
      setTimeout(() => searchInputRef.current?.focus(), 150);
    }
  }, [searchOpen]);

  // Lock body scroll when mobile menu, search, or cart is open
  useEffect(() => {
    if (mobileMenuOpen || searchOpen || cartOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [mobileMenuOpen, searchOpen, cartOpen]);

  const toggleMobileAccordion = (key: string) => {
    setMobileAccordion(mobileAccordion === key ? null : key);
  };

  return (
    <>
      {/* ========================================================
          1. TOP ANNOUNCEMENT & UTILITY BAR
      ======================================================== */}
      <div className={`hayaah-topbar ${isScrolled ? "is-hidden" : ""}`}>
        <div className="topbar-inner">
          <div className="topbar-left">
            <span className="topbar-pill">NEW</span>
            <span className="topbar-text">
              Experience Luxury in Every Spray &bull; Complimentary Shipping in India on Orders Above ₹999
            </span>
          </div>

          <div className="topbar-right">
            <Link href="#track-order" className="topbar-link">
              Track Order
            </Link>
            <span className="topbar-sep">&bull;</span>
            <Link href="#b2b" className="topbar-link">
              Franchise & Dealer Enquiry
            </Link>
            <span className="topbar-sep">&bull;</span>
            <span className="topbar-currency">INR (₹)</span>
          </div>
        </div>
      </div>

      {/* ========================================================
          2. MAIN FLOATING / STICKY HEADER
      ======================================================== */}
      <header
        className={`hayaah-nav-header ${isScrolled ? "is-scrolled" : ""}`}
        onMouseLeave={() => setActiveDropdown(null)}
      >
        <div className="nav-container">
          {/* Brand Logo */}
          <div className="nav-brand">
            <Link href="/" className="brand-logo-text" onClick={() => setActiveDropdown(null)}>
              <span className="brand-letters">H A Y A A H</span>
              <span className="brand-sub">HAUTE PARFUMERIE</span>
            </Link>
          </div>

          {/* Desktop Navigation with Luxury Dropdowns */}
          <nav className="nav-menu" aria-label="Primary Navigation">
            {/* HOME */}
            <div className="nav-item">
              <Link href="/" className="nav-menu-link">
                Home
              </Link>
            </div>

            {/* SHOP (Dropdown) */}
            <div
              className={`nav-item has-dropdown ${activeDropdown === "shop" ? "dropdown-open" : ""}`}
              onMouseEnter={() => setActiveDropdown("shop")}
            >
              <button
                type="button"
                className="nav-menu-link dropdown-trigger"
                aria-expanded={activeDropdown === "shop"}
                onClick={() => setActiveDropdown(activeDropdown === "shop" ? null : "shop")}
              >
                <span>Shop</span>
                <svg className="dropdown-caret" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="dropdown-menu megamenu-shop">
                <div className="dropdown-column">
                  <span className="dropdown-title">Categories</span>
                  <Link href="#shop-all" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                    All Fragrances
                  </Link>
                  <Link href="#men" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                    Men&apos;s Perfumes
                  </Link>
                  <Link href="#women" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                    Women&apos;s Perfumes
                  </Link>
                  <Link href="#unisex" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                    Unisex Blends
                  </Link>
                </div>

                <div className="dropdown-column">
                  <span className="dropdown-title">Curations</span>
                  <Link href="#best-sellers" className="dropdown-link highlighted" onClick={() => setActiveDropdown(null)}>
                    Best Sellers <span className="mini-badge">HOT</span>
                  </Link>
                  <Link href="#new-arrivals" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                    New Arrivals <span className="mini-badge new">NEW</span>
                  </Link>
                  <Link href="#discovery" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                    Discovery Sets
                  </Link>
                </div>

                <div className="dropdown-card">
                  <span className="card-kicker">SIGNATURE FLACON</span>
                  <h5>Extrait De Parfum</h5>
                  <p>35% oil concentration engineered for enduring sillage.</p>
                  <Link href="#explore" className="dropdown-card-cta" onClick={() => setActiveDropdown(null)}>
                    Discover &rarr;
                  </Link>
                </div>
              </div>
            </div>

            {/* COLLECTIONS (Dropdown) */}
            <div
              className={`nav-item has-dropdown ${activeDropdown === "collections" ? "dropdown-open" : ""}`}
              onMouseEnter={() => setActiveDropdown("collections")}
            >
              <button
                type="button"
                className="nav-menu-link dropdown-trigger"
                aria-expanded={activeDropdown === "collections"}
                onClick={() => setActiveDropdown(activeDropdown === "collections" ? null : "collections")}
              >
                <span>Collections</span>
                <svg className="dropdown-caret" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="dropdown-menu">
                <Link href="#collections" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  The Royal Oud Series
                </Link>
                <Link href="#collections" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Amber &amp; Spices
                </Link>
                <Link href="#collections" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Velvet Florals &amp; Musks
                </Link>
                <Link href="#collections" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Travel &amp; Discovery Sets
                </Link>
              </div>
            </div>

            {/* ABOUT US / STORY (Dropdown) */}
            <div
              className={`nav-item has-dropdown ${activeDropdown === "about" ? "dropdown-open" : ""}`}
              onMouseEnter={() => setActiveDropdown("about")}
            >
              <button
                type="button"
                className="nav-menu-link dropdown-trigger"
                aria-expanded={activeDropdown === "about"}
                onClick={() => setActiveDropdown(activeDropdown === "about" ? null : "about")}
              >
                <span>About</span>
                <svg className="dropdown-caret" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="dropdown-menu">
                <Link href="#why-hayaah" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Our Story &amp; Heritage
                </Link>
                <Link href="#why-hayaah" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Why Choose HAYAAH
                </Link>
                <Link href="#reviews" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Customer Reviews
                </Link>
                <Link href="#blogs" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Fragrance Journal (Blogs)
                </Link>
                <Link href="#faq" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  FAQ
                </Link>
              </div>
            </div>

            {/* WHOLESALE / B2B (Dropdown) */}
            <div
              className={`nav-item has-dropdown ${activeDropdown === "b2b" ? "dropdown-open" : ""}`}
              onMouseEnter={() => setActiveDropdown("b2b")}
            >
              <button
                type="button"
                className="nav-menu-link dropdown-trigger"
                aria-expanded={activeDropdown === "b2b"}
                onClick={() => setActiveDropdown(activeDropdown === "b2b" ? null : "b2b")}
              >
                <span>B2B &amp; Partner</span>
                <svg className="dropdown-caret" viewBox="0 0 10 6" fill="none">
                  <path d="M1 1L5 5L9 1" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
                </svg>
              </button>

              <div className="dropdown-menu">
                <Link href="#wholesale" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Wholesale Inquiries
                </Link>
                <Link href="#become-dealer" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Become a Dealer
                </Link>
                <Link href="#franchise" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Franchise Opportunities
                </Link>
                <Link href="#corporate-gifting" className="dropdown-link" onClick={() => setActiveDropdown(null)}>
                  Corporate Gifting
                </Link>
              </div>
            </div>

            {/* CONTACT */}
            <div className="nav-item">
              <Link href="#contact" className="nav-menu-link">
                Contact
              </Link>
            </div>
          </nav>

          {/* Right Action Utilities (Search, Wishlist, Account, Cart) */}
          <div className="nav-actions">
            {/* Search Trigger */}
            <button
              type="button"
              className="action-icon-btn"
              onClick={() => setSearchOpen(true)}
              aria-label="Search Fragrances"
              title="Search"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="action-svg">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" strokeLinecap="round" />
              </svg>
            </button>

            {/* Wishlist */}
            <button
              type="button"
              className="action-icon-btn wishlist-btn"
              aria-label="Wishlist"
              title="Saved Scents"
              onClick={() => alert("Wishlist: Your saved fragrances will appear here.")}
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="action-svg">
                <path
                  d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              {wishlistCount > 0 && <span className="action-badge">{wishlistCount}</span>}
            </button>

            {/* Account */}
            <Link
              href="#account"
              className="action-icon-btn account-link"
              aria-label="Account Login"
              title="My Account"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="action-svg">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" strokeLinecap="round" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </Link>

            {/* Shopping Bag / Cart */}
            <button
              type="button"
              className="action-icon-btn cart-btn"
              onClick={() => setCartOpen(true)}
              aria-label="Shopping Bag"
              title="Bag"
            >
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="action-svg">
                <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                <line x1="3" y1="6" x2="21" y2="6" />
                <path d="M16 10a4 4 0 0 1-8 0" strokeLinecap="round" />
              </svg>
              <span className="action-badge">{cartCount}</span>
            </button>

            {/* Mobile Hamburger Button */}
            <button
              type="button"
              className="mobile-hamburger-btn"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Open Navigation Menu"
            >
              <span className="hamburger-line" />
              <span className="hamburger-line" />
            </button>
          </div>
        </div>
      </header>

      {/* ========================================================
          3. LUXURY INTERACTIVE SEARCH MODAL
      ======================================================== */}
      {searchOpen && (
        <div className="hayaah-modal-overlay" onClick={() => setSearchOpen(false)}>
          <div className="hayaah-search-panel" onClick={(e) => e.stopPropagation()}>
            <div className="search-panel-top">
              <span className="search-panel-title">DISCOVER HAYAAH</span>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setSearchOpen(false)}
                aria-label="Close search"
              >
                &times;
              </button>
            </div>

            <div className="search-input-wrapper">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="search-box-icon">
                <circle cx="11" cy="11" r="7" />
                <line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                ref={searchInputRef}
                type="text"
                className="search-input"
                placeholder="Search perfumes, rare notes (Oud, Amber, Vanilla, Musk)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button type="button" className="search-clear-btn" onClick={() => setSearchQuery("")}>
                  Clear
                </button>
              )}
            </div>

            <div className="search-suggestions">
              <span className="suggestions-title">POPULAR SEARCHES:</span>
              <div className="tag-chips">
                {["Best Sellers", "Royal Oud", "Extrait de Parfum", "Long Lasting", "Men", "Women", "Unisex", "Discovery Set"].map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    className="tag-chip"
                    onClick={() => setSearchQuery(tag)}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          4. LUXURY SLIDE-OUT CART DRAWER
      ======================================================== */}
      {cartOpen && (
        <div className="hayaah-modal-overlay" onClick={() => setCartOpen(false)}>
          <div className="hayaah-cart-drawer" onClick={(e) => e.stopPropagation()}>
            <div className="cart-drawer-header">
              <div className="cart-header-title">
                <span>SHOPPING BAG</span>
                <span className="cart-count-pill">{cartCount} ITEMS</span>
              </div>
              <button
                type="button"
                className="modal-close-btn"
                onClick={() => setCartOpen(false)}
                aria-label="Close cart"
              >
                &times;
              </button>
            </div>

            <div className="cart-shipping-bar">
              <div className="shipping-text">
                Add <strong>₹999</strong> more for <strong>Free Express Shipping</strong>
              </div>
              <div className="shipping-progress-track">
                <div className="shipping-progress-fill" style={{ width: "35%" }} />
              </div>
            </div>

            <div className="cart-drawer-body">
              {cartCount === 0 ? (
                <div className="empty-cart-state">
                  <div className="empty-cart-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.2">
                      <path d="M6 2L3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4z" />
                      <line x1="3" y1="6" x2="21" y2="6" />
                      <path d="M16 10a4 4 0 0 1-8 0" />
                    </svg>
                  </div>
                  <h4>Your Fragrance Bag is Empty</h4>
                  <p>Discover our opulent collection of long-lasting luxury perfumes.</p>
                  <a
                    href="#best-sellers"
                    className="empty-cart-cta"
                    onClick={() => setCartOpen(false)}
                  >
                    EXPLORE BEST SELLERS
                  </a>
                </div>
              ) : (
                <div className="cart-items-list">
                  {/* Cart items list placeholder */}
                </div>
              )}
            </div>

            <div className="cart-drawer-footer">
              <div className="cart-guarantee">
                <span className="guarantee-icon">&#10003;</span>
                <span>100% Authentic &bull; Made in India &bull; Secure Checkout</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================
          5. EXPANDED MOBILE ACCORDION DRAWER
      ======================================================== */}
      {mobileMenuOpen && (
        <div className="mobile-nav-overlay" onClick={() => setMobileMenuOpen(false)}>
          <div className="mobile-nav-panel" onClick={(e) => e.stopPropagation()}>
            {/* Top Bar */}
            <div className="mobile-nav-top">
              <div className="mobile-brand-wrapper">
                <span className="mobile-brand-title">H A Y A A H</span>
                <span className="mobile-brand-sub">HAUTE PARFUMERIE</span>
              </div>
              <button
                type="button"
                className="mobile-close-btn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                &times;
              </button>
            </div>

            {/* Mobile Search Button */}
            <div className="mobile-search-trigger">
              <button
                type="button"
                className="mobile-search-box"
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSearchOpen(true);
                }}
              >
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="action-svg">
                  <circle cx="11" cy="11" r="7" />
                  <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <span>Search fragrances, notes...</span>
              </button>
            </div>

            {/* Mobile Accordion Menu */}
            <div className="mobile-accordion-list">
              <Link
                href="/"
                className="mobile-direct-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Home
              </Link>

              {/* Shop Accordion */}
              <div className="mobile-acc-item">
                <button
                  type="button"
                  className="mobile-acc-header"
                  onClick={() => toggleMobileAccordion("shop")}
                >
                  <span>Shop</span>
                  <span className={`mobile-acc-caret ${mobileAccordion === "shop" ? "open" : ""}`}>+</span>
                </button>
                {mobileAccordion === "shop" && (
                  <div className="mobile-acc-body">
                    <Link href="#shop-all" onClick={() => setMobileMenuOpen(false)}>All Fragrances</Link>
                    <Link href="#best-sellers" className="highlighted" onClick={() => setMobileMenuOpen(false)}>
                      Best Sellers 🔥
                    </Link>
                    <Link href="#new-arrivals" onClick={() => setMobileMenuOpen(false)}>New Arrivals ✨</Link>
                    <Link href="#men" onClick={() => setMobileMenuOpen(false)}>Men&apos;s Perfumes</Link>
                    <Link href="#women" onClick={() => setMobileMenuOpen(false)}>Women&apos;s Perfumes</Link>
                    <Link href="#unisex" onClick={() => setMobileMenuOpen(false)}>Unisex Perfumes</Link>
                  </div>
                )}
              </div>

              {/* Collections Accordion */}
              <div className="mobile-acc-item">
                <button
                  type="button"
                  className="mobile-acc-header"
                  onClick={() => toggleMobileAccordion("collections")}
                >
                  <span>Collections</span>
                  <span className={`mobile-acc-caret ${mobileAccordion === "collections" ? "open" : ""}`}>+</span>
                </button>
                {mobileAccordion === "collections" && (
                  <div className="mobile-acc-body">
                    <Link href="#collections" onClick={() => setMobileMenuOpen(false)}>Royal Oud Series</Link>
                    <Link href="#collections" onClick={() => setMobileMenuOpen(false)}>Extrait de Parfum</Link>
                    <Link href="#discovery" onClick={() => setMobileMenuOpen(false)}>Discovery Sets</Link>
                  </div>
                )}
              </div>

              {/* About Accordion */}
              <div className="mobile-acc-item">
                <button
                  type="button"
                  className="mobile-acc-header"
                  onClick={() => toggleMobileAccordion("about")}
                >
                  <span>About Us</span>
                  <span className={`mobile-acc-caret ${mobileAccordion === "about" ? "open" : ""}`}>+</span>
                </button>
                {mobileAccordion === "about" && (
                  <div className="mobile-acc-body">
                    <Link href="#why-hayaah" onClick={() => setMobileMenuOpen(false)}>Our Story</Link>
                    <Link href="#why-hayaah" onClick={() => setMobileMenuOpen(false)}>Why Choose HAYAAH</Link>
                    <Link href="#reviews" onClick={() => setMobileMenuOpen(false)}>Customer Reviews</Link>
                    <Link href="#blogs" onClick={() => setMobileMenuOpen(false)}>Fragrance Blog</Link>
                    <Link href="#faq" onClick={() => setMobileMenuOpen(false)}>FAQ</Link>
                  </div>
                )}
              </div>

              {/* B2B & Wholesale */}
              <div className="mobile-acc-item">
                <button
                  type="button"
                  className="mobile-acc-header"
                  onClick={() => toggleMobileAccordion("b2b")}
                >
                  <span>Wholesale &amp; Franchise</span>
                  <span className={`mobile-acc-caret ${mobileAccordion === "b2b" ? "open" : ""}`}>+</span>
                </button>
                {mobileAccordion === "b2b" && (
                  <div className="mobile-acc-body">
                    <Link href="#wholesale" onClick={() => setMobileMenuOpen(false)}>Wholesale (B2B)</Link>
                    <Link href="#become-dealer" onClick={() => setMobileMenuOpen(false)}>Become a Dealer</Link>
                    <Link href="#franchise" onClick={() => setMobileMenuOpen(false)}>Franchise Enquiry</Link>
                  </div>
                )}
              </div>

              <Link
                href="#track-order"
                className="mobile-direct-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Track Order
              </Link>

              <Link
                href="#contact"
                className="mobile-direct-link"
                onClick={() => setMobileMenuOpen(false)}
              >
                Contact Us
              </Link>
            </div>

            {/* Mobile Footer */}
            <div className="mobile-nav-bottom">
              <div className="mobile-quick-actions">
                <button
                  type="button"
                  className="mobile-action-pill"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    setCartOpen(true);
                  }}
                >
                  Bag ({cartCount})
                </button>
                <Link
                  href="#account"
                  className="mobile-action-pill"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  My Account
                </Link>
              </div>
              <span className="mobile-perfume-tag">EAU DE PARFUM &bull; CRAFTED IN INDIA</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
