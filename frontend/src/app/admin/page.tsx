"use client";
import { useEffect, useState } from "react";
import AdminDashboard from "../../components/AdminDashboard";
import styles from "../admin-login/login.module.css";

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Verificar cache de autenticação
  useEffect(() => {
    const authCache = localStorage.getItem('adminAuth');
    if (authCache) {
      try {
        const { isAuth, timestamp } = JSON.parse(authCache);
        const agora = new Date().getTime();
        const umDia = 24 * 60 * 60 * 1000; // 24 horas
        
        if (isAuth && (agora - timestamp) < umDia) {
          setIsAuthenticated(true);
        } else {
          localStorage.removeItem('adminAuth');
        }
      } catch (error) {
        localStorage.removeItem('adminAuth');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuth');
    // Redirecionar para página de login
    window.location.href = '/admin-login';
  };

  if (isLoading) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <p>Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    // Redirecionar para login se não autenticado
    window.location.href = '/admin-login';
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <p>Redirecionando para login...</p>
        </div>
      </div>
    );
  }

  return (
    <div>
      <div className={styles.logoutBar}>
        <span>Logado como Administrador</span>
        <button onClick={handleLogout} className={styles.logoutButton}>
          Sair
        </button>
      </div>
      <AdminDashboard />
    </div>
  );
}
