import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { motion } from "framer-motion";
import { registerUser, clearAuthError } from "../redux/slices/authSlice.js";
import { SITE } from "../data/site.js";

export default function SignUp() {
  const [form, setForm] = useState({ name: "", email: "", phone: "", password: "" });
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { loading, error, serverOffline } = useSelector((s) => s.auth);

  // A message left over from the other auth page is not about this form.
  useEffect(() => {
    dispatch(clearAuthError());
  }, [dispatch]);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    dispatch(clearAuthError());
    const res = await dispatch(registerUser(form));
    if (registerUser.fulfilled.match(res)) navigate("/account");
  };

  return (
    <div className="container-app py-10">
      <div className="mx-auto grid max-w-4xl grid-cols-1 overflow-hidden rounded-2xl shadow-card md:grid-cols-2">
        <div className="hidden flex-col justify-center bg-gradient-to-br from-brand-600 to-sky-500 p-10 text-white md:flex">
          <img src={SITE.mark} alt={SITE.name} className="mb-4 h-14 w-14 rounded-xl bg-white p-1.5" />
          <h2 className="mb-2 text-2xl font-bold">Join {SITE.name}</h2>
          <p className="text-white/85">
            Create an account to check out faster and keep every receipt in one place.
          </p>
        </div>

        <motion.form
          onSubmit={submit}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="bg-white p-8 dark:bg-slate-900"
        >
          <h1 className="mb-1 text-center text-xl font-bold">Create account</h1>
          <p className="mb-6 text-center text-sm text-slate-500">Join us and start shopping.</p>

          {serverOffline && (
            <div className="mb-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm
                            text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40
                            dark:text-amber-200">
              <p className="font-semibold">Saved in this browser only</p>
              <p className="mt-1">
                The CookMe server did not answer, so nothing reached the database.
                Start the backend (<code>npm run dev</code> in the backend folder) and
                try again to save it for real.
              </p>
            </div>
          )}

          {error && (
            <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-600 dark:bg-red-950/40">
              {error}
            </p>
          )}

          <label className="mb-1 block text-sm font-medium">Full name *</label>
          <input required value={form.name} onChange={set("name")} className="field mb-4" />

          <label className="mb-1 block text-sm font-medium">Email *</label>
          <input required type="email" value={form.email} onChange={set("email")} className="field mb-4" />

          <label className="mb-1 block text-sm font-medium">Phone number *</label>
          <input
            required
            value={form.phone}
            onChange={set("phone")}
            placeholder="01XXXXXXXXX"
            className="field mb-4"
          />

          <label className="mb-1 block text-sm font-medium">Password *</label>
          <input
            required
            type="password"
            minLength={6}
            value={form.password}
            onChange={set("password")}
            className="field mb-6"
          />

          <button disabled={loading} className="btn-primary w-full py-3">
            {loading ? "Creating account…" : "Create account"}
          </button>

          <p className="mt-4 text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link to="/signin" className="font-medium text-brand-600">Sign in</Link>
          </p>
        </motion.form>
      </div>
    </div>
  );
}
