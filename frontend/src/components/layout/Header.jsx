import { motion, AnimatePresence } from "framer-motion";
import { Menu, User, ChevronDown, X, Shield, Bell, Settings, BarChart3 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { API_BASE } from "../../config/api";
import { clearAuth, requireValidToken } from "../../utils/auth";

export default function Header({ setSidebarOpen }) {

  const [profileOpen, setProfileOpen] = useState(false);
  const [profileModalOpen, setProfileModalOpen] = useState(false);
  const username = localStorage.getItem("username");
  const settingsKey = useMemo(
    () => `profile_settings_${localStorage.getItem("token") || "guest"}`,
    []
  );
  const [profile, setProfile] = useState({
    name: username || "",
    email: "",
    role: "faculty",
    institute: "",
    department: "",
  });
  const [notify, setNotify] = useState({
    timetableComplete: true,
    conflictAlerts: true,
    reminders: false,
  });
  const [stats, setStats] = useState({
    rooms: 0,
    subjects: 0,
    teachers: 0,
    batches: 0,
    timetables: 0,
  });
  const [recent, setRecent] = useState([]);
  const [pwd, setPwd] = useState({ current: "", next: "" });
  const [status, setStatus] = useState("");

  const handleLogout = () => {
    clearAuth();
    window.location.replace("/");
  };

  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(settingsKey) || "{}");
      if (saved.profile) setProfile((p) => ({ ...p, ...saved.profile }));
      if (saved.notify) setNotify((n) => ({ ...n, ...saved.notify }));
    } catch {
      // ignore bad local settings
    }
  }, [settingsKey]);

  const saveLocalSettings = (nextProfile, nextNotify) => {
    localStorage.setItem(
      settingsKey,
      JSON.stringify({
        profile: nextProfile,
        notify: nextNotify,
      })
    );
  };

  const openProfile = async () => {
    setProfileOpen(false);
    setProfileModalOpen(true);
    setStatus("");
    const token = requireValidToken();
    if (!token) return handleLogout();
    try {
      const headers = { Authorization: `Bearer ${token}` };
      const [meRes, roomsRes, deptRes, teacherRes, batchRes, ttRes, groupRes] = await Promise.all([
        fetch(`${API_BASE}/auth/me`, { headers }),
        fetch(`${API_BASE}/classrooms/list`, { headers }),
        fetch(`${API_BASE}/departments/with-subjects`, { headers }),
        fetch(`${API_BASE}/teachers/`, { headers }),
        fetch(`${API_BASE}/batches/`, { headers }),
        fetch(`${API_BASE}/timetables`, { headers }),
        fetch(`${API_BASE}/groups/`, { headers }),
      ]);
      const [me, rooms, departments, teachers, batches, timetables, groups] = await Promise.all([
        meRes.json().catch(() => ({})),
        roomsRes.json().catch(() => []),
        deptRes.json().catch(() => []),
        teacherRes.json().catch(() => []),
        batchRes.json().catch(() => []),
        ttRes.json().catch(() => []),
        groupRes.json().catch(() => []),
      ]);
      setProfile((p) => ({
        ...p,
        name: me.username || p.name,
        email: me.email || p.email,
      }));
      const subjectCount = Array.isArray(departments)
        ? departments.reduce((acc, d) => acc + ((d.subjects || []).length || 0), 0)
        : 0;
      setStats({
        rooms: Array.isArray(rooms) ? rooms.length : 0,
        subjects: subjectCount,
        teachers: Array.isArray(teachers) ? teachers.length : 0,
        batches: Array.isArray(batches) ? batches.length : 0,
        timetables: Array.isArray(timetables) ? timetables.length : 0,
      });
      const activities = [];
      (Array.isArray(timetables) ? timetables.slice(0, 3) : []).forEach((t) => {
        activities.push({
          text: `Generated timetable #${t.timetable_id}`,
          at: t.created_at || "recently",
        });
      });
      (Array.isArray(groups) ? groups.slice(0, 2) : []).forEach((g) => {
        activities.push({
          text: `Group available: ${g.group_name}`,
          at: "recently",
        });
      });
      setRecent(activities);
    } catch {
      setStatus("Could not load profile data right now.");
    }
  };

  const onSavePreferences = () => {
    saveLocalSettings(profile, notify);
    setStatus("Profile settings saved.");
  };

  const onChangePassword = async () => {
    const token = requireValidToken();
    if (!token) return handleLogout();
    setStatus("");
    try {
      const res = await fetch(`${API_BASE}/auth/change-password`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          current_password: pwd.current,
          new_password: pwd.next,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.detail || "Password change failed");
      setPwd({ current: "", next: "" });
      setStatus("Password updated successfully.");
    } catch (e) {
      setStatus(e.message || "Password change failed.");
    }
  };

  const onLogoutAll = async () => {
    const token = requireValidToken();
    if (!token) return handleLogout();
    try {
      await fetch(`${API_BASE}/auth/logout-all`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
    } finally {
      clearAuth();
      window.location.replace("/");
    }
  };

  return (
    <header className="flex justify-between items-center px-3 sm:px-4 md:px-6 py-3 bg-[#5523AB] shadow-md">
      
      <div className="flex items-center gap-4">
        <button
          className="md:hidden p-2 hover:bg-white/20 rounded-lg"
          onClick={() => setSidebarOpen(prev => !prev)}
        >
          <Menu className="w-6 h-6 text-white" />
        </button>

        <a
          href="/welcome"
          className="font-bold text-2xl md:text-3xl text-white hover:text-yellow-400 transition"
        >
          SchedNova
        </a>
      </div>

      <div className="relative">
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-white/20"
          onClick={() => setProfileOpen(prev => !prev)}
        >
          <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-black font-bold">
            <User className="w-5 h-5" />
          </div>
          <span className="max-w-28 sm:max-w-40 truncate text-sm sm:text-base">
            {username || "User"}
          </span>
          <ChevronDown className="w-4 h-4 text-white" />
        </motion.button>

        <AnimatePresence>
          {profileOpen && (
            <motion.div
              initial={{ y: -10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: -10, opacity: 0 }}
              className="absolute right-0 mt-2 w-40 bg-[#3B0D91] shadow-lg rounded-lg overflow-hidden z-10"
            >
              <button
                onClick={openProfile}
                className="w-full text-left block px-4 py-3 text-white hover:bg-yellow-400 hover:text-black"
              >
                Profile
              </button>
              <button
                onClick={handleLogout}
                className="w-full text-left px-4 py-3 text-white hover:bg-red-600"
              >
                Logout
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {profileModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[60] bg-black/60 p-4 overflow-y-auto"
          >
            <div className="max-w-4xl mx-auto mt-4 md:mt-10 rounded-2xl border border-white/10 bg-[#2d1360] shadow-2xl">
              <div className="flex items-center justify-between p-5 border-b border-white/10">
                <h3 className="text-xl font-bold">Profile</h3>
                <button onClick={() => setProfileModalOpen(false)} className="text-white/70 hover:text-white">
                  <X className="w-5 h-5" />
                </button>
              </div>
              <div className="p-3 sm:p-4 md:p-5 grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-5">
                <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2"><User className="w-4 h-4" /> Basic account info</h4>
                  <input className="w-full px-3 py-2 rounded bg-purple-950/60 border border-white/10" value={profile.name} onChange={(e) => setProfile((p) => ({ ...p, name: e.target.value }))} placeholder="Name" />
                  <input className="w-full px-3 py-2 rounded bg-purple-950/60 border border-white/10" value={profile.email} onChange={(e) => setProfile((p) => ({ ...p, email: e.target.value }))} placeholder="Email" />
                  <select className="w-full px-3 py-2 rounded bg-purple-950/60 border border-white/10" value={profile.role} onChange={(e) => setProfile((p) => ({ ...p, role: e.target.value }))}>
                    <option value="admin">admin</option>
                    <option value="faculty">faculty</option>
                    <option value="coordinator">coordinator</option>
                  </select>
                  <input className="w-full px-3 py-2 rounded bg-purple-950/60 border border-white/10" value={profile.institute} onChange={(e) => setProfile((p) => ({ ...p, institute: e.target.value }))} placeholder="Institute" />
                  <input className="w-full px-3 py-2 rounded bg-purple-950/60 border border-white/10" value={profile.department} onChange={(e) => setProfile((p) => ({ ...p, department: e.target.value }))} placeholder="Department" />
                </section>

                <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2"><Bell className="w-4 h-4" /> Notifications</h4>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notify.timetableComplete} onChange={(e) => setNotify((n) => ({ ...n, timetableComplete: e.target.checked }))} /> Timetable generation complete</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notify.conflictAlerts} onChange={(e) => setNotify((n) => ({ ...n, conflictAlerts: e.target.checked }))} /> Conflict alerts</label>
                  <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={notify.reminders} onChange={(e) => setNotify((n) => ({ ...n, reminders: e.target.checked }))} /> Reminder toggles</label>
                </section>

                <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2"><BarChart3 className="w-4 h-4" /> Data summary</h4>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="rounded bg-white/5 p-2">Rooms: <b>{stats.rooms}</b></div>
                    <div className="rounded bg-white/5 p-2">Subjects: <b>{stats.subjects}</b></div>
                    <div className="rounded bg-white/5 p-2">Teachers: <b>{stats.teachers}</b></div>
                    <div className="rounded bg-white/5 p-2">Batches: <b>{stats.batches}</b></div>
                    <div className="rounded bg-white/5 p-2 col-span-2">Saved timetables: <b>{stats.timetables}</b></div>
                  </div>
                  <h4 className="font-semibold pt-2">Recent activity</h4>
                  <div className="space-y-2 text-sm text-white/80">
                    {recent.length === 0 ? <p className="text-white/50">No recent activity</p> : recent.map((r, i) => <p key={i}>• {r.text} <span className="text-white/40">({r.at})</span></p>)}
                  </div>
                </section>

                <section className="rounded-xl bg-white/5 border border-white/10 p-4 space-y-3">
                  <h4 className="font-semibold flex items-center gap-2"><Shield className="w-4 h-4" /> Security</h4>
                  <input type="password" className="w-full px-3 py-2 rounded bg-purple-950/60 border border-white/10" value={pwd.current} onChange={(e) => setPwd((p) => ({ ...p, current: e.target.value }))} placeholder="Current password" />
                  <input type="password" className="w-full px-3 py-2 rounded bg-purple-950/60 border border-white/10" value={pwd.next} onChange={(e) => setPwd((p) => ({ ...p, next: e.target.value }))} placeholder="New password" />
                  <div className="flex gap-2">
                    <button onClick={onChangePassword} className="px-3 py-2 rounded bg-yellow-400 text-purple-900 font-semibold text-sm">Change password</button>
                    <button onClick={onLogoutAll} className="px-3 py-2 rounded bg-red-500/25 border border-red-400/40 text-red-100 text-sm">Logout all devices</button>
                  </div>
                  <div className="text-xs text-white/50">
                    Active sessions: current device only (stateless token mode).
                  </div>
                </section>
              </div>
              <div className="px-5 pb-5 flex items-center justify-between">
                <p className="text-sm text-yellow-200">{status}</p>
                <button onClick={onSavePreferences} className="px-4 py-2 rounded bg-white/15 hover:bg-white/20 text-sm font-semibold">Save profile settings</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </header>
  );
}
