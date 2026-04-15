import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { base44 } from "./api/base44Client";

import Home from "./pages/Home";
import Informations from "./pages/Informations";
import Community from "./pages/Community";
import TransferMarket from "./pages/TransferMarket";

function App() {
  const [user, setUser] = useState(undefined);

  useEffect(() => {
    base44.auth.me().then(setUser).catch(() => setUser(null));
  }, []);

  const handleLogin = async () => {
    try {
      const email = window.prompt("Entre ton email :");
      if (!email) return;

      const password = window.prompt("Entre ton mot de passe :");
      if (!password) return;

      try {
        await base44.auth.login(email, password);
        window.location.reload();
      } catch (error) {
        const createAccount = window.confirm(
          "Compte introuvable. Voulez-vous créer un compte ?"
        );

        if (!createAccount) return;

        const fullName = window.prompt("Ton nom :") || email;

        await base44.auth.register({
          email,
          password,
          full_name: fullName,
          role: "user",
          has_selected_club: false,
        });

        window.location.reload();
      }
    } catch (error) {
      console.error(error);
      alert("Erreur de connexion");
    }
  };

  const handleLogout = async () => {
    try {
      await base44.auth.logout();
      window.location.reload();
    } catch (error) {
      console.error(error);
      alert("Erreur lors de la déconnexion");
    }
  };

  if (user === undefined) {
    return <div>Chargement...</div>;
  }

  return (
    <Router>
      <div>
        {!user && (
          <div style={{ padding: "16px" }}>
            <button onClick={handleLogin}>Connexion</button>
          </div>
        )}

        {user && (
          <div style={{ padding: "16px" }}>
            <button onClick={handleLogout}>Déconnexion</button>
          </div>
        )}

        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/Informations" element={<Informations />} />
          <Route path="/Community" element={<Community />} />
          <Route path="/TransferMarket" element={<TransferMarket />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
