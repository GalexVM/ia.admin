"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  SlidersHorizontal,
  Target,
  LogOut,
  Menu,
  X,
  Sparkles,
} from "lucide-react";
import styles from "./Sidebar.module.css";
import ZefironLogo from "@/components/ZefironLogo";

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch (err) {
      console.error("Error al cerrar sesión:", err);
    }
  };

  // Determinar qué módulo está activo
  const isConfigActive =
    pathname === "/dashboard" || pathname.startsWith("/dashboard/tenants");
  const isLeadsActive = pathname.startsWith("/dashboard/leads");

  return (
    <>
      {/* Barra superior visible únicamente en pantallas móviles/tablets */}
      <div className={styles.mobileBar}>
        <Link href="/dashboard" className={styles.logoLink} onClick={() => setIsOpen(false)}>
          <ZefironLogo variant="icon" size="sm" />
          <span style={{ fontWeight: 600, fontSize: "0.95rem", marginLeft: 8, color: "#fff" }}>
            IA Admin Central
          </span>
        </Link>

        <button
          className={styles.mobileToggleBtn}
          onClick={() => setIsOpen(!isOpen)}
          aria-label={isOpen ? "Cerrar menú" : "Abrir menú"}
        >
          {isOpen ? <X size={18} /> : <Menu size={18} />}
          <span>{isOpen ? "Cerrar" : "Módulos"}</span>
        </button>
      </div>

      {/* Backdrop para cerrar en móvil */}
      {isOpen && (
        <div className={styles.backdrop} onClick={() => setIsOpen(false)} aria-hidden="true" />
      )}

      {/* Barra Lateral Principal */}
      <aside className={`${styles.sidebar} ${isOpen ? styles.sidebarOpen : ""}`}>
        {/* Cabecera con Logotipo Oficial e Identidad de Marca */}
        <div className={styles.sidebarHeader}>
          <Link href="/dashboard" className={styles.logoLink} onClick={() => setIsOpen(false)}>
            <ZefironLogo variant="with-slogan" size="sm" showAdminBadge />
          </Link>
        </div>

        {/* Sección de Navegación por Módulos */}
        <nav className={styles.navSection}>
          <span className={styles.sectionHeading}>Módulos del Sistema</span>

          {/* Módulo 1: Registro de Configuración */}
          <Link
            href="/dashboard"
            onClick={() => setIsOpen(false)}
            className={`${styles.navItem} ${isConfigActive ? styles.navItemActive : ""}`}
          >
            <div className={styles.navItemLeft}>
              <div className={styles.navIcon}>
                <SlidersHorizontal size={18} />
              </div>
              <span className={styles.navLabel}>Registro de Configuración</span>
            </div>
            {isConfigActive && (
              <span className={`${styles.badgePill} ${styles.badgePillActive}`}>
                Activo
              </span>
            )}
          </Link>

          {/* Módulo 2: Track de Leads */}
          <Link
            href="/dashboard/leads"
            onClick={() => setIsOpen(false)}
            className={`${styles.navItem} ${isLeadsActive ? styles.navItemActive : ""}`}
          >
            <div className={styles.navItemLeft}>
              <div className={styles.navIcon}>
                <Target size={18} />
              </div>
              <span className={styles.navLabel}>Track de Leads</span>
            </div>
            <span className={styles.badgePill}>
              Próx.
            </span>
          </Link>
        </nav>

        {/* Tarjeta Informativa en la barra */}
        <div className={styles.sidebarInfoCard}>
          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <Sparkles size={14} color="var(--brand-primary-hover)" />
            <span className={styles.infoCardTitle}>Motor Zefiron IA</span>
          </div>
          <p className={styles.infoCardDesc}>
            Orquestación de bots inmobiliarios y sincronización de reglas en tiempo real.
          </p>
        </div>

        {/* Footer de la Barra Lateral */}
        <div className={styles.sidebarFooter}>
          <div className={styles.statusIndicator}>
            <div className={styles.pulseDot} />
            <span>Motor de IA en línea</span>
          </div>

          <button onClick={handleLogout} className={styles.logoutBtn} type="button">
            <LogOut size={15} />
            <span>Cerrar Sesión</span>
          </button>

          <span className={styles.footerCopyright}>
            Zefiron © 2026 · Make your life easier
          </span>
        </div>
      </aside>
    </>
  );
}
