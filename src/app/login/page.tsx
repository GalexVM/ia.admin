"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, ArrowRight, Loader2, AlertCircle, Lock } from "lucide-react";
import styles from "./login.module.css";
import ZefironLogo from "@/components/ZefironLogo";

export default function LoginPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password.trim()) {
      setError("Por favor ingresa la contraseña maestra");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Error al iniciar sesión");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (err: unknown) {
      if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("Ocurrió un error inesperado");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      {/* Elementos gráficos decorativos de la marca (Manual Páginas 1 y 18) */}
      <div className={styles.decorativeRibbon1} aria-hidden="true" />
      <div className={styles.decorativeRibbon2} aria-hidden="true" />

      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logoContainer}>
            <ZefironLogo variant="with-slogan" size="lg" theme="dark" showAdminBadge />
          </div>
          <p className={styles.subtitle}>
            Portal administrativo central para orquestar instancias, inteligencia artificial y parámetros de configuración.
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">
              Contraseña Maestra de Acceso
            </label>
            <div className={styles.inputWrapper}>
              <div className={styles.inputIcon}>
                <Lock size={16} />
              </div>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Ingresa tu clave maestra"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={styles.input}
                disabled={isLoading}
                autoFocus
                required
              />
              <button
                type="button"
                className={styles.toggleBtn}
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? "Ocultar contraseña" : "Ver contraseña"}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          {error && (
            <div className={styles.errorBanner}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          <button type="submit" className={styles.submitBtn} disabled={isLoading}>
            {isLoading ? (
              <>
                <Loader2 size={18} className="animate-spin" />
                <span>Verificando credenciales...</span>
              </>
            ) : (
              <>
                <span>Acceder a IA Admin Central</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <div className={styles.footerNote}>
          <span>Acceso protegido exclusivo para administradores autorizados de Zefiron.</span>
        </div>
      </div>
    </div>
  );
}
