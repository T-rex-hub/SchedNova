import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api";

export default function GoogleCallback() {
  const navigate = useNavigate();

  useEffect(() => {
    console.log("🔵 GoogleCallback mounted");

    const run = async () => {
      try {
        console.log("🔵 Completing Google login via backend...");

        const res = await fetch(`${API_BASE}/auth/google/callback`, {
          credentials: "include",
        });

        const data = await res.json();
        console.log("🔵 Backend response:", data);

        if (!data.token) {
          throw new Error("No token in backend response");
        }

        localStorage.setItem("token", data.token);
        localStorage.setItem("username", data.username || "");

        navigate("/welcome");
      } catch (err) {
        console.error("❌ Google login failed:", err);
        navigate("/login");
      }
    };

    run();
  }, []);

  return (
    <div style={{ padding: 40, fontSize: 18 }}>
      Signing you in…
    </div>
  );
}