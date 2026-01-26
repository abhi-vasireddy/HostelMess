import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogOut, Lock, ExternalLink } from "lucide-react";

import { useAuth } from "../App";
import { MockDB } from "../services/mockDb";
import { ServiceModule } from "../types";
import { ICON_MAP } from "../services/iconMap";
import { Eye, EyeOff } from "lucide-react";


export const HomeHub = () => {
  const navigate = useNavigate();
  const { user, logout } = useAuth();

  const [services, setServices] = useState<ServiceModule[]>([]);
  const [loading, setLoading] = useState(true);
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

  // ✅ Service Click
  const handleServiceClick = (mod: ServiceModule) => {
    if (!mod.isActive) return;

    if (mod.isExternal && mod.path) {
      window.open(mod.path, "_blank");
    } else if (mod.path) {
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
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 p-6 animate-in fade-in">
      {/* ✅ Header */}
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-white">
            Campus<span className="text-orange-500">Hub</span>
          </h1>
          <p className="text-slate-500 font-medium">
            Welcome back, {firstName}
          </p>
        </div>

        {/* Profile + Logout */}
        <div className="flex items-center gap-2 bg-white dark:bg-slate-900 p-1.5 pr-2 rounded-full border shadow-sm">

          {/* Avatar */}
          <div
            onClick={() => setShowCard(true)}
            className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-100 to-slate-200 flex items-center justify-center font-bold text-slate-600 cursor-pointer"
          >
            {initial}
          </div>

          {/* Popup Card */}
          {showCard && (
            <div className="absolute right-6 top-20 w-[280px] p-4 bg-[#FFF7ED] rounded-xl shadow-lg z-50 ">

              {/* Header Row */}
              <div className="flex flex-col items-start gap-2 items-center mb-4">
                <button
                  onClick={() => {
                    setShowCard(false);
                    setShowFlow(false);
                  }}
                  className="w-9 h-9 rounded-full bg-white border flex items-center justify-center"
                >
                  ←
                </button>

                
                
                  {/* Flow Button */}
                  <button
                    onClick={() => setShowFlow(true)}
                    className="px-3 py-1 rounded-md bg-white border text-xs"
                  >
                    Flow
                  </button>

                  {showFlow && (
  <div className="fixed inset-0 z-50 flex items-center justify-center">
    
    {/* Blurred background */}
    <div
      className="absolute inset-0 bg-black/30 backdrop-blur-sm"
      onClick={() => setShowFlow(false)}
    />

    {/* Modal box */}
    <div className="relative bg-white rounded-xl shadow-2xl
                    max-w-4xl w-[90%] max-h-[90%] p-4 z-10">

      {/* Close button */}
      <button
        onClick={() => setShowFlow(false)}
        className="absolute top-3 right-3 w-8 h-8
                   rounded-full bg-white border
                   flex items-center justify-center
                   text-slate-600 hover:bg-slate-100"
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

                  {/* Change Password */}
                  <button
                    onClick={() => setShowChangePassword(true)}
                    className="px-3 py-1 rounded-md bg-white border text-xs"
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
            className="p-1.5 text-slate-400 hover:text-red-500 rounded-full"
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
        <button className="bg-white text-slate-900 px-4 py-2 rounded-xl font-bold text-sm">
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
            className={`relative p-5 rounded-[2rem] h-44 flex flex-col justify-between overflow-hidden shadow-lg border
              ${
                mod.isActive
                  ? "cursor-pointer hover:scale-[1.02] bg-white"
                  : "grayscale opacity-70 cursor-not-allowed bg-slate-100"
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
              <h4 className="font-bold text-lg">{mod.title}</h4>
              <p className="text-xs text-slate-500 mt-1">{mod.description}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ✅ Change Password Modal */}
      {showChangePassword && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/30"
            onClick={() => setShowChangePassword(false)}
          />

          <div className="relative w-[360px] bg-[#FFF7ED] rounded-2xl shadow-xl p-6 z-10">
            <h3 className="text-lg font-semibold text-orange-700 mb-4">
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
    className="w-full px-4 py-3 rounded-xl border border-gray-300 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-400"
  />

  {/* 👁 Eye Icon inside input */}
  <button
    type="button"
    onClick={() => setShowNewPassword(!showNewPassword)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-600"
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
    className="w-full px-4 py-3 rounded-xl border border-gray-300 pr-12 focus:outline-none focus:ring-2 focus:ring-orange-400"
  />

  {/* 👁 Eye Icon inside input */}
  <button
    type="button"
    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
    className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-500 hover:text-orange-600"
  >
    {showConfirmPassword ? <EyeOff size={20} /> : <Eye size={20} />}
  </button>
</div>


            {passwordError && (
              <p className="text-xs text-red-500">{passwordError}</p>
            )}

            {confirmPassword && newPassword !== confirmPassword && (
              <p className="text-xs text-red-500">Passwords do not match</p>
            )}

            <button
              onClick={handleChangePasswordSubmit}
              disabled={
                !!passwordError ||
                !newPassword ||
                newPassword !== confirmPassword
              }
              className="w-full mt-3 py-2 rounded-md bg-orange-500 text-white font-medium"
            >
              Submit
            </button>
          </div>
        </div>
      )}
    </div>
  );
};