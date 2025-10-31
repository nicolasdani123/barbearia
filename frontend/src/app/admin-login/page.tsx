"use client";
import { useState, useEffect } from "react";
import AdminDashboard from "../../components/AdminDashboard";
import styles from "./login.module.css";

export default function AdminLoginPage() {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Verificar se já está logado ao carregar a página
  useEffect(() => {
    const authCache = localStorage.getItem('adminAuth');
    if (authCache) {
      try {
        const { isAuth, timestamp } = JSON.parse(authCache);
        const agora = new Date().getTime();
        const umDia = 24 * 60 * 60 * 1000; // 24 horas em milissegundos
        
        // Verificar se o cache ainda é válido (24 horas)
        if (isAuth && (agora - timestamp) < umDia) {
          setIsAuthenticated(true);
        } else {
          // Cache expirado, remover
          localStorage.removeItem('adminAuth');
        }
      } catch (error) {
        // Cache corrompido, remover
        localStorage.removeItem('adminAuth');
      }
    }
    setIsLoading(false);
  }, []);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    // Senha simples para demonstração - em produção use autenticação adequada
    if (password === "admin123") {
      setIsAuthenticated(true);
      setError("");
      
      // Salvar no cache com timestamp
      const authData = {
        isAuth: true,
        timestamp: new Date().getTime()
      };
      localStorage.setItem('adminAuth', JSON.stringify(authData));
    } else {
      setError("Senha incorreta!");
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    localStorage.removeItem('adminAuth');
  };

  // Mostrar loading enquanto verifica o cache
  if (isLoading) {
    return (
      <div className={styles.loginPage}>
        <div className={styles.loginCard}>
          <p>Verificando acesso...</p>
        </div>
      </div>
    );
  }

  if (isAuthenticated) {
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

  return (
    <div className={styles.loginPage}>
      <div className={styles.loginCard}>
        <h1>Acesso Administrativo</h1>
        <p>Entre com a senha para acessar o painel do barbeiro</p>
        
        <form onSubmit={handleLogin} className={styles.loginForm}>
          <input
            type="password"
            placeholder="Senha de administrador"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.passwordInput}
            required
          />
          <button type="submit" className={styles.loginButton}>
            Entrar
          </button>
        </form>
        
        {error && <p className={styles.error}>{error}</p>}
        
        <div className={styles.hint}>
          <small>💡 Dica: senha é "admin123"</small>
        </div>
      </div>
    </div>
  );
}