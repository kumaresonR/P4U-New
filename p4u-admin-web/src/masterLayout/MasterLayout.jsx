/* eslint-disable react/prop-types */
import { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, NavLink, useLocation } from "react-router-dom";
import ThemeToggleButton from "../helper/ThemeToggleButton";
import { getAccessToken } from "../lib/api/tokenStorage";
/** e.g. "Admin User" → "AU", "admin" → "AD", "John Doe" → "JD" */
function displayNameToInitials(name) {
  const s = String(name || "").trim();
  if (!s) return "?";
  const parts = s.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0] || "";
    const b = parts[parts.length - 1][0] || "";
    return (a + b).toUpperCase().slice(0, 2);
  }
  const w = parts[0] || s;
  return w.slice(0, 2).toUpperCase();
}

/** Active class pairs with `extra.css` sidebar (flat teal rail + active/hover tokens). */
function sidebarNavClass({ isActive }) {
  return isActive ? "active-page" : "";
}

function readProfileLabelFromToken() {
  const t = getAccessToken();
  if (!t || typeof t !== "string") return null;
  try {
    const part = t.split(".")[1];
    if (!part) return null;
    const json = JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
    const n = json.name || json.preferred_username || json.email;
    if (typeof n !== "string" || !n.trim()) return null;
    const base = n.includes("@") ? n.split("@")[0].trim() : n.trim();
    return base.replace(/[._]+/g, " ").trim() || null;
  } catch {
    return null;
  }
}

const MasterLayout = ({ children }) => {
  let [sidebarActive, seSidebarActive] = useState(false);
  let [mobileMenu, setMobileMenu] = useState(false);
  const [displayName, setDisplayName] = useState("Admin User");
  const location = useLocation();

  useEffect(() => {
    const sync = () => {
      const fromToken = readProfileLabelFromToken();
      setDisplayName(fromToken || "Admin User");
    };
    sync();
    window.addEventListener("p4u-admin-token-updated", sync);
    return () => window.removeEventListener("p4u-admin-token-updated", sync);
  }, []);

  const profileInitials = displayNameToInitials(displayName);

  useEffect(() => {
    const handleDropdownClick = (event) => {
      event.preventDefault();
      const clickedLink = event.currentTarget;
      const clickedDropdown = clickedLink.closest(".dropdown");

      if (!clickedDropdown) return;

      const isActive = clickedDropdown.classList.contains("open");

      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        dropdown.classList.remove("open");
        const submenu = dropdown.querySelector(".sidebar-submenu");
        if (submenu) {
          submenu.style.maxHeight = "0px"; 
        }
      });

      if (!isActive) {
        clickedDropdown.classList.add("open");
        const submenu = clickedDropdown.querySelector(".sidebar-submenu");
        if (submenu) {
          submenu.style.maxHeight = `${submenu.scrollHeight}px`; 
        }
      }
    };

    const dropdownTriggers = document.querySelectorAll(
      ".sidebar-menu .dropdown > a, .sidebar-menu .dropdown > Link"
    );

    dropdownTriggers.forEach((trigger) => {
      trigger.addEventListener("click", handleDropdownClick);
    });

    const openActiveDropdown = () => {
      const allDropdowns = document.querySelectorAll(".sidebar-menu .dropdown");
      allDropdowns.forEach((dropdown) => {
        const submenuLinks = dropdown.querySelectorAll(".sidebar-submenu li a");
        submenuLinks.forEach((link) => {
          if (
            link.getAttribute("href") === location.pathname ||
            link.getAttribute("to") === location.pathname
          ) {
            dropdown.classList.add("open");
            const submenu = dropdown.querySelector(".sidebar-submenu");
            if (submenu) {
              submenu.style.maxHeight = `${submenu.scrollHeight}px`; 
            }
          }
        });
      });
    };

    openActiveDropdown();

    return () => {
      dropdownTriggers.forEach((trigger) => {
        trigger.removeEventListener("click", handleDropdownClick);
      });
    };
  }, [location.pathname]);

  let sidebarControl = () => {
    seSidebarActive(!sidebarActive);
  };

  let mobileMenuControl = () => {
    setMobileMenu(!mobileMenu);
  };

  return (
    <section className={mobileMenu ? "overlay active" : "overlay "}>
      <aside
        className={
          sidebarActive
            ? "sidebar active "
            : mobileMenu
              ? "sidebar sidebar-open"
              : "sidebar"
        }
      >
        <button onClick={mobileMenuControl} type='button' className='sidebar-close-btn'>
          <Icon icon='radix-icons:cross-2' />
        </button>
        <div>
          <Link
            to='/dashboard'
            className='sidebar-logo d-flex align-items-center text-decoration-none'
            aria-label='Planext4u — dashboard home'
          >
            <div className='sidebar-logo-copy'>
              <span className='sidebar-logo-title'>Planext4u</span>
              <span className='sidebar-logo-tagline'>ALL SOLUTIONS INDIA Pvt Ltd</span>
            </div>
          </Link>
        </div>

        <div className='sidebar-menu-area'>
          <ul className='sidebar-menu' id='sidebar-menu'>
            
            {/* ─── MAIN ─── */}
            <li className='sidebar-menu-group-title'>Main</li>
            <li>
              <NavLink to='/dashboard' className={sidebarNavClass} end>
                <Icon icon='mdi:view-dashboard-outline' className='menu-icon' />
                <span>Dashboard</span>
              </NavLink>
            </li>

            {/* ─── PRODUCT MANAGEMENT ─── */}
            <li className='sidebar-menu-group-title'>Product Management</li>
            <li>
              <NavLink to='/product-vendors' className={sidebarNavClass}>
                <Icon icon='mdi:store-outline' className='menu-icon' />
                <span title='Vendors selling products in the Shop tab'>Product vendors</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/product-categories' className={sidebarNavClass}>
                <Icon icon='mdi:shape-outline' className='menu-icon' />
                <span title='Shop / catalog product taxonomy'>Product categories</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/subcategories' className={sidebarNavClass}>
                <Icon icon='mdi:shape-plus-outline' className='menu-icon' />
                <span>Subcategories</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/product' className={sidebarNavClass}>
                <Icon icon='mdi:package-variant-closed' className='menu-icon' />
                <span>Products</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/product-attributes' className={sidebarNavClass}>
                <Icon icon='mdi:tune-variant' className='menu-icon' />
                <span>Product attributes</span>
              </NavLink>
            </li>

            {/* ─── SERVICE MANAGEMENT ─── */}
            <li className='sidebar-menu-group-title'>Service Management</li>
            <li>
              <NavLink to='/service-vendors' className={sidebarNavClass}>
                <Icon icon='mdi:room-service-outline' className='menu-icon' />
                <span title='Vendors offering bookable services in the Services tab'>Service vendors</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/service-categories' className={sidebarNavClass}>
                <Icon icon='mdi:shape-outline' className='menu-icon' />
                <span title='Services tab booking taxonomy'>Service categories</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/service' className={sidebarNavClass}>
                <Icon icon='mdi:tools' className='menu-icon' />
                <span title='Catalog service templates and vendor listing approvals'>Services</span>
              </NavLink>
            </li>

            {/* ─── CLASSIFIED (CF) MANAGEMENT ─── */}
            <li className='sidebar-menu-group-title'>Classified (CF) Management</li>
            <li>
              <NavLink to='/cf-vendors' className={sidebarNavClass}>
                <Icon icon='mdi:store-check-outline' className='menu-icon' />
                <span title='Classified listings — separate from catalog marketplace vendors'>CF vendors (classified)</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/cf-categories' className={sidebarNavClass}>
                <Icon icon='mdi:shape-plus-outline' className='menu-icon' />
                <span>CF Categories</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/cf-products' className={sidebarNavClass}>
                <Icon icon='mdi:package-variant' className='menu-icon' />
                <span>CF Products</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/cf-services' className={sidebarNavClass}>
                <Icon icon='mdi:toolbox-outline' className='menu-icon' />
                <span>CF Services</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/cf-cities' className={sidebarNavClass}>
                <Icon icon='mdi:city-variant-outline' className='menu-icon' />
                <span>CF City Locations</span>
              </NavLink>
            </li>

            {/* ─── SALES & FINANCIALS ─── */}
            <li className='sidebar-menu-group-title'>Sales & Financials</li>
            <li>
              <NavLink to='/orders' className={sidebarNavClass}>
                <Icon icon='mdi:clipboard-list-outline' className='menu-icon' />
                <span>Orders</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/service-bookings' className={sidebarNavClass}>
                <Icon icon='mdi:calendar-check-outline' className='menu-icon' />
                <span>Service bookings</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/settlements' className={sidebarNavClass}>
                <Icon icon='fluent:wallet-credit-card-16-regular' className='menu-icon' />
                <span>Settlements</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/points' className={sidebarNavClass}>
                <Icon icon='mdi:star-circle-outline' className='menu-icon' />
                <span>Points System</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/tax' className={sidebarNavClass}>
                <Icon icon='mdi:calculator-variant-outline' className='menu-icon' />
                <span>Tax Management</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/vendor-plans' className={sidebarNavClass}>
                <Icon icon='mdi:wallet-membership' className='menu-icon' />
                <span>Vendor Plans</span>
              </NavLink>
            </li>

            {/* ─── CUSTOMERS ─── */}
            <li className='sidebar-menu-group-title'>Users</li>
            <li>
              <NavLink to='/customers' className={sidebarNavClass}>
                <Icon icon='mdi:account-group-outline' className='menu-icon' />
                <span>Customers</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/occupations' className={sidebarNavClass}>
                <Icon icon='mdi:briefcase-outline' className='menu-icon' />
                <span>Occupations</span>
              </NavLink>
            </li>

            {/* ─── MARKETING & CONTENT ─── */}
            <li className='sidebar-menu-group-title'>Marketing & Content</li>
            <li>
              <NavLink to='/homepage-cms' className={sidebarNavClass}>
                <Icon icon='mdi:home-edit-outline' className='menu-icon' />
                <span>Homepage CMS</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/notifications' className={sidebarNavClass}>
                <Icon icon='mdi:bullhorn-outline' className='menu-icon' />
                <span>Push Notifications</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/media-library' className={sidebarNavClass}>
                <Icon icon='mdi:folder-multiple-image' className='menu-icon' />
                <span>Media Library</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/file-uploads' className={sidebarNavClass}>
                <Icon icon='mdi:file-upload-outline' className='menu-icon' />
                <span>File Uploads</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/banners' className={sidebarNavClass}>
                <Icon icon='mdi:view-carousel-outline' className='menu-icon' />
                <span>Banners</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/popup-banners' className={sidebarNavClass}>
                <Icon icon='mdi:message-image-outline' className='menu-icon' />
                <span>Popup Banners</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/advertisements' className={sidebarNavClass}>
                <Icon icon='mdi:bullhorn-outline' className='menu-icon' />
                <span>Advertisements</span>
              </NavLink>
            </li>

            {/* ─── SYSTEM & REPORTS ─── */}
            <li className='sidebar-menu-group-title'>System & Reports</li>
            <li>
              <NavLink to='/platform-variables' className={sidebarNavClass}>
                <Icon icon='mdi:cogs' className='menu-icon' />
                <span>Platform Variables</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/reports' className={sidebarNavClass}>
                <Icon icon='mdi:chart-box-outline' className='menu-icon' />
                <span>Reports</span>
              </NavLink>
            </li>
            <li>
              <NavLink to='/report-log' className={sidebarNavClass}>
                <Icon icon='mdi:file-document-alert-outline' className='menu-icon' />
                <span>Report Log</span>
              </NavLink>
            </li>

          </ul>
        </div>
      </aside>

      <main className={sidebarActive ? "dashboard-main active" : "dashboard-main"}>
        <div className='navbar-header'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <div className='d-flex flex-wrap align-items-center gap-4'>
                <button type='button' className='sidebar-toggle' onClick={sidebarControl}>
                  <Icon icon={sidebarActive ? 'iconoir:arrow-right' : 'heroicons:bars-3-solid'} className='icon text-2xl' />
                </button>
                <button onClick={mobileMenuControl} type='button' className='sidebar-mobile-toggle'>
                  <Icon icon='heroicons:bars-3-solid' className='icon' />
                </button>
                <form className='navbar-search'>
                  <input type='text' name='search' placeholder='Search pages, features…' />
                  <Icon icon='ion:search-outline' className='icon' />
                </form>
              </div>
            </div>
            <div className='col-auto'>
              <div className='d-flex flex-wrap align-items-center gap-3'>
                <ThemeToggleButton />
                {/* Language, Messages, Notifications, and Profile sections remain unchanged */}
                <div className='dropdown'>
                  <button
                    className='d-flex justify-content-center align-items-center w-40-px h-40-px p-0 border-0 bg-primary-600 text-white fw-bold text-sm rounded-circle flex-shrink-0'
                    type='button'
                    data-bs-toggle='dropdown'
                    aria-label={`Account menu (${displayName})`}
                  >
                    {profileInitials}
                  </button>
                  <div className='dropdown-menu to-top dropdown-menu-sm'>
                    <div className='py-12 px-16 radius-8 bg-primary-50 mb-16 d-flex align-items-center justify-content-between gap-2'>
                      <div className='d-flex align-items-center gap-12'>
                        <span
                          className='w-40-px h-40-px rounded-circle bg-primary-600 text-white fw-bold text-sm d-flex align-items-center justify-content-center flex-shrink-0'
                          aria-hidden
                        >
                          {profileInitials}
                        </span>
                        <div>
                          <h6 className='text-lg text-primary-light fw-semibold mb-0'>{displayName}</h6>
                        </div>
                      </div>
                    </div>
                    <ul className='to-top-list'>
                      <li><Link className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-primary d-flex align-items-center gap-3' to='/view-profile'><Icon icon='solar:user-linear' className='icon text-xl' /> My Profile</Link></li>
                      <li><Link className='dropdown-item text-black px-0 py-8 hover-bg-transparent hover-text-danger d-flex align-items-center gap-3' to='/login'><Icon icon='lucide:power' className='icon text-xl' /> Log Out</Link></li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='dashboard-main-body'>{children}</div>

        <footer className='d-footer'>
          <div className='row align-items-center justify-content-between'>
            <div className='col-auto'>
              <p className='mb-0'>© 2026 P4U. All Rights Reserved.</p>
            </div>
          </div>
        </footer>
      </main>
    </section>
  );
};

export default MasterLayout;