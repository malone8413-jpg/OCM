import { HashRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useEffect, useState } from "react";
import { base44 } from "./api/base44Client";

// Pages (adapte si tes chemins sont différents)
import Home from "./pages/Home";
import Informations from "./pages/Informations";
import Communaute from "./pages/Communaute";
import Mercato from "./pages/Mercato";

function App() {
  const [user, setUser] = useState(null);

  useEffect(() => {
    base44.auth.me().then(setUser);
  }, []);

  if (!user) {
    return (
      <div style={{ padding: 20 }}>
        <h2>Connexion requise</h2>
        <button
          onClick={async () => {
            const email = window.prompt("Email :");
            if (!email) return;

            const password = window.prompt("Mot de passe :");
            if (!password) return;

            try {
              await base44.auth.login(email, password);
              window.location.reload();
            } catch (err) {
              const create = window.confirm(
                "Compte introuvable. Créer un compte ?"
              );
              if (!create) return;

              await base44.auth.register({
                email,
                password,
                full_name: email,
                role: "user",
                has_selected_club: false,
              });

              window.location.reload();
            }
          }}
        >
          Connexion
        </button>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/informations" element={<Informations />} />
        <Route path="/communaute" element={<Communaute />} />
        <Route path="/mercato" element={<Mercato />} />
        <Route path="*" element={<Navigate to="/" />} />
      </Routes>

      <button
        onClick={async () => {
          await base44.auth.logout();
          window.location.reload();
        }}
        style={{
          position: "fixed",
          bottom: 20,
          right: 20,
          padding: 10,
        }}
      >
        Déconnexion
      </button>
    </Router>
  );
}

export default App;
