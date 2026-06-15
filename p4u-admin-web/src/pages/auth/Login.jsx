import React, { useEffect, useState } from "react";
import { Icon } from "@iconify/react/dist/iconify.js";
import { Link, useNavigate } from "react-router-dom";
import logo from "../../assets/image/logo.png";
import { useAuth } from "../../context/AuthContext";
import { ApiError } from "../../lib/api/client";

const LoginPage = () => {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();
  const { isInitializing, isAuthenticated, login } = useAuth();

  useEffect(() => {
    if (!isInitializing && isAuthenticated) navigate("/dashboard", { replace: true });
  }, [isInitializing, isAuthenticated, navigate]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(username.trim(), password);
      navigate("/dashboard", { replace: true });
    } catch (err) {
      const msg =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Sign in failed.";
      setError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section className="auth bg-neutral-50 d-flex align-items-center justify-content-center min-vh-100 p-24 position-relative">
      <div
        className="bg-base p-32 p-sm-48 radius-16 shadow-sm border border-neutral-200 w-100 max-w-464-px position-relative"
        style={{ zIndex: 20 }}
      >
        <div className="text-center mb-32">
          <Link to="/" className="d-inline-block text-decoration-none mb-24">
            <div className="d-flex align-items-center justify-content-center gap-2">
              <img src={logo} alt="Logo" className="h-48-px" />
            </div>
          </Link>
          <h5 className="mb-12 fw-semibold">Admin Login</h5>
          <p className="text-secondary-light text-md mb-0">
            Sign in with your Keycloak admin username (often your email).
          </p>
        </div>

        <form id="p4u-admin-login-form" onSubmit={handleLogin}>
          <div className="icon-field mb-16">
            <span className="icon top-50 translate-middle-y">
              <Icon icon="mage:email" />
            </span>
            <input
              type="text"
              className="form-control h-56-px bg-neutral-50 radius-12"
              placeholder="Username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              autoComplete="username"
              required
            />
          </div>

          <div className="mb-20">
            <div className="position-relative d-flex align-items-center">
              <span className="position-absolute start-0 ms-16 text-secondary-light d-flex align-items-center">
                <Icon icon="solar:lock-password-outline" className="text-xl" />
              </span>
              <input
                type={showPassword ? "text" : "password"}
                className="form-control h-56-px bg-neutral-50 radius-12 ps-48 pe-48"
                id="your-password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
              <span
                className="cursor-pointer position-absolute end-0 me-16 text-secondary-light d-flex align-items-center"
                onClick={() => setShowPassword(!showPassword)}
                role="button"
                tabIndex={0}
                onKeyDown={(ev) => {
                  if (ev.key === "Enter" || ev.key === " ") setShowPassword((s) => !s);
                }}
              >
                <Icon icon={showPassword ? "mdi:eye-off-outline" : "mdi:eye-outline"} className="text-xl" />
              </span>
            </div>
          </div>

          {error && <p className="text-danger-600 text-sm mb-16 text-center">{error}</p>}

          <div className="mb-32">
            <div className="d-flex justify-content-between align-items-center gap-2">
              <div className="form-check style-check d-flex align-items-center mb-0">
                <input
                  className="form-check-input border border-neutral-300 m-0"
                  type="checkbox"
                  id="remember"
                  defaultChecked
                />
                <label className="form-check-label ms-8" htmlFor="remember">
                  Remember me
                </label>
              </div>
              <button
                type="button"
                className="btn btn-link text-primary-600 fw-medium text-sm text-decoration-none p-0 border-0 shadow-none"
                onClick={() => navigate("/forgot-password")}
              >
                Forgot Password?
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="btn btn-primary text-md px-12 py-16 w-100 radius-12 d-flex align-items-center justify-content-center gap-2 fw-semibold"
            style={{ position: "relative", zIndex: 1 }}
          >
            {submitting ? "Signing in…" : "Sign In"}{" "}
            <Icon icon="mingcute:arrow-right-line" className="text-xl" />
          </button>
        </form>
      </div>
    </section>
  );
};

export default LoginPage;
