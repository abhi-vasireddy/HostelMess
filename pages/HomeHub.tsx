import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Lock, ExternalLink, Eye, EyeOff } from "lucide-react";

import { useAuth } from "../App";
import { MockDB } from "../services/mockDb";
import { ServiceModule } from "../types";
import { ICON_MAP } from "../services/iconMap";

export const HomeHub = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [services, setServices] = useState<ServiceModule[]>([]);
  const [loading, setLoading] = useState(true);

  // ✅ Password Visibility States
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const firstName = user?.displayName
    ? user.displayName.split(" ")[0]
    : "Student";

  const initial = firstName[0]?.toUpperCase();

  // ✅ Modal States
  const [showCard, setShowCard] = useState(false);
  const [showFlow, setShowFlow] = useState(false);
  const [showChangePassword, setShowChangePassword] = useState(false);

  // ✅ Password States
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordError, setPasswordError] = useState("");

  // ✅ Load Services
  useEffect(() => {
    const loadServices = async () => {
      const data = await MockDB.getServices();
      setServices(data);
      setLoading(false);
    };
    loadServices();
  }, []);

  // ✅ Logout
  const handleLogout = async () => {
    if (window.confirm("Are you sure you want to logout?")) {
      await logout();
      navigate("/login");
    }
  };

  // ✅ Service Click (This correctly pushes to mobile history!)
  const handleServiceClick = (mod: ServiceModule) => {
    if (!mod.isActive) return;

    if (mod.isExternal && mod.path) {
      window.open(mod.path, "_blank");
    } else if (mod.path) {
      // This is the correct React Router method to support the back button
      navigate(mod.path);
    }
  };

  // ✅ Icon Render
  const renderIcon = (iconName: string, size: number) => {
    const Icon = ICON_MAP[iconName] || ICON_MAP["Utensils"];
    return <Icon size={size} />;
  };

  // ✅ Password Validation
  const validatePassword = (password: string) => {
    const hasUppercase = /[A-Z]/.test(password);
    const hasNumber = /\d/.test(password);
    const hasSpecialChar = /[!@#$%^&*(),.?":{}|<>]/.test(password);

    if (password.length < 6) return "Password must be at least 6 characters";
    if (!hasUppercase) return "Password must contain an uppercase letter";
    if (!hasNumber) return "Password must contain a number";
    if (!hasSpecialChar) return "Password must contain a special character";

    return "";
  };

  // ✅ Change Password Submit
  const handleChangePasswordSubmit = async () => {
    if (!user?.uid) return;

    try {
      await MockDB.updatePassword(user.uid, newPassword);

      alert("Password changed successfully ");

      setNewPassword("");
      setConfirmPassword("");
      setPasswordError("");
      setShowChangePassword(false);
      setShowCard(false); // Close dropdown too
    } catch (err) {
      console.error(err);
      alert("Password update failed ");
    }
  };

  // ✅ Loading Spinner
  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 dark:bg-slate-950 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-orange-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // ✅ Main Return
  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 animate-in fade-in relative">
      {/* ✅ Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white">
            Camp<span className="text-orange-500">Dex</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Welcome back, {firstName}
          </p>
        </div>

        {/* Profile + Logout */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 pr-2 rounded-full border shadow-sm relative">
          
          {/* Avatar */}
          <div
            onClick={() => setShowCard(!showCard)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
          >
            {initial}
          </div>

          {/* Popup Card (Dropdown) */}
          {showCard && (
            <div className="absolute right-0 top-14 w-[160px] p-4 bg-[#FFF7ED] rounded-xl shadow-lg z-40 border border-orange-100">
              <div className="flex flex-col items-center gap-3">
                <button
                  onClick={() => setShowCard(false)}
                  className="w-9 h-9 rounded-full bg-white border flex items-center justify-center text-slate-600 hover:bg-slate-50"
                >
                  ←
                </button>

                {/* Flow Button */}
                <button
                  onClick={() => {
                    setShowFlow(true);
                    setShowCard(false); // Close dropdown when opening modal
                  }}
                  className="w-full px-3 py-2 rounded-md bg-white border text-xs font-medium text-slate-700 hover:bg-orange-50 transition-colors"
                >
                  Flow
                </button>

                {/* Change Password */}
                <button
                  onClick={() => {
                    setShowChangePassword(true);
                    setShowCard(false); // Close dropdown when opening modal
                  }}
                  className="w-full px-3 py-2 rounded-md bg-white border text-xs font-medium text-slate-700 hover:bg-orange-50 transition-colors"
                >
                  Change Password
                </button>
              </div>
            </div>
          )}

          {/* ✅ Divider */}
          <div className="w-px h-4 bg-slate-200 mx-1"></div>

          {/* ✅ Logout */}
          <button
            onClick={handleLogout}
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-full transition-colors"
          >
            <LogOut size={18} />
          </button>
        </div>
      </div>

      {/* ✅ Hero Section */}
      <div className="bg-slate-900 rounded-[2rem] p-6 mb-8 text-white relative overflow-hidden shadow-xl">
        <h2 className="text-2xl font-bold mb-2">What's happening?</h2>
        <p className="opacity-80 mb-4 max-w-xs">
          Check out the latest hostel notices and tonight's special dinner.
        </p>
        <button className="bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-sm hover:bg-orange-50 transition-colors">
          View Updates
        </button>

        <div className="absolute right-[-20px] bottom-[-20px] opacity-20">
          {renderIcon("Building", 150)}
        </div>
      </div>

      {/* ✅ Services Grid */}
      <h3 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
        Services
      </h3>

      <div className="grid grid-cols-2 gap-4 pb-20">
        {services.map((mod) => (
          <div
            key={mod.id}
            onClick={() => handleServiceClick(mod)}
            className={`relative p-5 rounded-[2rem] h-44 flex flex-col justify-between overflow-hidden shadow-lg border transition-all duration-200
              ${
                mod.isActive
                  ? "cursor-pointer hover:scale-[1.02] bg-white dark:bg-slate-800 dark:border-slate-700"
                  : "grayscale opacity-70 cursor-not-allowed bg-slate-100 dark:bg-slate-900"
              }`}
          >
            {!mod.isActive && (
              <div className="absolute top-4 right-4 text-slate-400">
                <Lock size={16} />
              </div>
            )}

            {mod.isActive && mod.isExternal && (
              <div className="absolute top-4 right-4 text-slate-300">
                <ExternalLink size={14} />
              </div>
            )}

            <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${mod.color} flex items-center justify-center text-white shadow-md`}>
              {renderIcon(mod.iconName, 24)}
            </div>

            <div>
              <h4 className="font-bold text-lg dark:text-white">{mod.title}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{mod.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ========================================= */}
      {/* ✅ MODALS (Placed at the root of the view) */}
      {/* ========================================= */}

      {/* 1. Flow Image Modal */}
      {showFlow && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          {/* Blurred background */}
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowFlow(false)}
          />

          {/* Modal box */}
          <div className="relative bg-white dark:bg-slate-900 rounded-xl shadow-2xl max-w-4xl w-[90%] max-h-[90%] p-4 z-10 animate-in zoom-in-95 duration-200">
            {/* Close button */}
            <button
              onClick={() => setShowFlow(false)}
              className="absolute -top-3 -right-3 w-8 h-8 rounded-full bg-white border shadow-md flex items-center justify-center text-slate-600 hover:bg-slate-100 z-20"
            >
              ✕
            </button>

            {/* Image */}
            <img
              src="https://res.cloudinary.com/dev55x8f7/image/upload/v1769401773/IMG_20260126_000802_wxguvw.png"
              alt="Flow Diagram"
              className="w-full max-h-[80vh] object-contain rounded-xl"
            />
          </div>
        </div>
      )}

      {/* 2. Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowChangePassword(false)}
          />

          <div className="relative w-[90%] max-w-[360px] bg-[#FFF7ED] rounded-2xl shadow-2xl p-6 z-10 animate-in slide-in-from-bottom-4 duration-200">
            
            {/* Close button */}
            <button
              onClick={() => setShowChangePassword(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              ✕
            </button>

            <h3 className="text-lg font-semibold text-orange-700 mb-6">
              Change Password
            </h3>

            <div className="relative mb-4">
              <input
                type={showNewPassword ? "text" : "password"}
                placeholder="New Password"
                value={newPassword}
                onChange={(e) => {
                  setNewPassword(e.target.value);
                  setPasswordError(validatePassword(e.target.value));
                }}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowNewPassword(!showNewPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600"
              >
                {showNewPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            <div className="relative mb-3">
              <input
                type={showConfirmPassword ? "text" : "password"}
                placeholder="Confirm Password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-xl border border-gray-300 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-400 bg-white"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 hover:text-orange-600"
              >
                {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>

            {passwordError && (
              <p className="text-xs text-red-500 mb-2">{passwordError}</p>
            )}

            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500 mb-2">Passwords do not match</p>
            )}

            <button
              onClick={handleChangePasswordSubmit}
              disabled={
                !!passwordError ||
                !newPassword ||
                newPassword !== confirmPassword
              }
              className="w-full mt-4 py-3 rounded-xl bg-orange-500 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-orange-600 transition-colors shadow-sm"
            >
              Update Password
            </button>
          </div>
        </div>
      )}
    </div>
  );
};