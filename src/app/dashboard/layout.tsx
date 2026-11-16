import React from "react";
import Sidebar from "@/components/Sidebar";
import styles from "./layout.module.css";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className={styles.dashboardLayout}>
      <Sidebar />
      <div className={styles.contentContainer}>{children}</div>
    </div>
  );
}

