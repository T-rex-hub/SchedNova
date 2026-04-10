import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE } from "../config/api";
import { GoogleLogin } from "@react-oauth/google";

export default function LoginForm({ switchToSignup, onSuccess }) {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState(""); // backend response
  const navigate = useNavigate();

  // reset fields whenever this form is mounted
  useEffect(() => {
    setUsername("");
    setPassword("");
    setMessage("");
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch(`${API_BASE}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      if (response.ok) {
        // Store token (placeholder if backend token not returned yet)
        const token = data.user_id || data.token || "dummy-token";
        localStorage.setItem("token", token);
        localStorage.setItem("username", data.username || username);
        setMessage(data.message || "Login successful");
        if (typeof onSuccess === "function") {
          onSuccess();
        }
        navigate("/welcome", { replace: true });
      } else {
        setMessage(data.detail || data.message || "Login failed");
      }
    } catch (error) {
      console.error("Error:", error);
      setMessage("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="flex flex-col justify-between h-[475px] w-full">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-yellow-300">Welcome Back</h2>
        <p className="text-lg mb-6 text-white">Login to your account</p>

        <form onSubmit={handleLogin}>
        <input
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-4 mb-4 rounded-xl bg-white/10 placeholder-white/70 text-white 
                     focus:outline-none focus:ring-2 focus:ring-yellow-300"
          type="text"
          placeholder="Username"
          required
        />

        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 mb-4 rounded-xl bg-white/10 placeholder-white/70 text-white 
                     focus:outline-none focus:ring-2 focus:ring-yellow-300"
          type="password"
          placeholder="Password"
          required
        />
        <br></br><br></br>
        <button
          type="submit"
          className="w-full py-4 rounded-full bg-white text-[#1D9AF0] font-bold 
                     hover:bg-gray-200 transition mb-4"
        >
          Login
        </button>
        
        {message && <p className="text-center text-white mb-2">{message}</p>}
        </form>
      </div>


      <div>

        {/* Divider */}
        <div className="flex items-center my-3">
          <hr className="flex-grow border-white/30" />
          <span className="px-3 text-white/70 text-sm">OR</span>
          <hr className="flex-grow border-white/30" />
        </div>

        {/* Google Login */}
        <div className="flex justify-center w-full mb-4">
          <GoogleLogin
            onSuccess={async (credentialResponse) => {
              try {
                const res = await fetch(`${API_BASE}/auth/google`, {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ token: credentialResponse.credential }),
                });

                const data = await res.json();

                if (!res.ok || data.error || !data.user_id) {
                  throw new Error(data.error || "Google login failed");
                }

                localStorage.setItem("token", data.user_id);
                localStorage.setItem("username", data.username || "");

                if (typeof onSuccess === "function") {
                  onSuccess();
                }
                navigate("/welcome", { replace: true });
              } catch (err) {
                console.error("Google login failed", err);
                setMessage("Google login failed");
              }
            }}
            onError={() => {
              console.error("Google Login Failed");
              setMessage("Google login failed or was cancelled.");
            }}
            useOneTap
            theme="filled_blue"
            shape="pill"
          />
        </div>
        <p className="text-sm text-center">
          Don’t have an account?{" "}
          <span
            className="text-yellow-300 cursor-pointer"
            onClick={switchToSignup}
          >
            Sign Up
          </span>
        </p>
      </div>
    </div>
  );
}
