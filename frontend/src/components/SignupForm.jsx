import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";

export default function SignupForm({ switchToLogin, onSuccess }) {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const navigate = useNavigate();

  // reset fields whenever this form is mounted
  useEffect(() => {
    setFullName("");
    setEmail("");
    setPassword("");
    setMessage("");
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();

    try {
      const response = await fetch("http://localhost:8000/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: fullName, // keeping your backend structure
          email: email,
          password: password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.detail || "Signup failed");
      } else {
        // Store token (placeholder if backend token not returned yet)
        const token = data.user_id || data.token || "dummy-token";
        localStorage.setItem("token", token);
        localStorage.setItem("username", data.username || fullName);
        setMessage(data.message || "Signup successful!");
        if(typeof onSuccess == "function") {
          onSuccess();
        }
        navigate("/welcome", { replace: true });
      }
    } catch (err) {
      console.error(err);
      setMessage("Server error. Try again later.");
    }
  };

  /*
  const handleGoogleSignup = async () => {
    try {
      if (!window.google) {
        const script = document.createElement("script");
        script.src = "https://accounts.google.com/gsi/client";
        script.async = true;
        script.defer = true;
        document.body.appendChild(script);

        await new Promise((resolve) => {
          script.onload = resolve;
        });
      }

      window.google.accounts.id.initialize({
        client_id:
          "1050359938315-tv3elrkp7ih5clc8u6odtsj6cjosdh9t.apps.googleusercontent.com",
        callback: async (response) => {
          const res = await fetch("http://127.0.0.1:8000/auth/google", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: response.credential }),
          });
          const data = await res.json();

          if (!res.ok || data.error || !data.user_id) {
            throw new Error(data.error || "Google signup failed");
          }

          localStorage.setItem("token", data.user_id);
          localStorage.setItem("username", data.username || "");
          if (typeof onSuccess === "function") {
            onSuccess();
          }
          navigate("/welcome", { replace: true });
        },
      });

      window.google.accounts.id.prompt();
    } catch (err) {
      console.error("Google signup failed", err);
      setMessage("Google signup failed");
    }
  };
  */

  return (
    <div className="flex flex-col justify-between h-[490px] w-full">
      <div>
        <h2 className="text-2xl font-bold mb-1 text-yellow-300">Join Us Today</h2>
        <p className="text-lg mb-6 text-white">Create your account</p>

        <form onSubmit={handleSignup}>
        <input
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
          className="w-full p-4 mb-4 rounded-xl bg-white/10 placeholder-white/70 text-white 
                     focus:outline-none focus:ring-2 focus:ring-yellow-300"
          type="text"
          placeholder="Full Name"
          autoComplete="off"
          required
        />
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-4 mb-4 rounded-xl bg-white/10 placeholder-white/70 text-white 
                     focus:outline-none focus:ring-2 focus:ring-yellow-300"
          type="email"
          placeholder="Email Address"
          autoComplete="new-email"
          required
        />
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-4 mb-4 rounded-xl bg-white/10 placeholder-white/70 text-white 
                     focus:outline-none focus:ring-2 focus:ring-yellow-300"
          type="password"
          placeholder="Password"
          autoComplete="new-password"
          required
        />

        <br></br>

        <button
          type="submit"
          className="w-full py-4 rounded-full bg-white text-[#1D9AF0] font-bold 
                     hover:bg-gray-200 transition mb-4"
        >
          Sign Up
        </button>
        {message && <p className="text-center text-sm text-red-500">{message}</p>}

        </form>
      </div>

      <div>

        {/*
        <div className="flex items-center my-3">
          <hr className="flex-grow border-white/30" />
          <span className="px-3 text-white/70 text-sm">OR</span>
          <hr className="flex-grow border-white/30" />
        </div>

        <button
          type="button"
          onClick={handleGoogleSignup}
          className="w-full py-3 rounded-full bg-white text-gray-800 font-semibold 
                     flex items-center justify-center gap-2 hover:bg-gray-100 transition mb-4"
        >
          <img
            src="https://www.svgrepo.com/show/475656/google-color.svg"
            alt="Google"
            className="w-5 h-5"
          />
          Continue with Google
        </button>
        */}
        
        <p className="text-sm text-center">
          Already have an account?{" "}
          <span
            className="text-yellow-300 cursor-pointer"
            onClick={switchToLogin}
          >
            Login
          </span>
        </p>
      </div>
    </div>
  );
}
