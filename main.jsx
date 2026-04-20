// src/main.jsx
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";  // Fixed the import
import "./index.css";
import { AuthProvider } from "./context/AuthContext.jsx";
// Add this at the top of main.jsx
localStorage.setItem("role", "admin");
localStorage.setItem("isLoggedIn", "true");

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </React.StrictMode>
);