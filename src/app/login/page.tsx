"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Shield, Eye, EyeOff, ArrowRight, Loader2, AlertCircle } from "lucide-react";
import styles from "./login.module.css";

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
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.iconWrapper}>
            <Shield size={26} strokeWidth={2.2} />
          </div>
          <h1 className={styles.title}>Zefiron Admin Central</h1>
          <p className={styles.subtitle}>
            Ingresa la contraseña maestra para administrar las instancias y configuraciones
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.fieldGroup}>
            <label className={styles.label} htmlFor="password">
              Contraseña Maestra
            </label>
            <div className={styles.inputWrapper}>
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="••••••••••••"
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
                <span>Verificando...</span>
              </>
            ) : (
              <>
                <span>Acceder al Panel</span>
                <ArrowRight size={18} />
              </>
            )}
          </button>
        </form>

        <p className={styles.footerNote}>
          Acceso protegido exclusivo para administradores de Zefiron
        </p>
      </div>
    </div>
  );
}
