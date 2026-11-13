"use client";

import {
  useCallback,
  useEffect,
  useMemo,
  useState,
  type FormEvent,
} from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  BadgeIndianRupee,
  BarChart3,
  Check,
  CheckCircle2,
  ChevronDown,
  CircleDollarSign,
  Copy,
  CreditCard,
  Gamepad2,
  Globe,
  LayoutDashboard,
  LoaderCircle,
  LockKeyhole,
  Mail,
  MessageSquare,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Search,
  Settings2,
  Shield,
  ShieldCheck,
  Tags,
  Users,
  UserCog,
  UserRoundCheck,
  Wallet,
  X,
  AlertTriangle,
  ExternalLink,
  Eye,
  PauseCircle,
  PlayCircle,
  ListChecks,
} from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useAdmin } from "@/contexts/AdminContext";
import { useToast } from "@/contexts/ToastContext";
import ContactMessages from "@/components/ContactMessages";

type Section =
  | "overview"
  | "users"
  | "team"
  | "affiliates"
  | "plans"
  | "subscriptions"
  | "payments"
  | "games"
  | "categories"
  | "messages"
  | "feedback"
  | "settings"
  | "audit";
type Role = "super_admin" | "subadmin" | "affiliate" | "user";
type Permission = { key: string; label: string; description: string };
type AnyRecord = Record<string, any>;

const navItems: {
  key: Section;
  label: string;
  icon: any;
  permission?: string;
  affiliateOnly?: boolean;
  hideForAffiliate?: boolean;
}[] = [
    {
      key: "overview",
      label: "Overview",
      icon: LayoutDashboard,
      permission: "dashboard.view",
    },
    { key: "users", label: "Users", icon: Users, permission: "users.view" },
    {
      key: "team",
      label: "Team & access",
      icon: UserCog,
      permission: "staff.manage",
      hideForAffiliate: true,
    },
    {
      key: "affiliates",
      label: "Affiliate marketing",
      icon: UserRoundCheck,
      permission: "affiliates.view",
    },
    {
      key: "plans",
      label: "Plans & pricing",
      icon: BadgeIndianRupee,
      permission: "plans.manage",
      hideForAffiliate: true,
    },
    {
      key: "subscriptions",
      label: "Subscriptions",
      icon: CreditCard,
      permission: "subscriptions.view",
      hideForAffiliate: true,
    },
    {
      key: "payments",
      label: "Payments",
      icon: Wallet,
      permission: "payments.view",
      hideForAffiliate: true,
    },
    {
      key: "games",
      label: "Games",
      icon: Gamepad2,
      permission: "games.manage",
      hideForAffiliate: true,
    },
    {
      key: "categories",
      label: "Categories",
      icon: Tags,
      permission: "categories.manage",
      hideForAffiliate: true,
    },
    {
      key: "messages",
      label: "Contact messages",
      icon: MessageSquare,
      permission: "messages.view",
      hideForAffiliate: true,
    },
    {
      key: "feedback",
      label: "Feedback & reviews",
      icon: ListChecks,
      permission: "feedback.view",
      hideForAffiliate: true,
    },
    {
      key: "settings",
      label: "Settings & Razorpay",
      icon: Settings2,
      permission: "settings.manage",
      hideForAffiliate: true,
    },
    {
      key: "audit",
      label: "Audit log",
      icon: Activity,
      permission: "audit.view",
      hideForAffiliate: true,
    },
  ];

const defaultPlan = {
  id: null as number | null,
  code: "",
  name: "",
  description: "",
  priceRupees: 0,
  currency: "INR",
  durationDays: 30 as number | null,
  gameAccessMode: "all",
  gameIds: [] as string[],
  featuresText: "",
  isActive: false,
  displayOrder: 0,
};
const defaultGame = {
  id: "",
  name: "",
  path: "",
  thumbnail: "",
  description: "",
  categoriesText: "Arcade",
  isFeatured: false,
};
const emptySettings = {
  site: {
    siteName: "Sportrz",
    supportEmail: "",
    maintenanceMode: false,
    registrationEnabled: true,
  },
  razorpay: {
    keyId: "",
    secret: "",
    secretConfigured: false,
    webhookSecret: "",
    webhookSecretConfigured: false,
    mode: "test" as "test" | "live",
  },
  smtp: { configured: false, host: "", port: 465, sender: "" },
};

async function api<T = AnyRecord>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    cache: "no-store",
    ...init,
    headers: {
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
      ...(init?.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok)
    throw new Error(data.error || `Request failed (${response.status})`);
  return data as T;
}

function money(value: number, currency = "INR") {
  try {
    return new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency,
      maximumFractionDigits: 2,
    }).format(Number(value || 0));
  } catch {
    return `${currency} ${Number(value || 0).toFixed(2)}`;
  }
}
function currencyBreakdown(values: any[], amountKey = "amount") {
  if (!Array.isArray(values) || !values.length) return "—";
  return values
    .map(
      (item) =>
        `${money(Number(item[amountKey] || 0), String(item.currency || "INR"))}`,
    )
    .join(" · ");
}
function dateLabel(value: unknown) {
  if (!value) return "—";
  const date = new Date(value as string);
  return Number.isNaN(date.getTime())
    ? "—"
    : date.toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" });
}
function StatusPill({ value }: { value: string }) {
  const normalized = value.toLowerCase();
  const good = [
    "active",
    "captured",
    "paid",
    "approved",
    "success",
    "qualified",
    "read",
    "sent",
  ].includes(normalized);
  const warning = [
    "pending",
    "created",
    "authorized",
    "unread",
    "paused",
    "sending",
  ].includes(normalized);
  const danger = ["failed", "reversed", "rejected", "suspended"].includes(
    normalized,
  );
  return (
    <span
      className={`inline-flex rounded-full px-2.5 py-1 text-xs font-semibold capitalize ${good ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-100" : warning ? "bg-amber-50 text-amber-700 ring-1 ring-amber-100" : danger ? "bg-rose-50 text-rose-700 ring-1 ring-rose-100" : "bg-slate-100 text-slate-600 ring-1 ring-slate-200"}`}
    >
      {value.replace(/_/g, " ")}
    </span>
  );
}
function SectionHeading({
  title,
  description,
  action,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
      <div>
        <h2 className="text-xl font-bold tracking-tight text-slate-950 sm:text-2xl">
          {title}
        </h2>
        <p className="mt-1 text-sm text-slate-500">{description}</p>
      </div>
      {action}
    </div>
  );
}
function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-slate-700">
        {label}
      </span>
      {children}
    </label>
  );
}
const inputClass =
  "w-full rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-900 outline-none transition placeholder:text-slate-400 focus:border-orange-400 focus:ring-4 focus:ring-orange-100";
const btnPrimary =
  "inline-flex items-center justify-center gap-2 rounded-xl bg-orange-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-orange-700 disabled:cursor-not-allowed disabled:opacity-50";
const btnSecondary =
  "inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm font-semibold text-slate-700 transition hover:bg-slate-50 disabled:opacity-50";

export default function AdminPanel() {
  const { currentUser } = useAuth();
  const { isAdmin, loading: authLoading } = useAdmin();
  const { showToast } = useToast();
  const router = useRouter();
  const [active, setActive] = useState<Section>("overview");
  const [booting, setBooting] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [admin, setAdmin] = useState<AnyRecord | null>(null);
  const [stats, setStats] = useState<AnyRecord[]>([]);
  const [users, setUsers] = useState<AnyRecord[]>([]);
  const [showUserModal, setShowUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<AnyRecord | null>(null);
  const [userForm, setUserForm] = useState({ email: "", displayName: "" });
  const [usersSearch, setUsersSearch] = useState("");
  const [usersStatus, setUsersStatus] = useState("all");
  const [usersRole, setUsersRole] = useState("all");
  const [userPagination, setUserPagination] = useState<AnyRecord>({
    page: 1,
    pages: 1,
    total: 0,
  });
  const [staff, setStaff] = useState<AnyRecord[]>([]);
  const [permissionCatalog, setPermissionCatalog] = useState<Permission[]>([]);
  const [staffForm, setStaffForm] = useState({
    email: "",
    role: "subadmin" as "subadmin" | "affiliate",
    commissionPercent: "10",
    affiliateType: "admin_created",
    websiteUrl: "",
    permissions: ["dashboard.view", "users.view"] as string[],
  });
  const [editingStaff, setEditingStaff] = useState<AnyRecord | null>(null);
  const [affiliates, setAffiliates] = useState<AnyRecord[]>([]);
  const [editingAffiliate, setEditingAffiliate] = useState<AnyRecord | null>(
    null,
  );
  const [commissionLedger, setCommissionLedger] = useState<AnyRecord[]>([]);
  const [affiliateApplications, setAffiliateApplications] = useState<
    AnyRecord[]
  >([]);
  const [myAffiliate, setMyAffiliate] = useState<AnyRecord | null>(null);
  const [myReferrals, setMyReferrals] = useState<AnyRecord[]>([]);
  const [affiliateCommissions, setAffiliateCommissions] = useState<AnyRecord[]>(
    [],
  );
  const [affiliateTransactions, setAffiliateTransactions] = useState<
    AnyRecord[]
  >([]);
  const [affiliatePostback, setAffiliatePostback] = useState<AnyRecord | null>(
    null,
  );
  const [affiliateClickStats, setAffiliateClickStats] = useState({ total: 0, converted: 0 });
  const [plans, setPlans] = useState<AnyRecord[]>([]);
  const [planForm, setPlanForm] = useState<AnyRecord>(defaultPlan);
  const [planGameSearch, setPlanGameSearch] = useState("");
  const [planGameOptions, setPlanGameOptions] = useState<AnyRecord[]>([]);
  const [editingPlan, setEditingPlan] = useState(false);
  const [showPlanModal, setShowPlanModal] = useState(false);
  const [subscriptions, setSubscriptions] = useState<AnyRecord[]>([]);
  const [subStatus, setSubStatus] = useState("all");
  const [assignSub, setAssignSub] = useState({
    email: "",
    planCode: "",
    durationDays: "",
  });
  const [editingSubscription, setEditingSubscription] =
    useState<AnyRecord | null>(null);
  const [payments, setPayments] = useState<AnyRecord[]>([]);
  const [paymentStatus, setPaymentStatus] = useState("all");
  const [games, setGames] = useState<AnyRecord[]>([]);
  const [gameForm, setGameForm] = useState<AnyRecord>(defaultGame);
  const [editingGame, setEditingGame] = useState(false);
  const [showGameModal, setShowGameModal] = useState(false);
  const [categories, setCategories] = useState<AnyRecord[]>([]);
  const [categoryName, setCategoryName] = useState("");
  const [categoryOrder, setCategoryOrder] = useState("0");
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<AnyRecord | null>(
    null,
  );
  const [categoryForm, setCategoryForm] = useState({
    name: "",
    displayOrder: "0",
    isActive: true,
  });
  const [feedback, setFeedback] = useState<AnyRecord[]>([]);
  const [reviews, setReviews] = useState<AnyRecord[]>([]);
  const [settings, setSettings] = useState<AnyRecord>(emptySettings);
  const [auditEvents, setAuditEvents] = useState<AnyRecord[]>([]);

  const perms = useMemo(
    () => new Set<string>(admin?.permissions || []),
    [admin],
  );
  const can = useCallback(
    (permission: string) =>
      admin?.role === "super_admin" || perms.has("*") || perms.has(permission),
    [admin, perms],
  );
  const visibleNav = useMemo(
    () =>
      navItems.filter((item) => {
        if (item.hideForAffiliate && admin?.isAffiliate) return false;
        if (item.permission && !can(item.permission)) return false;
        return true;
      }),
    [admin, can],
  );

  useEffect(() => {
    if (authLoading) return;
    if (!currentUser) {
      router.replace("/login");
      return;
    }
    if (!isAdmin) {
      router.replace("/");
      return;
    }
    let alive = true;
    (async () => {
      try {
        const data = await api<AnyRecord>("/api/admin/me");
        if (!alive) return;
        setAdmin(data);
        setPermissionCatalog(data.permissionCatalog || []);
        if (data.affiliate) setMyAffiliate(data.affiliate);
      } catch (error) {
        if (alive)
          setMessage(
            error instanceof Error
              ? error.message
              : "Unable to load admin access.",
          );
      } finally {
        if (alive) setBooting(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [authLoading, currentUser, isAdmin, router]);

  const refreshCurrent = useCallback(async () => {
    setBusy(true);
    setMessage("");
    try {
      if (active === "overview") {
        const data = await api<AnyRecord>("/api/admin/dashboard");
        setStats(data.stats || []);
        if (admin?.isAffiliate) {
          const [affiliateData, postbackData] = await Promise.all([
            api<AnyRecord>("/api/admin/affiliates"),
            api<AnyRecord>("/api/affiliate/postback"),
          ]);
          const profile = affiliateData.affiliate || null;
          setMyAffiliate(
            profile
              ? {
                ...profile,
                referralUrl: profile.referralUrl || profile.referral_url,
              }
              : null,
          );
          setMyReferrals(affiliateData.referrals || []);
          setAffiliateCommissions(affiliateData.commissions || []);
          setAffiliateTransactions(affiliateData.commissionTransactions || []);
          setAffiliateClickStats(affiliateData.clickStats || { total: 0, converted: 0 });
          setAffiliatePostback(postbackData);
        }
      }
      if (active === "users") {
        const params = new URLSearchParams({
          q: usersSearch,
          status: usersStatus,
          role: usersRole,
          page: String(userPagination.page || 1),
          pageSize: "25",
        });
        const data = await api<AnyRecord>(`/api/admin/users?${params}`);
        setUsers(data.users || []);
        setUserPagination(data.pagination || { page: 1, pages: 1, total: 0 });
      }
      if (active === "team") {
        const data = await api<AnyRecord>("/api/admin/staff");
        setStaff(data.staff || []);
        if (
          Array.isArray(data.permissionCatalog) &&
          data.permissionCatalog.length
        )
          setPermissionCatalog(data.permissionCatalog);
      }
      if (active === "affiliates") {
        const data = await api<AnyRecord>("/api/admin/affiliates");
        if (admin?.isAffiliate) {
          const postbackData = await api<AnyRecord>("/api/affiliate/postback");
          const profile = data.affiliate || null;
          setMyAffiliate(
            profile
              ? {
                ...profile,
                referralUrl: profile.referralUrl || profile.referral_url,
              }
              : null,
          );
          setMyReferrals(data.referrals || []);
          setAffiliateCommissions(data.commissions || []);
          setAffiliateTransactions(data.commissionTransactions || []);
          setAffiliateClickStats(data.clickStats || { total: 0, converted: 0 });
          setAffiliatePostback(postbackData);
        } else {
          setAffiliates(data.affiliates || []);
          setCommissionLedger(data.commissionLedger || []);
          setAffiliateApplications(data.applications || []);
        }
      }
      if (active === "plans") {
        const data = await api<AnyRecord>("/api/admin/plans");
        setPlans(data.plans || []);
        setPlanGameOptions(data.availableGames || []);
      }
      if (active === "subscriptions") {
        const [data, planData] = await Promise.all([
          api<AnyRecord>(
            `/api/admin/subscriptions?status=${encodeURIComponent(subStatus)}`,
          ),
          api<AnyRecord>("/api/admin/plans"),
        ]);
        setSubscriptions(data.subscriptions || []);
        setPlans(planData.plans || []);
        setPlanGameOptions(planData.availableGames || []);
      }
      if (active === "payments") {
        const data = await api<AnyRecord>(
          `/api/admin/payments?status=${encodeURIComponent(paymentStatus)}`,
        );
        setPayments(data.payments || []);
      }
      if (active === "games") {
        const data = await api<any>("/api/admin/games");
        setGames(Array.isArray(data) ? data : data.games || []);
      }
      if (active === "categories") {
        const data = await api<AnyRecord>("/api/admin/categories");
        setCategories(data.categories || []);
      }
      if (active === "feedback") {
        const data = await api<AnyRecord>("/api/admin/feedback");
        setFeedback(data.feedback || []);
        setReviews(data.reviews || []);
      }
      if (active === "settings") {
        const data = await api<AnyRecord>("/api/admin/settings");
        setSettings(data);
      }
      if (active === "audit") {
        const data = await api<AnyRecord>("/api/admin/audit");
        setAuditEvents(data.events || []);
      }
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Unable to load this section.",
      );
    } finally {
      setBusy(false);
    }
  }, [
    active,
    usersSearch,
    usersStatus,
    usersRole,
    userPagination.page,
    subStatus,
    paymentStatus,
    admin?.isAffiliate,
  ]);

  useEffect(() => {
    if (!booting && admin) void refreshCurrent();
  }, [active, booting, admin, refreshCurrent]);

  const act = useCallback(
    async (
      url: string,
      method: string,
      body?: unknown,
      successMessage = "Changes saved.",
    ) => {
      setBusy(true);
      setMessage("");
      try {
        await api(url, {
          method,
          body: body === undefined ? undefined : JSON.stringify(body),
        });
        showToast(successMessage, "success");
        await refreshCurrent();
        return true;
      } catch (error) {
        const text = error instanceof Error ? error.message : "Request failed.";
        setMessage(text);
        showToast(text, "error");
        return false;
      } finally {
        setBusy(false);
      }
    },
    [refreshCurrent, showToast],
  );

  const selectSection = (section: Section) => {
    setMessage("");
    setActive(section);
  };

  if (authLoading || booting)
    return (
      <div className="flex min-h-[65vh] items-center justify-center bg-slate-50">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-600" />
          Loading secure admin workspace…
        </div>
      </div>
    );
  if (!currentUser || !isAdmin || !admin)
    return (
      <div className="mx-auto my-16 max-w-xl rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-900">
        <h1 className="font-bold">Admin access not ready</h1>
        <p className="mt-2 text-sm">
          {message ||
            "Make sure the admin migration has been run and your user is assigned an admin role."}
        </p>
        <p className="mt-3 text-sm font-semibold">
          Run <code>npm run db:migrate:admin</code> from the project folder,
          then sign in again.
        </p>
      </div>
    );

  const renderOverview = () => (
    <>
      <SectionHeading
        title={
          admin.isAffiliate ? "Affiliate performance" : "Workspace overview"
        }
        description={
          admin.isAffiliate
            ? "Only your own referred users and attributed activity are shown here."
            : "A live snapshot of your games business, memberships, and revenue."
        }
        action={
          <button
            onClick={() => void refreshCurrent()}
            className={btnSecondary}
          >
            <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />{" "}
            Refresh
          </button>
        }
      />
      <div
        className={`grid grid-cols-1 gap-4 sm:grid-cols-2 ${admin.isAffiliate ? "xl:grid-cols-3" : "xl:grid-cols-4"}`}
      >
        {stats.map((stat) => (
          <div
            key={stat.key}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-center justify-between gap-3">
              <span className="text-sm font-medium text-slate-500">
                {stat.label}
              </span>
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-50 text-orange-600">
                {stat.key.toLowerCase().includes("revenue") || stat.currency ? (
                  <CircleDollarSign className="h-5 w-5" />
                ) : stat.key.toLowerCase().includes("user") ? (
                  <Users className="h-5 w-5" />
                ) : (
                  <BarChart3 className="h-5 w-5" />
                )}
              </span>
            </div>
            <div className="mt-4 text-3xl font-bold tracking-tight text-slate-950">
              {stat.currency
                ? money(stat.value, stat.currency)
                : Number(stat.value || 0).toLocaleString("en-IN")}
            </div>
            {stat.subvalue && (
              <p className="mt-1 text-xs text-slate-500">{stat.subvalue}</p>
            )}
          </div>
        ))}
      </div>
      {admin.isAffiliate && myAffiliate && (
        <div className="mt-6 rounded-2xl border border-orange-200 bg-gradient-to-r from-orange-50 to-white p-5">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <p className="text-xs font-bold uppercase tracking-widest text-orange-700">
                Your unique referral link
              </p>
              <p className="mt-2 break-all text-sm font-semibold text-slate-800">
                {myAffiliate.referralUrl ||
                  `${window.location.origin}/r/${myAffiliate.referral_code}`}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Commission rate: {Number(myAffiliate.commission_percent || 0)}%
                · Status: {myAffiliate.status}
              </p>
            </div>
            <button
              className={btnPrimary}
              onClick={() => {
                navigator.clipboard
                  .writeText(
                    myAffiliate.referralUrl ||
                    `${window.location.origin}/r/${myAffiliate.referral_code}`,
                  )
                  .then(() => showToast("Referral link copied.", "success"))
                  .catch(() => showToast("Could not copy the link.", "error"));
              }}
            >
              <Copy className="h-4 w-4" /> Copy link
            </button>
          </div>
        </div>
      )}
      {admin.isAffiliate && (
        <div className="mt-7">
          <SectionHeading
            title="My latest commissions"
            description="Order IDs, payment IDs, sale amounts, and commission values from your own referred customers only."
          />
          <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
            <table className="min-w-[1050px] w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3">Order ID</th>
                  <th className="px-4 py-3">Customer / plan</th>
                  <th className="px-4 py-3">Payment ID</th>
                  {myAffiliate?.affiliate_type === "external_website" && (
                    <th className="px-4 py-3">Click ID</th>
                  )}
                  <th className="px-4 py-3">Sale amount</th>
                  <th className="px-4 py-3">Rate</th>
                  <th className="px-4 py-3">Your commission</th>
                  <th className="px-4 py-3">Status</th>
                  {myAffiliate?.affiliate_type === "external_website" && (
                    <th className="px-4 py-3">Postback</th>
                  )}
                  <th className="px-4 py-3">Paid date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {affiliateTransactions.slice(0, 8).map((row) => (
                  <tr key={row.id}>
                    <td className="max-w-[190px] break-all px-4 py-3 font-mono text-xs">
                      {row.orderId || "—"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {row.referredName || row.referredEmail}
                      </div>
                      <div className="text-xs text-slate-500">
                        {row.planName} · {row.referredEmail}
                      </div>
                    </td>
                    <td className="max-w-[180px] break-all px-4 py-3 font-mono text-xs">
                      {row.paymentId || "—"}
                    </td>
                    {myAffiliate?.affiliate_type === "external_website" && (
                      <td className="max-w-[150px] break-all px-4 py-3 font-mono text-xs">
                        {row.clickId || "—"}
                      </td>
                    )}
                    <td className="px-4 py-3">
                      {money(row.amount, row.currency)}
                    </td>
                    <td className="px-4 py-3">
                      {Number(row.commissionPercent || 0)}%
                    </td>
                    <td className="px-4 py-3 font-semibold">
                      {money(row.commission, row.currency)}
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill value={row.status} />
                    </td>
                    {myAffiliate?.affiliate_type === "external_website" && (
                      <td className="px-4 py-3">
                        <StatusPill
                          value={row.postbackStatus || "not_configured"}
                        />
                        {row.postbackHttpStatus != null && (
                          <div className="mt-1 text-[11px] text-slate-500">
                            HTTP {row.postbackHttpStatus}
                          </div>
                        )}
                      </td>
                    )}
                    <td className="whitespace-nowrap px-4 py-3 text-xs">
                      {dateLabel(row.paidAt || row.createdAt)}
                    </td>
                  </tr>
                ))}
                {!affiliateTransactions.length && (
                  <tr>
                    <td
                      colSpan={
                        myAffiliate?.affiliate_type === "external_website"
                          ? 10
                          : 8
                      }
                      className="p-8 text-center text-sm text-slate-500"
                    >
                      No verified commission transactions yet. Orders appear
                      here after a referred customer completes a captured
                      payment.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 text-right">
            <button
              className={btnSecondary}
              onClick={() => selectSection("affiliates")}
            >
              View full affiliate details <ExternalLink className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!admin.isAffiliate && (
        <div className="mt-6 grid gap-5 xl:grid-cols-[1.2fr_0.8fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h3 className="font-bold text-slate-900">Quick actions</h3>
            <p className="mt-1 text-sm text-slate-500">
              Jump straight to frequent admin tasks.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              {[
                [
                  "Manage users",
                  "Review accounts and user status",
                  "users",
                  Users,
                ],
                [
                  "Publish a plan",
                  "Update pricing shown on the site",
                  "plans",
                  BadgeIndianRupee,
                ],
                [
                  "Assign subscription",
                  "Grant a plan to a registered user",
                  "subscriptions",
                  CreditCard,
                ],
                [
                  "Manage team",
                  "Create sub-admin and affiliate access",
                  "team",
                  UserCog,
                ],
              ]
                .filter((item) =>
                  can(
                    item[2] === "team"
                      ? "staff.manage"
                      : item[2] === "users"
                        ? "users.view"
                        : item[2] === "plans"
                          ? "plans.manage"
                          : "subscriptions.manage",
                  ),
                )
                .map(([title, desc, key, Icon]: any) => (
                  <button
                    key={key}
                    onClick={() => selectSection(key)}
                    className="flex items-start gap-3 rounded-xl border border-slate-200 p-4 text-left transition hover:border-orange-200 hover:bg-orange-50/50"
                  >
                    <span className="rounded-lg bg-slate-100 p-2 text-slate-700">
                      <Icon className="h-5 w-5" />
                    </span>
                    <span>
                      <span className="block text-sm font-semibold text-slate-900">
                        {title}
                      </span>
                      <span className="mt-1 block text-xs leading-5 text-slate-500">
                        {desc}
                      </span>
                    </span>
                  </button>
                ))}
            </div>
          </div>
          <div className="rounded-2xl bg-slate-950 p-5 text-white">
            <div className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-orange-400" />
              <h3 className="font-bold">Access & safety</h3>
            </div>
            <p className="mt-2 text-sm leading-6 text-slate-300">
              Admin actions are checked again by server-side APIs. Credentials
              are never returned to the browser, and configuration changes are
              recorded in the audit log.
            </p>
            <div className="mt-5 flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-3 text-sm">
              <span className="h-2 w-2 rounded-full bg-emerald-400" />
              Signed in as{" "}
              <strong className="truncate">
                {admin.role.replace("_", " ")}
              </strong>
            </div>
          </div>
        </div>
      )}
    </>
  );

  const renderUsers = () => (
    <>
      <SectionHeading
        title={admin.isAffiliate ? "My referred users" : "User management"}
        description={
          admin.isAffiliate
            ? "You can see only people attributed to your referral code. Other affiliate portfolios are private."
            : "Create, view, update, suspend, and safely remove user accounts."
        }
        action={
          <div className="flex gap-2">
            <button
              className={btnSecondary}
              onClick={() => void refreshCurrent()}
              disabled={busy}
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />{" "}
              Refresh
            </button>
            {!admin.isAffiliate && can("users.manage") && (
              <button
                className={btnPrimary}
                onClick={() => {
                  setEditingUser(null);
                  setUserForm({ email: "", displayName: "" });
                  setShowUserModal(true);
                }}
              >
                <Plus className="h-4 w-4" /> Add user
              </button>
            )}
          </div>
        }
      />
      <div className="mb-4 flex flex-wrap gap-3 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="relative min-w-[220px] flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            className={`${inputClass} pl-9`}
            value={usersSearch}
            onChange={(e) => setUsersSearch(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                setUserPagination((p: any) => ({ ...p, page: 1 }));
                void refreshCurrent();
              }
            }}
            placeholder="Search by name, email, or ID"
          />
        </div>
        <select
          className={`${inputClass} w-auto min-w-[130px]`}
          value={usersStatus}
          onChange={(e) => {
            setUsersStatus(e.target.value);
            setUserPagination((p: any) => ({ ...p, page: 1 }));
          }}
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="suspended">Suspended</option>
        </select>
        {!admin.isAffiliate && (
          <select
            className={`${inputClass} w-auto min-w-[150px]`}
            value={usersRole}
            onChange={(e) => {
              setUsersRole(e.target.value);
              setUserPagination((p: any) => ({ ...p, page: 1 }));
            }}
          >
            <option value="all">All account roles</option>
            <option value="user">Users</option>
            <option value="super_admin">Super admins</option>
            <option value="subadmin">Sub-admins</option>
            <option value="affiliate">Affiliates</option>
          </select>
        )}
        <button
          disabled={busy}
          className={btnPrimary}
          onClick={() => {
            setUserPagination((p: any) => ({ ...p, page: 1 }));
            void refreshCurrent();
          }}
        >
          <Search className="h-4 w-4" /> Search
        </button>
      </div>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
          <span>{userPagination.total || users.length} accounts</span>
          <span>
            Page {userPagination.page || 1} of {userPagination.pages || 1}
          </span>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Lifetime spend</th>
                <th className="px-5 py-3">Joined / last login</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">
                      {user.displayName || user.email.split("@")[0]}
                    </div>
                    <div className="text-xs text-slate-500">{user.email}</div>
                    <div className="mt-1 text-[10px] text-slate-400">
                      {user.verified ? "Email verified" : "Not verified"}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <span className="capitalize">
                      {String(user.role).replace("_", " ")}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill value={user.status} />
                  </td>
                  <td className="px-5 py-4">
                    {user.activeSubscription || "Free / none"}
                  </td>
                  <td className="px-5 py-4">
                    {currencyBreakdown(user.totalSpendByCurrency || [])}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    <div>{dateLabel(user.createdAt)}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Last login: {dateLabel(user.lastLoginAt)}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap items-center gap-2">
                      {can("users.manage") && !admin.isAffiliate && (
                        <button
                          title="Edit user"
                          className={btnSecondary}
                          onClick={() => {
                            setEditingUser(user);
                            setUserForm({
                              email: user.email,
                              displayName: user.displayName || "",
                            });
                            setShowUserModal(true);
                          }}
                        >
                          <Pencil className="h-4 w-4" /> Edit
                        </button>
                      )}
                      {can("users.manage") && !admin.isAffiliate && (
                        <button
                          title={
                            user.status === "active"
                              ? "Suspend user"
                              : "Activate user"
                          }
                          disabled={busy}
                          className={btnSecondary}
                          onClick={() =>
                            void act(
                              `/api/admin/users/${encodeURIComponent(user.id)}`,
                              "PATCH",
                              {
                                status:
                                  user.status === "active"
                                    ? "suspended"
                                    : "active",
                              },
                              user.status === "active"
                                ? "User suspended."
                                : "User reactivated.",
                            )
                          }
                        >
                          {user.status === "active" ? (
                            <PauseCircle className="h-4 w-4" />
                          ) : (
                            <PlayCircle className="h-4 w-4" />
                          )}
                        </button>
                      )}
                      {can("users.manage") &&
                        !admin.isAffiliate &&
                        user.role === "user" && (
                          <button
                            title="Delete account without financial history"
                            disabled={busy}
                            className="rounded-xl border border-rose-200 px-3 py-2 text-sm font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                            onClick={() => {
                              if (
                                window.confirm(
                                  `Permanently delete ${user.email}? Accounts with payments, subscriptions or affiliate history cannot be deleted; suspend those instead.`,
                                )
                              )
                                void act(
                                  "/api/admin/users",
                                  "DELETE",
                                  { id: user.id },
                                  "User deleted.",
                                );
                            }}
                          >
                            <X className="h-4 w-4" /> Delete
                          </button>
                        )}
                      {admin.isSuperAdmin && (
                        <select
                          aria-label="Set role"
                          disabled={busy}
                          className="rounded-lg border border-slate-200 bg-white px-2 py-2 text-xs"
                          value={user.role}
                          onChange={(e) =>
                            void act(
                              `/api/admin/users/${encodeURIComponent(user.id)}`,
                              "PATCH",
                              { role: e.target.value },
                              "User role updated.",
                            )
                          }
                        >
                          <option value="user">User</option>
                          <option value="subadmin">Sub-admin</option>
                          <option value="affiliate">Affiliate</option>
                          <option value="super_admin">Super admin</option>
                        </select>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!users.length && (
                <tr>
                  <td
                    colSpan={7}
                    className="px-5 py-12 text-center text-slate-500"
                  >
                    No users match these filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="flex justify-end gap-2 border-t border-slate-100 p-3">
          <button
            disabled={busy || (userPagination.page || 1) <= 1}
            className={btnSecondary}
            onClick={() =>
              setUserPagination((p: any) => ({
                ...p,
                page: Math.max(1, p.page - 1),
              }))
            }
          >
            Previous
          </button>
          <button
            disabled={
              busy || (userPagination.page || 1) >= (userPagination.pages || 1)
            }
            className={btnSecondary}
            onClick={() =>
              setUserPagination((p: any) => ({ ...p, page: p.page + 1 }))
            }
          >
            Next
          </button>
        </div>
      </div>
      {showUserModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = editingUser
                ? { displayName: userForm.displayName }
                : userForm;
              const url = editingUser
                ? `/api/admin/users/${encodeURIComponent(editingUser.id)}`
                : "/api/admin/users";
              const ok = await act(
                url,
                editingUser ? "PATCH" : "POST",
                body,
                editingUser
                  ? "User profile updated."
                  : "User created. They can verify their email with OTP.",
              );
              if (ok) {
                setShowUserModal(false);
                setEditingUser(null);
                setUserForm({ email: "", displayName: "" });
              }
            }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-950">
                  {editingUser ? "Edit user profile" : "Create user account"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editingUser
                    ? "Update the display name. Email and account role are managed separately."
                    : "Creates an unverified user account. The user signs in by verifying an email OTP."}
                </p>
              </div>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Email address">
                <input
                  required
                  type="email"
                  maxLength={191}
                  readOnly={Boolean(editingUser)}
                  className={`${inputClass} ${editingUser ? "bg-slate-100 text-slate-500" : ""}`}
                  value={userForm.email}
                  onChange={(e) =>
                    setUserForm((old) => ({ ...old, email: e.target.value }))
                  }
                  placeholder="player@example.com"
                />
              </Field>
              <Field label="Display name">
                <input
                  maxLength={191}
                  className={inputClass}
                  value={userForm.displayName}
                  onChange={(e) =>
                    setUserForm((old) => ({
                      ...old,
                      displayName: e.target.value,
                    }))
                  }
                  placeholder="Player name"
                />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setShowUserModal(false);
                  setEditingUser(null);
                }}
              >
                Cancel
              </button>
              <button disabled={busy} className={btnPrimary}>
                {busy && <LoaderCircle className="h-4 w-4 animate-spin" />}
                <Save className="h-4 w-4" />
                {editingUser ? "Save changes" : "Create user"}
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );

  const renderTeam = () => (
    <>
      <SectionHeading
        title="Team & access control"
        description="Create sub-admin or affiliate accounts. A sub-admin receives only the permissions selected here."
      />
      <form
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(
            "/api/admin/staff",
            "POST",
            {
              email: staffForm.email,
              role: staffForm.role,
              commissionPercent: Number(staffForm.commissionPercent),
              affiliateType: staffForm.affiliateType,
              websiteUrl: staffForm.websiteUrl,
              permissions: staffForm.permissions.filter((key) =>
                permissionCatalog.some((item) => item.key === key),
              ),
            },
            "Team access saved.",
          );
          if (ok)
            setStaffForm({
              email: "",
              role: "subadmin",
              commissionPercent: "10",
              affiliateType: "admin_created",
              websiteUrl: "",
              permissions: ["dashboard.view", "users.view"],
            });
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <span className="rounded-xl bg-orange-50 p-2 text-orange-600">
            <Plus className="h-5 w-5" />
          </span>
          <div>
            <h3 className="font-bold text-slate-900">
              Create or promote a team account
            </h3>
            <p className="text-xs text-slate-500">
              Enter an existing user's email or prepare an account they can
              access through email OTP.
            </p>
          </div>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <Field label="Email address">
            <input
              required
              type="email"
              className={inputClass}
              value={staffForm.email}
              onChange={(e) =>
                setStaffForm((s) => ({ ...s, email: e.target.value }))
              }
              placeholder="teammate@example.com"
            />
          </Field>
          <Field label="Account type">
            <select
              className={inputClass}
              value={staffForm.role}
              onChange={(e) =>
                setStaffForm((s) => ({ ...s, role: e.target.value as any }))
              }
            >
              <option value="subadmin">Sub-admin</option>
              <option
                value="affiliate"
                disabled={!admin.isSuperAdmin && !can("affiliates.manage")}
              >
                Affiliate marketer
                {!admin.isSuperAdmin && !can("affiliates.manage")
                  ? " (permission required)"
                  : ""}
              </option>
            </select>
          </Field>
          {staffForm.role === "affiliate" && (
            <Field label="Affiliate type">
              <select
                className={inputClass}
                value={staffForm.affiliateType}
                onChange={(e) =>
                  setStaffForm((s) => ({ ...s, affiliateType: e.target.value }))
                }
              >
                <option value="admin_created">Managed by Sportrz admin</option>
                <option value="external_website">
                  External website partner
                </option>
              </select>
            </Field>
          )}
          {staffForm.role === "affiliate" && (
            <Field label="Commission rate (%)">
              <input
                className={inputClass}
                type="number"
                min="0"
                max="100"
                step="0.25"
                value={staffForm.commissionPercent}
                onChange={(e) =>
                  setStaffForm((s) => ({
                    ...s,
                    commissionPercent: e.target.value,
                  }))
                }
              />
            </Field>
          )}
          {staffForm.role === "affiliate" &&
            staffForm.affiliateType === "external_website" && (
              <Field label="Partner website URL">
                <input
                  required
                  type="url"
                  className={inputClass}
                  value={staffForm.websiteUrl}
                  onChange={(e) =>
                    setStaffForm((s) => ({ ...s, websiteUrl: e.target.value }))
                  }
                  placeholder="https://partner-site.com"
                />
              </Field>
            )}
        </div>
        {staffForm.role === "subadmin" && (
          <div className="mt-5">
            <div className="mb-3 text-sm font-semibold text-slate-800">
              Permissions to grant
            </div>
            <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
              {permissionCatalog.map((p) => (
                <label
                  key={p.key}
                  className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-200 p-3 hover:bg-slate-50"
                >
                  <input
                    type="checkbox"
                    className="mt-1 accent-orange-600"
                    checked={staffForm.permissions.includes(p.key)}
                    onChange={(e) =>
                      setStaffForm((s) => ({
                        ...s,
                        permissions: e.target.checked
                          ? [...s.permissions, p.key]
                          : s.permissions.filter((x) => x !== p.key),
                      }))
                    }
                  />
                  <span>
                    <span className="block text-sm font-semibold text-slate-800">
                      {p.label}
                    </span>
                    <span className="mt-0.5 block text-xs leading-5 text-slate-500">
                      {p.description}
                    </span>
                  </span>
                </label>
              ))}
            </div>
          </div>
        )}
        <div className="mt-5 flex justify-end">
          <button disabled={busy} className={btnPrimary}>
            <Plus className="h-4 w-4" /> Save team account
          </button>
        </div>
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-bold text-slate-900">Team directory</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[900px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Account</th>
                <th className="px-5 py-3">Role</th>
                <th className="px-5 py-3">Access / referral code</th>
                <th className="px-5 py-3">Performance</th>
                <th className="px-5 py-3">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {staff.map((member) => (
                <tr key={member.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">
                      {member.displayName || member.email.split("@")[0]}
                    </div>
                    <div className="text-xs text-slate-500">{member.email}</div>
                    <div className="mt-1">
                      <StatusPill value={member.status} />
                    </div>
                  </td>
                  <td className="px-5 py-4 capitalize">
                    {member.role.replace("_", " ")}
                  </td>
                  <td className="px-5 py-4">
                    {member.role === "subadmin" ? (
                      <span>{member.permissions?.length || 0} permissions</span>
                    ) : (
                      <>
                        <div>{member.referralCode || "—"}</div>
                        <div className="text-xs text-slate-500">
                          {member.affiliateType === "external_website"
                            ? "External website"
                            : "Admin managed"}
                        </div>
                        {member.websiteUrl && (
                          <a
                            className="break-all text-xs text-orange-700 underline"
                            href={member.websiteUrl}
                            target="_blank"
                            rel="noreferrer"
                          >
                            {member.websiteUrl}
                          </a>
                        )}
                      </>
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {member.role === "affiliate" ? (
                      <div>
                        <div>
                          {member.referralCount || 0} referred ·{" "}
                          {member.paidReferralCount || 0} converted
                        </div>
                        <div className="text-xs text-slate-500">
                          Commission{" "}
                          {currencyBreakdown(
                            (member.commissionByCurrency || []).map(
                              (v: any) => ({
                                currency: v.currency,
                                amount: v.commission,
                              }),
                            ),
                          )}
                        </div>
                      </div>
                    ) : (
                      "—"
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex flex-wrap gap-2">
                      {member.role !== "super_admin" &&
                        (member.role === "subadmin"
                          ? can("staff.manage")
                          : can("affiliates.manage")) && (
                          <button
                            disabled={busy}
                            className={btnSecondary}
                            onClick={() =>
                              void act(
                                "/api/admin/staff",
                                "PATCH",
                                {
                                  userId: member.id,
                                  status:
                                    member.status === "active"
                                      ? "suspended"
                                      : "active",
                                },
                                member.status === "active"
                                  ? "Team access suspended."
                                  : "Team access restored.",
                              )
                            }
                          >
                            {member.status === "active"
                              ? "Suspend"
                              : "Reactivate"}
                          </button>
                        )}
                      {member.role === "subadmin" ? (
                        <button
                          className={btnSecondary}
                          onClick={() => setEditingStaff(member)}
                        >
                          <Pencil className="h-4 w-4" /> Permissions
                        </button>
                      ) : member.role === "affiliate" ? (
                        <button
                          className={btnSecondary}
                          onClick={() => setEditingStaff(member)}
                        >
                          <Pencil className="h-4 w-4" /> Edit affiliate
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">
                          Protected
                        </span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!staff.length && (
                <tr>
                  <td colSpan={5} className="p-8 text-center text-slate-500">
                    No team accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
      {editingStaff && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const body =
                editingStaff.role === "subadmin"
                  ? {
                    userId: editingStaff.id,
                    permissions:
                      editingStaff.editPermissions ||
                      editingStaff.permissions ||
                      [],
                  }
                  : {
                    userId: editingStaff.id,
                    commissionPercent: Number(
                      editingStaff.editCommission ??
                      editingStaff.commissionPercent,
                    ),
                    affiliateStatus:
                      editingStaff.editStatus ??
                      editingStaff.affiliateStatus ??
                      "active",
                    affiliateType:
                      editingStaff.editAffiliateType ??
                      editingStaff.affiliateType ??
                      "admin_created",
                    websiteUrl:
                      editingStaff.editWebsiteUrl ??
                      editingStaff.websiteUrl ??
                      "",
                  };
              const ok = await act(
                "/api/admin/staff",
                "PATCH",
                body,
                "Team access updated.",
              );
              if (ok) setEditingStaff(null);
            }}
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold text-slate-900">
                  Edit{" "}
                  {editingStaff.role === "subadmin"
                    ? "sub-admin permissions"
                    : "affiliate profile"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editingStaff.email}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingStaff(null)}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {editingStaff.role === "subadmin" ? (
              <div className="grid gap-2 sm:grid-cols-2">
                {permissionCatalog.map((p) => {
                  const selected =
                    editingStaff.editPermissions ||
                    editingStaff.permissions ||
                    [];
                  return (
                    <label
                      key={p.key}
                      className="flex items-start gap-2 rounded-xl border border-slate-200 p-3"
                    >
                      <input
                        type="checkbox"
                        className="mt-1 accent-orange-600"
                        checked={selected.includes(p.key)}
                        onChange={(e) =>
                          setEditingStaff((old: any) => ({
                            ...old,
                            editPermissions: e.target.checked
                              ? [...selected, p.key]
                              : selected.filter((x: string) => x !== p.key),
                          }))
                        }
                      />
                      <span className="text-sm">
                        <span className="font-semibold">{p.label}</span>
                        <span className="block text-xs leading-5 text-slate-500">
                          {p.description}
                        </span>
                      </span>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Commission rate (%)">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="100"
                    step="0.25"
                    value={
                      editingStaff.editCommission ??
                      String(editingStaff.commissionPercent ?? 10)
                    }
                    onChange={(e) =>
                      setEditingStaff((old: any) => ({
                        ...old,
                        editCommission: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Affiliate status">
                  <select
                    className={inputClass}
                    value={
                      editingStaff.editStatus ??
                      editingStaff.affiliateStatus ??
                      "active"
                    }
                    onChange={(e) =>
                      setEditingStaff((old: any) => ({
                        ...old,
                        editStatus: e.target.value,
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </Field>
                <Field label="Affiliate type">
                  <select
                    className={inputClass}
                    value={
                      editingStaff.editAffiliateType ??
                      editingStaff.affiliateType ??
                      "admin_created"
                    }
                    onChange={(e) =>
                      setEditingStaff((old: any) => ({
                        ...old,
                        editAffiliateType: e.target.value,
                      }))
                    }
                  >
                    <option value="admin_created">
                      Managed by Sportrz admin
                    </option>
                    <option value="external_website">
                      External website partner
                    </option>
                  </select>
                </Field>
                <Field label="Partner website URL">
                  <input
                    className={inputClass}
                    type="url"
                    value={
                      editingStaff.editWebsiteUrl ??
                      editingStaff.websiteUrl ??
                      ""
                    }
                    onChange={(e) =>
                      setEditingStaff((old: any) => ({
                        ...old,
                        editWebsiteUrl: e.target.value,
                      }))
                    }
                    placeholder="https://partner-site.com (optional for managed partners)"
                  />
                </Field>
              </div>
            )}
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setEditingStaff(null)}
              >
                Cancel
              </button>
              <button className={btnPrimary}>
                <Save className="h-4 w-4" /> Save access
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );

  const renderAffiliates = () =>
    admin.isAffiliate ? (
      <>
        <SectionHeading
          title="My affiliate account"
          description="This dashboard is restricted to your referral profile, your referred customers, your own payment orders, and your commissions."
        />
        <div className="mb-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">Referral code</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">
              {myAffiliate?.referral_code || "Not assigned"}
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">Commission rate</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">
              {Number(myAffiliate?.commission_percent || 0)}%
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">Account status</div>
            <div className="mt-3">
              <StatusPill value={myAffiliate?.status || "not configured"} />
            </div>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="text-sm text-slate-500">Tracked clicks</div>
            <div className="mt-2 text-2xl font-bold text-slate-950">
              {Number(affiliateClickStats.total || 0).toLocaleString("en-IN")}
            </div>
            <p className="mt-1 text-xs text-slate-500">
              {Number(affiliateClickStats.converted || 0).toLocaleString("en-IN")} attributed sign-ups
            </p>
          </div>
        </div>
        <div className="mb-5 rounded-2xl border border-orange-200 bg-orange-50 p-4">
          <div className="text-sm font-semibold text-orange-900">
            Your personal referral / tracking link
          </div>
          <div className="mt-2 break-all text-sm text-slate-800">
            {myAffiliate?.referral_url ||
              "Contact admin to enable your affiliate profile."}
          </div>
          <p className="mt-2 text-xs leading-5 text-orange-900/80">
            Share this link on your approved website. Sportrz records each click
            and creates its own Click ID automatically. You do not need to edit
            the link or configure tracking code.
          </p>
          <button
            className={`${btnPrimary} mt-3`}
            onClick={() =>
              myAffiliate?.referral_url &&
              navigator.clipboard
                .writeText(myAffiliate.referral_url)
                .then(() => showToast("Referral link copied.", "success"))
                .catch(() =>
                  showToast("Could not copy the referral link.", "error"),
                )
            }
          >
            <Copy className="h-4 w-4" /> Copy referral link
          </button>
        </div>
        {myAffiliate?.affiliate_type === "external_website" && (
          <div className="mb-7 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h3 className="font-bold text-slate-950">External conversion tracking</h3>
                <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-600">
                  Sportrz generates Click IDs, attributes new sign-ups, and sends server-to-server
                  conversion events after a verified Razorpay payment. Tracking endpoints and retries
                  are managed securely by the Sportrz admin team.
                </p>
              </div>
              <StatusPill value={affiliatePostback?.configured ? "configured" : "not configured"} />
            </div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Tracking method</div>
                <div className="mt-1 font-semibold text-slate-900">First-party Click ID</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">Created automatically when a visitor opens your referral link.</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-4">
                <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">S2S postback</div>
                <div className="mt-1 font-semibold text-slate-900">Managed by Sportrz</div>
                <p className="mt-1 text-xs leading-5 text-slate-500">You do not need to enter a callback URL, copy a secret, or retry deliveries.</p>
              </div>
            </div>
            <div className="mt-5">
              <h4 className="font-semibold text-slate-900">Your postback delivery history</h4>
              <p className="mt-1 text-xs text-slate-500">Read-only history for conversions attributed to your affiliate account.</p>
              <div className="mt-3 overflow-x-auto rounded-xl border border-slate-200">
                <table className="min-w-[880px] w-full text-left text-sm">
                  <thead className="bg-slate-50 text-[11px] uppercase text-slate-500">
                    <tr>
                      <th className="px-3 py-3">Order ID</th>
                      <th className="px-3 py-3">Payment ID</th>
                      <th className="px-3 py-3">Click ID</th>
                      <th className="px-3 py-3">Commission</th>
                      <th className="px-3 py-3">Delivery</th>
                      <th className="px-3 py-3">Attempts / HTTP</th>
                      <th className="px-3 py-3">Last error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {(affiliatePostback?.deliveries || []).map((delivery: AnyRecord) => (
                      <tr key={delivery.id}>
                        <td className="max-w-[160px] break-all px-3 py-3 font-mono text-xs">{delivery.orderId || "—"}</td>
                        <td className="max-w-[160px] break-all px-3 py-3 font-mono text-xs">{delivery.paymentId || "—"}</td>
                        <td className="max-w-[160px] break-all px-3 py-3 font-mono text-xs">{delivery.clickId || "—"}</td>
                        <td className="px-3 py-3">{money(delivery.commission, delivery.currency)}</td>
                        <td className="px-3 py-3"><StatusPill value={delivery.status} /><div className="mt-1 text-[11px] text-slate-400">{dateLabel(delivery.sentAt || delivery.createdAt)}</div></td>
                        <td className="px-3 py-3">{delivery.attempts} / {delivery.httpStatus ?? "—"}</td>
                        <td className="max-w-[220px] break-words px-3 py-3 text-xs text-rose-700">{delivery.lastError || "—"}</td>
                      </tr>
                    ))}
                    {!(affiliatePostback?.deliveries || []).length && (
                      <tr>
                        <td colSpan={7} className="p-6 text-center text-sm text-slate-500">
                          No S2S delivery has been logged yet. Your commission ledger remains available below.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
        <SectionHeading
          title="Referred users"
          description={`${myReferrals.length} referred account(s). Other affiliates' customers are not visible to this account.`}
        />
        <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[800px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">User</th>
                <th className="px-5 py-3">Joined via link</th>
                {myAffiliate?.affiliate_type === "external_website" && (
                  <th className="px-5 py-3">Click ID</th>
                )}
                <th className="px-5 py-3">Plan</th>
                <th className="px-5 py-3">Captured payments</th>
                <th className="px-5 py-3">Revenue</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {myReferrals.map((r) => (
                <tr key={r.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {r.displayName || "Player"}
                    </div>
                    <div className="text-xs text-slate-500">{r.email}</div>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {dateLabel(r.referredAt)}
                  </td>
                  {myAffiliate?.affiliate_type === "external_website" && (
                    <td className="max-w-[170px] break-all px-5 py-4 font-mono text-xs">
                      {r.clickId || "—"}
                    </td>
                  )}
                  <td className="px-5 py-4">
                    {r.activeSubscription || "Free / none"}
                  </td>
                  <td className="px-5 py-4">{r.capturedPayments}</td>
                  <td className="px-5 py-4">
                    {currencyBreakdown(r.revenueByCurrency || [])}
                  </td>
                </tr>
              ))}
              {!myReferrals.length && (
                <tr>
                  <td
                    colSpan={
                      myAffiliate?.affiliate_type === "external_website" ? 6 : 5
                    }
                    className="p-8 text-center text-slate-500"
                  >
                    No referred users yet. Share your unique link to get
                    started.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <SectionHeading
          title="Your commission transactions"
          description="Every attributed order and its payment/commission identifiers. This ledger is scoped to your affiliate account only."
        />
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[1150px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Order ID</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Plan</th>
                <th className="px-4 py-3">Payment ID</th>
                <th className="px-4 py-3">Sale amount</th>
                <th className="px-4 py-3">Rate</th>
                <th className="px-4 py-3">Your commission</th>
                <th className="px-4 py-3">Commission status</th>
                <th className="px-4 py-3">Postback</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {affiliateTransactions.map((row) => (
                <tr key={row.id}>
                  <td className="max-w-[180px] break-all px-4 py-3 font-mono text-xs">
                    {row.orderId || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <div className="font-medium">
                      {row.referredName || "Player"}
                    </div>
                    <div className="text-xs text-slate-500">
                      {row.referredEmail}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    {row.planName}{" "}
                    <span className="text-xs text-slate-500">
                      ({row.planCode})
                    </span>
                  </td>
                  <td className="max-w-[170px] break-all px-4 py-3 font-mono text-xs">
                    {row.paymentId || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {money(row.amount, row.currency)}
                  </td>
                  <td className="px-4 py-3">
                    {Number(row.commissionPercent || 0)}%
                  </td>
                  <td className="px-4 py-3 font-semibold">
                    {money(row.commission, row.currency)}
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill value={row.status} />
                  </td>
                  <td className="px-4 py-3">
                    <StatusPill
                      value={row.postbackStatus || "not_configured"}
                    />
                    {row.postbackHttpStatus && (
                      <div className="mt-1 text-xs text-slate-400">
                        HTTP {row.postbackHttpStatus}
                      </div>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-xs">
                    {dateLabel(row.paidAt || row.createdAt)}
                  </td>
                </tr>
              ))}
              {!affiliateTransactions.length && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No commission transactions yet. Your first captured referral
                    payment will appear here with its Razorpay order and payment
                    IDs.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    ) : (
      <>
        <SectionHeading
          title="Affiliate marketing"
          description="Monitor all affiliate marketers, referred users, conversions and estimated commissions."
          action={
            <button
              className={btnSecondary}
              onClick={() => selectSection("team")}
            >
              <UserCog className="h-4 w-4" /> Create affiliate
            </button>
          }
        />
        <SectionHeading
          title={`External website applications (${affiliateApplications.length})`}
          description="Review external website partners before creating an affiliate profile. Approved partners start at 10% commission; you can adjust the rate afterwards."
        />
        <div className="mb-6 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[850px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Applicant</th>
                <th className="px-5 py-3">Website</th>
                <th className="px-5 py-3">Applied</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {affiliateApplications.map((application) => (
                <tr key={application.id}>
                  <td className="px-5 py-4">
                    <div className="font-semibold">
                      {application.displayName ||
                        application.email.split("@")[0]}
                    </div>
                    <div className="text-xs text-slate-500">
                      {application.email}
                    </div>
                  </td>
                  <td className="px-5 py-4">
                    <a
                      href={application.websiteUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="break-all text-orange-700 underline"
                    >
                      {application.websiteUrl}
                    </a>
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {dateLabel(application.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {can("affiliates.manage") && (
                        <button
                          disabled={busy}
                          className={btnPrimary}
                          onClick={() =>
                            void act(
                              "/api/admin/affiliates",
                              "PATCH",
                              {
                                applicationId: application.id,
                                applicationAction: "approve",
                                commissionPercent: 10,
                              },
                              "External affiliate approved at 10%.",
                            )
                          }
                        >
                          Approve · 10%
                        </button>
                      )}
                      {can("affiliates.manage") && (
                        <button
                          disabled={busy}
                          className={btnSecondary}
                          onClick={() => {
                            const reason =
                              window.prompt(
                                "Reason for rejection (optional):",
                              ) || "";
                            if (
                              window.confirm(
                                `Reject affiliate application from ${application.email}?`,
                              )
                            )
                              void act(
                                "/api/admin/affiliates",
                                "PATCH",
                                {
                                  applicationId: application.id,
                                  applicationAction: "reject",
                                  reviewNote: reason,
                                },
                                "Affiliate application rejected.",
                              );
                          }}
                        >
                          Reject
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!affiliateApplications.length && (
                <tr>
                  <td
                    colSpan={4}
                    className="p-6 text-center text-sm text-slate-500"
                  >
                    No pending external website applications.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[1050px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Affiliate</th>
                <th className="px-5 py-3">Referral link</th>
                <th className="px-5 py-3">Rate</th>
                <th className="px-5 py-3">Clicks</th>
                <th className="px-5 py-3">Referrals</th>
                <th className="px-5 py-3">Conversions</th>
                <th className="px-5 py-3">Commission</th>
                <th className="px-5 py-3">Pending</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Manage</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {affiliates.map((a) => (
                <tr key={a.userId}>
                  <td className="px-5 py-4">
                    <div className="font-semibold text-slate-900">
                      {a.displayName || a.email.split("@")[0]}
                    </div>
                    <div className="text-xs text-slate-500">{a.email}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {a.affiliateType === "external_website"
                        ? "External website"
                        : "Admin managed"}
                    </div>
                    {a.websiteUrl && (
                      <a
                        href={a.websiteUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="break-all text-xs text-orange-700 underline"
                      >
                        {a.websiteUrl}
                      </a>
                    )}
                    {a.affiliateType === "external_website" && (
                      <div className="mt-1 text-xs text-slate-500">
                        Postback:{" "}
                        {a.postbackConfigured ? "configured" : "not configured"}
                      </div>
                    )}
                  </td>
                  <td className="max-w-[250px] px-5 py-4">
                    <div className="break-all text-xs">{a.referralUrl}</div>
                    <button
                      className="mt-1 text-xs font-semibold text-orange-700"
                      onClick={() =>
                        navigator.clipboard
                          .writeText(a.referralUrl)
                          .then(() =>
                            showToast("Referral link copied.", "success"),
                          )
                      }
                    >
                      Copy link
                    </button>
                  </td>
                  <td className="px-5 py-4">{a.commissionPercent}%</td>
                  <td className="px-5 py-4">{Number(a.clickCount || 0).toLocaleString("en-IN")}</td>
                  <td className="px-5 py-4">{a.referralCount}</td>
                  <td className="px-5 py-4">{a.convertedCount}</td>
                  <td className="px-5 py-4">
                    {currencyBreakdown(
                      (a.commissionByCurrency || []).map((v: any) => ({
                        currency: v.currency,
                        amount: v.total,
                      })),
                    )}
                  </td>
                  <td className="px-5 py-4">
                    {currencyBreakdown(
                      (a.commissionByCurrency || []).map((v: any) => ({
                        currency: v.currency,
                        amount: v.pending,
                      })),
                    )}
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill value={a.status} />
                  </td>
                  <td className="px-5 py-4">
                    {can("affiliates.manage") ? (
                      <button
                        className={btnSecondary}
                        onClick={() =>
                          setEditingAffiliate({
                            ...a,
                            editCommissionPercent: String(a.commissionPercent),
                            editStatus: a.status,
                            editPostbackUrl: a.postbackUrl || "",
                            editPostbackMethod: a.postbackMethod || "POST",
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                    ) : (
                      "—"
                    )}
                  </td>
                </tr>
              ))}
              {!affiliates.length && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No affiliate profiles created yet. Promote an account from
                    Team & access.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {editingAffiliate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
            <form
              className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl sm:p-6"
              onSubmit={async (e) => {
                e.preventDefault();
                const ok = await act(
                  "/api/admin/affiliates",
                  "PATCH",
                  {
                    userId: editingAffiliate.userId,
                    commissionPercent: Number(
                      editingAffiliate.editCommissionPercent,
                    ),
                    affiliateStatus: editingAffiliate.editStatus,
                    affiliateType:
                      editingAffiliate.editAffiliateType ??
                      editingAffiliate.affiliateType,
                    websiteUrl:
                      editingAffiliate.editWebsiteUrl ??
                      editingAffiliate.websiteUrl,
                    postbackUrl: editingAffiliate.editPostbackUrl ?? editingAffiliate.postbackUrl ?? "",
                    postbackMethod: editingAffiliate.editPostbackMethod ?? editingAffiliate.postbackMethod ?? "POST",
                  },
                  "Affiliate profile updated.",
                );
                if (ok) setEditingAffiliate(null);
              }}
            >
              <div className="mb-5 flex items-start justify-between">
                <div>
                  <h3 className="text-lg font-bold">Edit affiliate profile</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    {editingAffiliate.email}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setEditingAffiliate(null)}
                  className="rounded-lg p-2 hover:bg-slate-100"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Commission rate (%)">
                  <input
                    className={inputClass}
                    type="number"
                    min="0"
                    max="100"
                    step="0.25"
                    value={editingAffiliate.editCommissionPercent}
                    onChange={(e) =>
                      setEditingAffiliate((old: any) => ({
                        ...old,
                        editCommissionPercent: e.target.value,
                      }))
                    }
                  />
                </Field>
                <Field label="Affiliate status">
                  <select
                    className={inputClass}
                    value={editingAffiliate.editStatus}
                    onChange={(e) =>
                      setEditingAffiliate((old: any) => ({
                        ...old,
                        editStatus: e.target.value,
                      }))
                    }
                  >
                    <option value="active">Active</option>
                    <option value="paused">Paused</option>
                  </select>
                </Field>
                <Field label="Affiliate type">
                  <select
                    className={inputClass}
                    value={
                      editingAffiliate.editAffiliateType ??
                      editingAffiliate.affiliateType ??
                      "admin_created"
                    }
                    onChange={(e) =>
                      setEditingAffiliate((old: any) => ({
                        ...old,
                        editAffiliateType: e.target.value,
                      }))
                    }
                  >
                    <option value="admin_created">
                      Managed by Sportrz admin
                    </option>
                    <option value="external_website">
                      External website partner
                    </option>
                  </select>
                </Field>
                <Field label="Partner website URL">
                  <input
                    className={inputClass}
                    type="url"
                    value={
                      editingAffiliate.editWebsiteUrl ??
                      editingAffiliate.websiteUrl ??
                      ""
                    }
                    onChange={(e) =>
                      setEditingAffiliate((old: any) => ({
                        ...old,
                        editWebsiteUrl: e.target.value,
                      }))
                    }
                    placeholder="https://partner-site.com"
                  />
                </Field>
              </div>
              {(editingAffiliate.editAffiliateType ?? editingAffiliate.affiliateType) === "external_website" && (
                <div className="mt-6 rounded-2xl border border-orange-200 bg-orange-50/60 p-4 sm:p-5">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <h4 className="font-bold text-slate-900">Server-to-server (S2S) postback</h4>
                      <p className="mt-1 text-xs leading-5 text-slate-600">
                        Configure the receiving HTTPS endpoint here. Sportrz sends a signed JSON POST after a captured payment.
                        Affiliates cannot view or change this destination.
                      </p>
                    </div>
                    <StatusPill value={editingAffiliate.postbackConfigured ? "configured" : "not configured"} />
                  </div>
                  <div className="mt-4 grid gap-4 sm:grid-cols-[1fr_150px]">
                    <Field label="Partner postback URL (HTTPS)">
                      <input
                        className={inputClass}
                        type="url"
                        maxLength={1000}
                        value={editingAffiliate.editPostbackUrl ?? editingAffiliate.postbackUrl ?? ""}
                        onChange={(e) => setEditingAffiliate((old: any) => ({ ...old, editPostbackUrl: e.target.value }))}
                        placeholder="https://webhook.site/your-unique-id"
                      />
                    </Field>
                    <Field label="HTTP method">
                      <select
                        className={inputClass}
                        value={editingAffiliate.editPostbackMethod ?? editingAffiliate.postbackMethod ?? "POST"}
                        onChange={(e) => setEditingAffiliate((old: any) => ({ ...old, editPostbackMethod: e.target.value }))}
                      >
                        <option value="POST">POST (recommended)</option>
                        <option value="GET">GET (legacy)</option>
                      </select>
                    </Field>
                  </div>
                  <p className="mt-2 text-xs leading-5 text-slate-600">
                    Supported URL macros: <code>{"{click_id}"}</code>, <code>{"{order_id}"}</code>, <code>{"{payment_id}"}</code>,
                    <code>{"{amount}"}</code>, <code>{"{currency}"}</code>, <code>{"{commission}"}</code>, and <code>{"{affiliate_code}"}</code>.
                    For Webhook.site testing, paste its unique HTTPS URL and leave the method on POST.
                  </p>
                  <div className="mt-4 rounded-xl border border-slate-200 bg-white p-3">
                    <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">Partner verification secret (HMAC-SHA256)</div>
                    <div className="mt-2 break-all font-mono text-xs text-slate-800">
                      {editingAffiliate.postbackSecret || "AUTH_SECRET must be configured on the server before S2S can be enabled."}
                    </div>
                    <button
                      type="button"
                      className={`${btnSecondary} mt-3`}
                      disabled={!editingAffiliate.postbackSecret}
                      onClick={() => navigator.clipboard.writeText(editingAffiliate.postbackSecret).then(() => showToast("Signing secret copied.", "success")).catch(() => showToast("Could not copy the signing secret.", "error"))}
                    >
                      <Copy className="h-4 w-4" /> Copy signing secret
                    </button>
                    <p className="mt-2 text-xs leading-5 text-slate-500">Share this secret only with the trusted partner server that verifies X-Sportrz-Signature. Never put it in browser code.</p>
                  </div>
                  <button
                    type="button"
                    className={`${btnSecondary} mt-4`}
                    disabled={
                      busy ||
                      !String(editingAffiliate.editPostbackUrl ?? editingAffiliate.postbackUrl ?? "").trim() ||
                      String(editingAffiliate.editPostbackUrl ?? editingAffiliate.postbackUrl ?? "").trim() !== String(editingAffiliate.postbackUrl || "").trim() ||
                      (editingAffiliate.editPostbackMethod ?? editingAffiliate.postbackMethod ?? "POST") !== (editingAffiliate.postbackMethod || "POST")
                    }
                    onClick={() => void act(
                      "/api/admin/affiliates/test-postback",
                      "POST",
                      { userId: editingAffiliate.userId },
                      "S2S test event delivered successfully.",
                    )}
                  >
                    <Activity className="h-4 w-4" /> Send test event
                  </button>
                  <p className="mt-2 text-xs text-slate-500">Save the profile first, close and reopen this editor, then send the test. It sends a signed dummy POST only; it does not create an order or commission.</p>
                </div>
              )}
              <div className="mt-6 flex flex-wrap justify-end gap-2">
                <button
                  type="button"
                  className={btnSecondary}
                  onClick={() => setEditingAffiliate(null)}
                >
                  Cancel
                </button>
                <button className={btnPrimary} disabled={busy}>
                  <Save className="h-4 w-4" /> Save profile
                </button>
              </div>
            </form>
          </div>
        )}
        <SectionHeading
          title="Commission and payout ledger"
          description="Approve verified commissions and mark them paid after the actual payout is completed. The panel does not transfer money automatically."
        />
        <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
          <table className="min-w-[1350px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3">Affiliate</th>
                <th className="px-5 py-3">Referred customer</th>
                <th className="px-5 py-3">Payment / order</th>
                <th className="px-5 py-3">Click ID</th>
                <th className="px-5 py-3">Rate</th>
                <th className="px-5 py-3">Commission</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">S2S postback</th>
                <th className="px-5 py-3">Date</th>
                <th className="px-5 py-3">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {commissionLedger.map((c) => (
                <tr key={c.id}>
                  <td className="px-5 py-4">
                    {c.affiliateName || c.affiliateEmail}
                    <div className="text-xs text-slate-500">
                      {c.affiliateName ? c.affiliateEmail : ""}
                    </div>
                  </td>
                  <td className="px-5 py-4">{c.referredEmail}</td>
                  <td className="px-5 py-4">
                    <div className="break-all font-mono text-xs">
                      Order: {c.orderId || "—"}
                    </div>
                    <div className="mt-1 break-all font-mono text-[11px] text-slate-500">
                      Payment: {c.paymentId || "—"}
                    </div>
                    <div className="mt-1 text-xs text-slate-500">
                      Record #{c.paymentRecordId} · {c.planName || "Plan"} ·{" "}
                      {money(c.amount, c.currency)}
                    </div>
                  </td>
                  <td className="max-w-[160px] break-all px-5 py-4 font-mono text-xs">{c.clickId || "—"}</td>
                  <td className="px-5 py-4">{c.commissionPercent}%</td>
                  <td className="px-5 py-4 font-semibold">
                    {money(c.commission, c.currency)}
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill value={c.status} />
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill value={c.postbackStatus || "not_configured"} />
                    <div className="mt-1 text-xs text-slate-500">
                      {c.postbackAttempts || 0} attempt(s) · HTTP {c.postbackHttpStatus ?? "—"}
                    </div>
                    {c.postbackDeliveryId && ["pending", "failed"].includes(c.postbackStatus) && (
                      <button
                        type="button"
                        className="mt-2 text-xs font-semibold text-orange-700 underline disabled:opacity-50"
                        disabled={busy}
                        onClick={() => void act(
                          "/api/admin/affiliates/postback/retry",
                          "POST",
                          { deliveryId: c.postbackDeliveryId },
                          "S2S postback retry processed.",
                        )}
                      >Retry delivery</button>
                    )}
                    {c.postbackError && <p className="mt-1 max-w-[220px] break-words text-xs text-rose-700">{c.postbackError}</p>}
                  </td>
                  <td className="px-5 py-4 whitespace-nowrap">
                    {dateLabel(c.createdAt)}
                  </td>
                  <td className="px-5 py-4">
                    <div className="flex gap-2">
                      {c.status === "pending" && (
                        <button
                          className={btnSecondary}
                          onClick={() =>
                            void act(
                              "/api/admin/affiliates",
                              "PATCH",
                              { commissionId: c.id, status: "approved" },
                              "Commission approved.",
                            )
                          }
                        >
                          Approve
                        </button>
                      )}
                      {c.status === "approved" && (
                        <button
                          className={btnSecondary}
                          onClick={() =>
                            void act(
                              "/api/admin/affiliates",
                              "PATCH",
                              { commissionId: c.id, status: "paid" },
                              "Commission marked paid.",
                            )
                          }
                        >
                          Mark paid
                        </button>
                      )}
                      {["pending", "approved"].includes(c.status) && (
                        <button
                          className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            void act(
                              "/api/admin/affiliates",
                              "PATCH",
                              { commissionId: c.id, status: "reversed" },
                              "Commission reversed.",
                            )
                          }
                        >
                          Reverse
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {!commissionLedger.length && (
                <tr>
                  <td colSpan={10} className="p-8 text-center text-slate-500">
                    No commission records yet. A commission is created after a
                    referred user's payment is captured and verified.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </>
    );

  const renderPlans = () => (
    <>
      <SectionHeading
        title="Plans & pricing"
        description="Edit these plans to change the options, prices and features shown on the public plans page."
        action={
          <button
            className={btnPrimary}
            onClick={() => {
              setPlanForm(defaultPlan);
              setPlanGameSearch("");
              setEditingPlan(false);
              setShowPlanModal(true);
            }}
          >
            <Plus className="h-4 w-4" /> New plan
          </button>
        }
      />
      <div className="grid gap-4 xl:grid-cols-2">
        {plans.map((plan) => (
          <div
            key={plan.id}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-lg font-bold text-slate-950">
                    {plan.name}
                  </h3>
                  <StatusPill value={plan.isActive ? "active" : "disabled"} />
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  Code: {plan.code} · Order: {plan.displayOrder}
                </div>
              </div>
              <button
                className={btnSecondary}
                onClick={() => {
                  setPlanForm({
                    ...plan,
                    gameIds: plan.gameIds || [],
                    featuresText:
                      plan.featuresText || (plan.features || []).join("\n"),
                  });
                  setPlanGameSearch("");
                  setEditingPlan(true);
                  setShowPlanModal(true);
                }}
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            </div>
            <div className="mt-5 flex items-end justify-between">
              <div>
                <div className="text-3xl font-bold text-slate-950">
                  {money(plan.priceRupees, plan.currency)}
                </div>
                <div className="mt-1 text-xs text-slate-500">
                  {plan.durationDays
                    ? `${plan.durationDays} days`
                    : "No expiry"}{" "}
                  · {plan.gameAccessMode} game access
                </div>
              </div>
              <button
                className={btnSecondary}
                onClick={() =>
                  void act(
                    "/api/admin/plans",
                    "PUT",
                    {
                      ...plan,
                      featuresText:
                        plan.featuresText || (plan.features || []).join("\n"),
                      isActive: !plan.isActive,
                    },
                    plan.isActive ? "Plan unpublished." : "Plan published.",
                  )
                }
              >
                {plan.isActive ? "Unpublish" : "Publish"}
              </button>
            </div>
            <div className="mt-4 border-t border-slate-100 pt-3 text-sm text-slate-600">
              {plan.description || "No description set."}
            </div>
            <div className="mt-3 flex flex-wrap gap-1.5">
              {(plan.features || []).slice(0, 5).map((f: string) => (
                <span
                  key={f}
                  className="rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
                >
                  {f}
                </span>
              ))}
            </div>
          </div>
        ))}
        {!plans.length && (
          <div className="rounded-2xl border border-dashed border-slate-300 bg-white p-10 text-center text-slate-500 xl:col-span-2">
            No plans yet. Create a plan to show it on the public website.
          </div>
        )}
      </div>
      {showPlanModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            className="max-h-[92vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = {
                ...planForm,
                gameIds:
                  planForm.gameAccessMode === "selected"
                    ? planForm.gameIds || []
                    : [],
                priceRupees: Number(planForm.priceRupees),
                durationDays:
                  planForm.durationDays === "" || planForm.durationDays == null
                    ? null
                    : Number(planForm.durationDays),
                displayOrder: Number(planForm.displayOrder),
                isActive: Boolean(planForm.isActive),
              };
              const ok = await act(
                "/api/admin/plans",
                editingPlan ? "PUT" : "POST",
                body,
                editingPlan ? "Plan updated." : "Plan created.",
              );
              if (ok) {
                setEditingPlan(false);
                setShowPlanModal(false);
                setPlanForm(defaultPlan);
              }
            }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editingPlan ? "Edit plan" : "Create plan"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Published plan details are fetched dynamically by the public
                  plans page.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingPlan(false);
                  setShowPlanModal(false);
                  setPlanForm(defaultPlan);
                }}
                className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Plan code">
                <input
                  disabled={editingPlan}
                  required
                  pattern="[a-z0-9_-]{1,50}"
                  className={inputClass}
                  value={planForm.code}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({
                      ...p,
                      code: e.target.value.toLowerCase(),
                    }))
                  }
                  placeholder="monthly"
                />
              </Field>
              <Field label="Public name">
                <input
                  required
                  maxLength={100}
                  className={inputClass}
                  value={planForm.name}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({ ...p, name: e.target.value }))
                  }
                  placeholder="Monthly Champion"
                />
              </Field>
              <Field label="Price (selected currency)">
                <input
                  required
                  type="number"
                  min="0"
                  step="0.01"
                  className={inputClass}
                  value={planForm.priceRupees}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({
                      ...p,
                      priceRupees: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Currency">
                <select
                  className={inputClass}
                  value={planForm.currency}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({
                      ...p,
                      currency: e.target.value,
                    }))
                  }
                >
                  <option value="INR">INR</option>
                  <option value="USD">USD</option>
                  <option value="EUR">EUR</option>
                  <option value="GBP">GBP</option>
                </select>
              </Field>
              <Field label="Duration in days (blank = no expiry)">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  className={inputClass}
                  value={planForm.durationDays ?? ""}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({
                      ...p,
                      durationDays: e.target.value,
                    }))
                  }
                  placeholder="30"
                />
              </Field>
              <Field label="Game access">
                <select
                  className={inputClass}
                  value={planForm.gameAccessMode}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({
                      ...p,
                      gameAccessMode: e.target.value,
                    }))
                  }
                >
                  <option value="all">All games</option>
                  <option value="selected">Selected games</option>
                  <option value="none">No games</option>
                </select>
              </Field>
              <Field label="Display order">
                <input
                  type="number"
                  className={inputClass}
                  value={planForm.displayOrder}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({
                      ...p,
                      displayOrder: e.target.value,
                    }))
                  }
                />
              </Field>
              <Field label="Publish on website">
                <select
                  className={inputClass}
                  value={planForm.isActive ? "yes" : "no"}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({
                      ...p,
                      isActive: e.target.value === "yes",
                    }))
                  }
                >
                  <option value="no">Disabled / draft</option>
                  <option value="yes">Active / published</option>
                </select>
              </Field>
            </div>
            {planForm.gameAccessMode === "selected" && (
              <div className="mt-4 rounded-2xl border border-slate-200 p-4">
                <div className="flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h4 className="font-semibold text-slate-900">
                      Choose included games
                    </h4>
                    <p className="mt-1 text-xs text-slate-500">
                      Selected-game plans grant access only to checked active
                      games.
                    </p>
                  </div>
                  <div className="w-full sm:w-64">
                    <input
                      className={inputClass}
                      value={planGameSearch}
                      onChange={(e) => setPlanGameSearch(e.target.value)}
                      placeholder="Search games…"
                    />
                  </div>
                </div>
                <p className="mt-3 text-sm font-semibold text-orange-700">
                  {(planForm.gameIds || []).length} game(s) selected
                </p>
                <div className="mt-2 grid max-h-64 gap-2 overflow-y-auto sm:grid-cols-2">
                  {planGameOptions
                    .filter((g: any) =>
                      `${g.name} ${g.id}`
                        .toLowerCase()
                        .includes(planGameSearch.toLowerCase()),
                    )
                    .map((g: any) => (
                      <label
                        key={g.id}
                        className="flex cursor-pointer items-start gap-2 rounded-lg border border-slate-100 p-2.5 text-sm hover:bg-orange-50"
                      >
                        <input
                          type="checkbox"
                          className="mt-0.5 accent-orange-600"
                          checked={(planForm.gameIds || []).includes(
                            String(g.id),
                          )}
                          onChange={(e) =>
                            setPlanForm((p: any) => ({
                              ...p,
                              gameIds: e.target.checked
                                ? [
                                  ...new Set([
                                    ...(p.gameIds || []),
                                    String(g.id),
                                  ]),
                                ]
                                : (p.gameIds || []).filter(
                                  (id: string) => id !== String(g.id),
                                ),
                            }))
                          }
                        />
                        <span>
                          <span className="block font-medium text-slate-800">
                            {g.name}
                          </span>
                          <span className="text-xs text-slate-500">{g.id}</span>
                        </span>
                      </label>
                    ))}
                  {!planGameOptions.some((g: any) =>
                    `${g.name} ${g.id}`
                      .toLowerCase()
                      .includes(planGameSearch.toLowerCase()),
                  ) && (
                      <p className="col-span-2 p-4 text-center text-sm text-slate-500">
                        No active games match that search.
                      </p>
                    )}
                </div>
              </div>
            )}
            <div className="mt-4">
              <Field label="Short description">
                <textarea
                  rows={2}
                  maxLength={2000}
                  className={inputClass}
                  value={planForm.description}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Features (one per line)">
                <textarea
                  rows={5}
                  maxLength={5000}
                  className={inputClass}
                  value={planForm.featuresText}
                  onChange={(e) =>
                    setPlanForm((p: any) => ({
                      ...p,
                      featuresText: e.target.value,
                    }))
                  }
                  placeholder={"Unlimited play time\nNo ads\nPremium support"}
                />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setEditingPlan(false);
                  setShowPlanModal(false);
                  setPlanForm(defaultPlan);
                }}
              >
                Cancel
              </button>
              <button className={btnPrimary} disabled={busy}>
                <Save className="h-4 w-4" /> Save plan
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );

  const renderSubscriptions = () => (
    <>
      <SectionHeading
        title="Subscriptions"
        description="Assign a plan to a registered user or revoke a subscription. All admin-created assignments are audited."
      />
      <form
        className="mb-5 rounded-2xl border border-slate-200 bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(
            "/api/admin/subscriptions",
            "POST",
            {
              email: assignSub.email,
              planCode: assignSub.planCode,
              durationDays: assignSub.durationDays || null,
            },
            "Subscription assigned.",
          );
          if (ok) setAssignSub({ email: "", planCode: "", durationDays: "" });
        }}
      >
        <h3 className="mb-4 font-bold text-slate-900">Assign plan manually</h3>
        <div className="grid gap-4 md:grid-cols-[1.4fr_1fr_0.8fr_auto]">
          <Field label="User email">
            <input
              className={inputClass}
              type="email"
              required
              value={assignSub.email}
              onChange={(e) =>
                setAssignSub((s) => ({ ...s, email: e.target.value }))
              }
              placeholder="player@example.com"
            />
          </Field>
          <Field label="Plan">
            <select
              required
              className={inputClass}
              value={assignSub.planCode}
              onChange={(e) =>
                setAssignSub((s) => ({ ...s, planCode: e.target.value }))
              }
            >
              <option value="">Choose plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.code}>
                  {p.name} · {money(p.priceRupees, p.currency)}
                </option>
              ))}
            </select>
          </Field>
          <Field label="Override days (optional)">
            <input
              className={inputClass}
              type="number"
              min="1"
              max="3650"
              value={assignSub.durationDays}
              onChange={(e) =>
                setAssignSub((s) => ({ ...s, durationDays: e.target.value }))
              }
              placeholder="Plan default"
            />
          </Field>
          <div className="flex items-end">
            <button className={btnPrimary} disabled={busy}>
              <Plus className="h-4 w-4" /> Assign
            </button>
          </div>
        </div>
      </form>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div className="text-sm font-semibold text-slate-800">
          Subscription ledger
        </div>
        <select
          className={`${inputClass} w-auto`}
          value={subStatus}
          onChange={(e) => setSubStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {["pending", "active", "expired", "cancelled"].map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[1050px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Source</th>
              <th className="px-5 py-3">Start</th>
              <th className="px-5 py-3">End</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {subscriptions.map((s) => (
              <tr key={s.id}>
                <td className="px-5 py-4">
                  <div className="font-semibold">
                    {s.displayName || s.email.split("@")[0]}
                  </div>
                  <div className="text-xs text-slate-500">{s.email}</div>
                </td>
                <td className="px-5 py-4">{s.planName}</td>
                <td className="px-5 py-4">
                  <StatusPill value={s.status} />
                </td>
                <td className="px-5 py-4 capitalize">
                  {s.source}
                  {s.assignedBy ? (
                    <div className="text-xs text-slate-400">
                      by {s.assignedBy}
                    </div>
                  ) : null}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {dateLabel(s.startAt)}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {dateLabel(s.endAt)}
                </td>
                <td className="px-5 py-4">
                  <div className="flex flex-wrap gap-2">
                    {can("subscriptions.manage") && (
                      <button
                        className={btnSecondary}
                        onClick={() =>
                          setEditingSubscription({
                            id: s.id,
                            email: s.email,
                            planCode: s.planCode,
                            durationDays: s.endAt
                              ? String(
                                Math.max(
                                  1,
                                  Math.ceil(
                                    (new Date(s.endAt).getTime() -
                                      new Date(
                                        s.startAt || Date.now(),
                                      ).getTime()) /
                                    86400000,
                                  ),
                                ),
                              )
                              : "",
                          })
                        }
                      >
                        <Pencil className="h-4 w-4" /> Edit
                      </button>
                    )}
                    {["active", "pending"].includes(s.status) &&
                      can("subscriptions.manage") ? (
                      <button
                        className={btnSecondary}
                        onClick={() => {
                          if (
                            window.confirm(
                              `Revoke subscription for ${s.email}?`,
                            )
                          )
                            void act(
                              "/api/admin/subscriptions",
                              "PATCH",
                              { id: s.id, status: "cancelled" },
                              "Subscription revoked.",
                            );
                        }}
                      >
                        <X className="h-4 w-4" /> Revoke
                      </button>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {!subscriptions.length && (
              <tr>
                <td colSpan={7} className="p-8 text-center text-slate-500">
                  No subscriptions match this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {editingSubscription && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await act(
                "/api/admin/subscriptions",
                "PATCH",
                {
                  id: editingSubscription.id,
                  planCode: editingSubscription.planCode,
                  durationDays: editingSubscription.durationDays,
                },
                "Subscription updated.",
              );
              if (ok) setEditingSubscription(null);
            }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Edit subscription</h3>
                <p className="mt-1 text-sm text-slate-500">
                  {editingSubscription.email} · Updates plan and expiry.
                </p>
              </div>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setEditingSubscription(null)}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Plan">
                <select
                  required
                  className={inputClass}
                  value={editingSubscription.planCode}
                  onChange={(e) =>
                    setEditingSubscription((v: AnyRecord) => ({
                      ...v,
                      planCode: e.target.value,
                    }))
                  }
                >
                  {plans.map((p) => (
                    <option key={p.id} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Duration in days (blank = no expiry)">
                <input
                  type="number"
                  min="1"
                  max="3650"
                  className={inputClass}
                  value={editingSubscription.durationDays}
                  onChange={(e) =>
                    setEditingSubscription((v: AnyRecord) => ({
                      ...v,
                      durationDays: e.target.value,
                    }))
                  }
                  placeholder="No expiry"
                />
              </Field>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => setEditingSubscription(null)}
              >
                Cancel
              </button>
              <button className={btnPrimary} disabled={busy}>
                <Save className="h-4 w-4" /> Save changes
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );

  const renderPayments = () => (
    <>
      <SectionHeading
        title="Payments & transactions"
        description="Read-only gateway transaction ledger. Refunds should be issued through Razorpay and then synced to the payment record."
      />
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Showing up to 500 most recent payments
        </p>
        <select
          className={`${inputClass} w-auto`}
          value={paymentStatus}
          onChange={(e) => setPaymentStatus(e.target.value)}
        >
          <option value="all">All statuses</option>
          {["created", "authorized", "captured", "failed", "refunded"].map(
            (s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ),
          )}
        </select>
      </div>
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[1100px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Plan</th>
              <th className="px-5 py-3">Amount</th>
              <th className="px-5 py-3">Provider</th>
              <th className="px-5 py-3">Order / payment ID</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Date</th>
              <th className="px-5 py-3">Action</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {payments.map((p) => (
              <tr key={p.id}>
                <td className="px-5 py-4">{p.email}</td>
                <td className="px-5 py-4">{p.planName}</td>
                <td className="px-5 py-4 font-semibold">
                  {money(p.amount, p.currency)}
                </td>
                <td className="px-5 py-4 capitalize">{p.provider}</td>
                <td className="max-w-[240px] px-5 py-4">
                  <div className="break-all text-xs">{p.orderId}</div>
                  <div className="mt-1 break-all text-[11px] text-slate-400">
                    {p.paymentId || "Payment ID pending"}
                  </div>
                </td>
                <td className="px-5 py-4">
                  <StatusPill value={p.status} />
                  {p.refundStatus && p.status !== "refunded" && (
                    <div className="mt-1 text-[11px] text-amber-700">
                      Refund: {p.refundStatus}
                    </div>
                  )}
                </td>
                <td className="px-5 py-4 whitespace-nowrap">
                  {dateLabel(p.paidAt || p.createdAt)}
                </td>
                <td className="px-5 py-4">
                  {can("payments.manage") &&
                    p.status === "captured" &&
                    p.refundId ? (
                    <button
                      className={btnSecondary}
                      onClick={() =>
                        void act(
                          "/api/admin/payments",
                          "PATCH",
                          { id: p.id, action: "sync-refund" },
                          "Refund status checked with Razorpay.",
                        )
                      }
                    >
                      Sync refund
                    </button>
                  ) : can("payments.manage") && p.status === "captured" ? (
                    <button
                      className="rounded-xl border border-rose-200 px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50"
                      onClick={() => {
                        if (
                          window.confirm(
                            `Issue a full Razorpay refund of ${money(p.amount, p.currency)} for ${p.email}? This action submits a real refund request.`,
                          )
                        )
                          void act(
                            "/api/admin/payments",
                            "PATCH",
                            { id: p.id, action: "refund" },
                            "Refund request submitted to Razorpay.",
                          );
                      }}
                    >
                      Refund
                    </button>
                  ) : (
                    "—"
                  )}
                </td>
              </tr>
            ))}
            {!payments.length && (
              <tr>
                <td colSpan={8} className="p-8 text-center text-slate-500">
                  No transactions found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderCategories = () => (
    <>
      <SectionHeading
        title="Categories"
        description="Create, edit, reorder, publish, or hide game categories. Categories with game assignments are hidden instead of hard-deleted to preserve game relationships."
      />
      <form
        className="mb-5 flex flex-wrap items-end gap-3 rounded-2xl border border-slate-200 bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(
            "/api/admin/categories",
            "POST",
            { name: categoryName, displayOrder: Number(categoryOrder) },
            "Category saved.",
          );
          if (ok) setCategoryName("");
        }}
      >
        <div className="min-w-[220px] flex-1">
          <Field label="Category name">
            <input
              required
              maxLength={100}
              className={inputClass}
              value={categoryName}
              onChange={(e) => setCategoryName(e.target.value)}
              placeholder="e.g. Word games"
            />
          </Field>
        </div>
        <div className="w-36">
          <Field label="Sort order">
            <input
              type="number"
              className={inputClass}
              value={categoryOrder}
              onChange={(e) => setCategoryOrder(e.target.value)}
            />
          </Field>
        </div>
        <button className={btnPrimary} disabled={busy}>
          <Plus className="h-4 w-4" /> Add category
        </button>
      </form>
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Category</th>
              <th className="px-5 py-3">Slug</th>
              <th className="px-5 py-3">Games</th>
              <th className="px-5 py-3">Order</th>
              <th className="px-5 py-3">Status</th>
              <th className="px-5 py-3">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {categories.map((c) => (
              <tr key={c.id}>
                <td className="px-5 py-4 font-semibold">{c.name}</td>
                <td className="px-5 py-4 text-slate-500">{c.slug}</td>
                <td className="px-5 py-4">{c.gameCount}</td>
                <td className="px-5 py-4">{c.displayOrder}</td>
                <td className="px-5 py-4">
                  <StatusPill value={c.isActive ? "active" : "disabled"} />
                </td>
                <td className="px-5 py-4">
                  <div className="flex gap-2">
                    <button
                      disabled={busy}
                      className={btnSecondary}
                      onClick={() => {
                        setEditingCategory(c);
                        setCategoryForm({
                          name: c.name,
                          displayOrder: String(c.displayOrder),
                          isActive: Boolean(c.isActive),
                        });
                        setShowCategoryModal(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                    <button
                      disabled={busy}
                      className={btnSecondary}
                      onClick={() =>
                        void act(
                          "/api/admin/categories",
                          "PATCH",
                          { id: c.id, isActive: !c.isActive },
                          "Category visibility updated.",
                        )
                      }
                    >
                      {c.isActive ? "Hide" : "Publish"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {!categories.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No categories found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      {showCategoryModal && editingCategory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4">
          <form
            className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              const ok = await act(
                "/api/admin/categories",
                "PATCH",
                {
                  id: editingCategory.id,
                  name: categoryForm.name,
                  displayOrder: Number(categoryForm.displayOrder),
                  isActive: categoryForm.isActive,
                },
                "Category updated.",
              );
              if (ok) {
                setShowCategoryModal(false);
                setEditingCategory(null);
              }
            }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">Edit category</h3>
                <p className="mt-1 text-sm text-slate-500">
                  The slug updates automatically from the category name.
                </p>
              </div>
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <div className="space-y-4">
              <Field label="Category name">
                <input
                  required
                  maxLength={100}
                  className={inputClass}
                  value={categoryForm.name}
                  onChange={(e) =>
                    setCategoryForm((old) => ({ ...old, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="Sort order">
                <input
                  required
                  type="number"
                  className={inputClass}
                  value={categoryForm.displayOrder}
                  onChange={(e) =>
                    setCategoryForm((old) => ({
                      ...old,
                      displayOrder: e.target.value,
                    }))
                  }
                />
              </Field>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-orange-600"
                  checked={categoryForm.isActive}
                  onChange={(e) =>
                    setCategoryForm((old) => ({
                      ...old,
                      isActive: e.target.checked,
                    }))
                  }
                />{" "}
                Published on frontend
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setShowCategoryModal(false);
                  setEditingCategory(null);
                }}
              >
                Cancel
              </button>
              <button disabled={busy} className={btnPrimary}>
                <Save className="h-4 w-4" /> Save changes
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );

  const renderGames = () => (
    <>
      <SectionHeading
        title="Game catalogue"
        description="Manage HTML game paths, thumbnails, category mapping and visibility."
        action={
          <button
            className={btnPrimary}
            onClick={() => {
              setGameForm(defaultGame);
              setEditingGame(false);
              setShowGameModal(true);
            }}
          >
            <Plus className="h-4 w-4" /> Add game
          </button>
        }
      />
      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-3 text-sm text-slate-500">
          {games.length} game records loaded from MySQL
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-[1000px] w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-5 py-3">Game</th>
                <th className="px-5 py-3">ID</th>
                <th className="px-5 py-3">Path</th>
                <th className="px-5 py-3">Categories</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {games.slice(0, 250).map((g) => (
                <tr key={g.id}>
                  <td className="px-5 py-4">
                    <div className="flex items-center gap-3">
                      {g.thumbnail && (
                        <img
                          src={g.thumbnail}
                          alt=""
                          className="h-10 w-14 rounded-lg border border-slate-100 object-cover"
                          onError={(e) => {
                            (
                              e.currentTarget as HTMLImageElement
                            ).style.visibility = "hidden";
                          }}
                        />
                      )}
                      <span className="font-semibold">{g.name}</span>
                    </div>
                  </td>
                  <td className="px-5 py-4 text-xs text-slate-500">{g.id}</td>
                  <td className="max-w-[250px] px-5 py-4">
                    <span className="block truncate text-xs text-slate-500">
                      {g.path}
                    </span>
                  </td>
                  <td className="px-5 py-4">
                    {(g.categories || []).join(", ") || "—"}
                  </td>
                  <td className="px-5 py-4">
                    <StatusPill value={g.isActive ? "active" : "disabled"} />
                  </td>
                  <td className="px-5 py-4">
                    <button
                      className={btnSecondary}
                      onClick={() => {
                        setGameForm({
                          id: g.id,
                          name: g.name,
                          path: g.path,
                          thumbnail: g.thumbnail || "",
                          description: g.description || "",
                          categoriesText: (g.categories || []).join(", "),
                          isFeatured: Boolean(g.isFeatured),
                          isActive: Boolean(g.isActive),
                        });
                        setEditingGame(true);
                        setShowGameModal(true);
                      }}
                    >
                      <Pencil className="h-4 w-4" /> Edit
                    </button>
                  </td>
                </tr>
              ))}
              {!games.length && (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-slate-500">
                    No games found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {games.length > 250 && (
          <div className="border-t border-slate-100 px-5 py-3 text-xs text-slate-500">
            Showing first 250 games for performance.
          </div>
        )}
      </div>
      {showGameModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/40 p-4">
          <form
            className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl"
            onSubmit={async (e) => {
              e.preventDefault();
              const body = {
                id: gameForm.id,
                name: gameForm.name,
                path: gameForm.path,
                thumbnail: gameForm.thumbnail,
                description: gameForm.description,
                categories: String(gameForm.categoriesText || "")
                  .split(",")
                  .map((x: string) => x.trim())
                  .filter(Boolean),
                isFeatured: Boolean(gameForm.isFeatured),
                isActive: gameForm.isActive !== false,
              };
              const url = editingGame
                ? `/api/admin/games/${encodeURIComponent(gameForm.id)}`
                : "/api/admin/games";
              const ok = await act(
                url,
                editingGame ? "PATCH" : "POST",
                body,
                editingGame ? "Game updated." : "Game created.",
              );
              if (ok) {
                setEditingGame(false);
                setShowGameModal(false);
                setGameForm(defaultGame);
              }
            }}
          >
            <div className="mb-5 flex items-start justify-between">
              <div>
                <h3 className="text-lg font-bold">
                  {editingGame ? "Edit game" : "Add game"}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  Use a publicly accessible HTTPS game URL and thumbnail.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setEditingGame(false);
                  setShowGameModal(false);
                  setGameForm(defaultGame);
                }}
                className="rounded-lg p-2 hover:bg-slate-100"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Game ID">
                <input
                  required
                  disabled={editingGame}
                  className={inputClass}
                  value={gameForm.id}
                  onChange={(e) =>
                    setGameForm((p: any) => ({ ...p, id: e.target.value }))
                  }
                  placeholder="arcade351"
                />
              </Field>
              <Field label="Game name">
                <input
                  required
                  className={inputClass}
                  value={gameForm.name}
                  onChange={(e) =>
                    setGameForm((p: any) => ({ ...p, name: e.target.value }))
                  }
                />
              </Field>
              <Field label="Game URL / path">
                <input
                  required
                  type="url"
                  className={inputClass}
                  value={gameForm.path}
                  onChange={(e) =>
                    setGameForm((p: any) => ({ ...p, path: e.target.value }))
                  }
                  placeholder="https://files.example.com/Games/game/index.html"
                />
              </Field>
              <Field label="Thumbnail URL">
                <input
                  type="url"
                  className={inputClass}
                  value={gameForm.thumbnail}
                  onChange={(e) =>
                    setGameForm((p: any) => ({
                      ...p,
                      thumbnail: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Categories (comma separated)">
                <input
                  required
                  className={inputClass}
                  value={gameForm.categoriesText}
                  onChange={(e) =>
                    setGameForm((p: any) => ({
                      ...p,
                      categoriesText: e.target.value,
                    }))
                  }
                  placeholder="Arcade, Casual"
                />
              </Field>
            </div>
            <div className="mt-4">
              <Field label="Description">
                <textarea
                  rows={3}
                  className={inputClass}
                  value={gameForm.description}
                  onChange={(e) =>
                    setGameForm((p: any) => ({
                      ...p,
                      description: e.target.value,
                    }))
                  }
                />
              </Field>
            </div>
            <div className="mt-4 flex flex-wrap gap-5">
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-orange-600"
                  checked={Boolean(gameForm.isFeatured)}
                  onChange={(e) =>
                    setGameForm((p: any) => ({
                      ...p,
                      isFeatured: e.target.checked,
                    }))
                  }
                />{" "}
                Featured game
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="accent-orange-600"
                  checked={gameForm.isActive !== false}
                  onChange={(e) =>
                    setGameForm((p: any) => ({
                      ...p,
                      isActive: e.target.checked,
                    }))
                  }
                />{" "}
                Published / active
              </label>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                className={btnSecondary}
                onClick={() => {
                  setEditingGame(false);
                  setShowGameModal(false);
                  setGameForm(defaultGame);
                }}
              >
                Cancel
              </button>
              <button className={btnPrimary}>
                <Save className="h-4 w-4" /> Save game
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );

  const renderSettings = () => (
    <>
      <SectionHeading
        title="Site settings & payment gateway"
        description="These settings are read by server-side Next.js APIs. Razorpay secrets are encrypted in the database and are never returned to the browser."
      />
      <form
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const ok = await act(
            "/api/admin/settings",
            "PUT",
            { site: settings.site },
            "Site settings saved.",
          );
          if (ok) void refreshCurrent();
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <Globe className="h-5 w-5 text-orange-600" />
          <h3 className="font-bold text-slate-900">General website settings</h3>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Site name">
            <input
              className={inputClass}
              maxLength={100}
              value={settings.site.siteName}
              onChange={(e) =>
                setSettings((s: any) => ({
                  ...s,
                  site: { ...s.site, siteName: e.target.value },
                }))
              }
            />
          </Field>
          <Field label="Support email">
            <input
              className={inputClass}
              type="email"
              value={settings.site.supportEmail}
              onChange={(e) =>
                setSettings((s: any) => ({
                  ...s,
                  site: { ...s.site, supportEmail: e.target.value },
                }))
              }
            />
          </Field>
        </div>
        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              className="mt-1 accent-orange-600"
              checked={Boolean(settings.site.registrationEnabled)}
              onChange={(e) =>
                setSettings((s: any) => ({
                  ...s,
                  site: { ...s.site, registrationEnabled: e.target.checked },
                }))
              }
            />
            <span>
              <span className="block text-sm font-semibold">
                Allow new registrations
              </span>
              <span className="block text-xs text-slate-500">
                Existing users can still sign in with email OTP.
              </span>
            </span>
          </label>
          <label className="flex items-start gap-3 rounded-xl border border-slate-200 p-4">
            <input
              type="checkbox"
              className="mt-1 accent-orange-600"
              checked={Boolean(settings.site.maintenanceMode)}
              onChange={(e) =>
                setSettings((s: any) => ({
                  ...s,
                  site: { ...s.site, maintenanceMode: e.target.checked },
                }))
              }
            />
            <span>
              <span className="block text-sm font-semibold">
                Maintenance mode flag
              </span>
              <span className="block text-xs text-slate-500">
                Saved for app/hosting maintenance workflows.
              </span>
            </span>
          </label>
        </div>
        <div className="mt-5 flex justify-end">
          <button className={btnPrimary} disabled={busy}>
            <Save className="h-4 w-4" /> Save site settings
          </button>
        </div>
      </form>
      <form
        className="mb-6 rounded-2xl border border-slate-200 bg-white p-5"
        onSubmit={async (e) => {
          e.preventDefault();
          const body = {
            razorpay: {
              keyId: settings.razorpay.keyId,
              secret: settings.razorpay.secret,
              webhookSecret: settings.razorpay.webhookSecret,
              mode: settings.razorpay.mode,
            },
          };
          const ok = await act(
            "/api/admin/settings",
            "PUT",
            body,
            "Razorpay settings saved.",
          );
          if (ok)
            setSettings((s: any) => ({
              ...s,
              razorpay: {
                ...s.razorpay,
                secret: "",
                webhookSecret: "",
                secretConfigured: Boolean(
                  s.razorpay.secret || s.razorpay.secretConfigured,
                ),
                webhookSecretConfigured: Boolean(
                  s.razorpay.webhookSecret ||
                  s.razorpay.webhookSecretConfigured,
                ),
              },
            }));
        }}
      >
        <div className="mb-4 flex items-center gap-2">
          <CreditCard className="h-5 w-5 text-orange-600" />
          <h3 className="font-bold text-slate-900">Razorpay configuration</h3>
        </div>
        <div className="mb-4 flex flex-wrap items-center gap-2">
          <StatusPill
            value={
              settings.razorpay.secretConfigured
                ? "configured"
                : "not configured"
            }
          />
          <span className="text-xs text-slate-500">
            API secret:{" "}
            {settings.razorpay.secretConfigured
              ? "Saved and hidden"
              : "Not set"}
          </span>
          <span className="text-xs text-slate-500">
            Webhook secret:{" "}
            {settings.razorpay.webhookSecretConfigured
              ? "Saved and hidden"
              : "Not set"}
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mode">
            <select
              className={inputClass}
              value={settings.razorpay.mode}
              onChange={(e) =>
                setSettings((s: any) => ({
                  ...s,
                  razorpay: { ...s.razorpay, mode: e.target.value },
                }))
              }
            >
              <option value="test">Test mode</option>
              <option value="live">Live mode</option>
            </select>
          </Field>
          <Field label="Razorpay Key ID">
            <input
              className={inputClass}
              value={settings.razorpay.keyId}
              onChange={(e) =>
                setSettings((s: any) => ({
                  ...s,
                  razorpay: { ...s.razorpay, keyId: e.target.value },
                }))
              }
              placeholder="rzp_test_… or rzp_live_…"
            />
          </Field>
          <div className="sm:col-span-2">
            <Field label="Razorpay Key Secret (enter only to replace)">
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={settings.razorpay.secret}
                onChange={(e) =>
                  setSettings((s: any) => ({
                    ...s,
                    razorpay: { ...s.razorpay, secret: e.target.value },
                  }))
                }
                placeholder={
                  settings.razorpay.secretConfigured
                    ? "Saved secret is hidden; leave blank to keep it"
                    : "Enter key secret"
                }
              />
            </Field>
            <p className="mt-2 text-xs text-slate-500">
              Use test keys while testing. Switching to live mode requires
              matching live keys. The stored secret is encrypted with
              SETTINGS_ENCRYPTION_KEY or AUTH_SECRET.
            </p>
          </div>
          <div className="sm:col-span-2">
            <Field label="Razorpay Webhook Secret (recommended for production)">
              <input
                className={inputClass}
                type="password"
                autoComplete="new-password"
                value={settings.razorpay.webhookSecret || ""}
                onChange={(e) =>
                  setSettings((s: any) => ({
                    ...s,
                    razorpay: { ...s.razorpay, webhookSecret: e.target.value },
                  }))
                }
                placeholder={
                  settings.razorpay.webhookSecretConfigured
                    ? "Saved webhook secret is hidden; leave blank to keep it"
                    : "Paste the webhook secret from Razorpay Dashboard"
                }
              />
            </Field>
            <p className="mt-2 text-xs text-slate-500">
              Webhook URL:{" "}
              {typeof window !== "undefined"
                ? `${window.location.origin}/api/webhooks/razorpay`
                : "https://sportrz.com/api/webhooks/razorpay"}
              . Add the payment.captured event in Razorpay Dashboard and paste
              the matching webhook secret here. Use your public HTTPS deployment
              URL in Razorpay; localhost cannot receive provider webhooks. This
              secret is encrypted at rest.
            </p>
          </div>
        </div>
        <div className="mt-5 flex justify-end">
          <button className={btnPrimary} disabled={busy}>
            <LockKeyhole className="h-4 w-4" /> Save gateway settings
          </button>
        </div>
      </form>
      <div className="rounded-2xl border border-slate-200 bg-white p-5">
        <div className="mb-4 flex items-center gap-2">
          <Mail className="h-5 w-5 text-orange-600" />
          <h3 className="font-bold text-slate-900">
            OTP email delivery (SMTP)
          </h3>
        </div>
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Status</div>
            <div className="mt-2">
              <StatusPill
                value={
                  settings.smtp.configured ? "configured" : "missing config"
                }
              />
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">SMTP host / port</div>
            <div className="mt-2 font-semibold">
              {settings.smtp.host || "—"}:{settings.smtp.port || "—"}
            </div>
          </div>
          <div className="rounded-xl bg-slate-50 p-4">
            <div className="text-xs text-slate-500">Sender</div>
            <div className="mt-2 break-all text-sm font-semibold">
              {settings.smtp.sender || "—"}
            </div>
          </div>
        </div>
        <p className="mt-3 text-xs text-slate-500">
          SMTP passwords remain in the server environment file and are
          intentionally not editable or displayed here.
        </p>
      </div>
    </>
  );

  const renderFeedback = () => (
    <>
      <SectionHeading
        title="Feedback & reviews"
        description="Review user feedback and game ratings submitted from the frontend."
      />
      <div className="grid gap-5 xl:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold">General feedback ({feedback.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {feedback.map((f) => (
              <div key={f.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{f.name}</div>
                    <div className="text-xs text-slate-500">{f.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                      ★ {f.rating}/5
                    </span>
                    {can("feedback.manage") && (
                      <button
                        title="Remove feedback"
                        className="rounded-lg border border-rose-200 p-2 text-rose-700"
                        onClick={() => {
                          if (
                            window.confirm("Remove this feedback permanently?")
                          )
                            void act(
                              "/api/admin/feedback",
                              "DELETE",
                              { id: f.id, kind: "feedback" },
                              "Feedback removed.",
                            );
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {f.comment}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {dateLabel(f.createdAt)}
                </p>
              </div>
            ))}
            {!feedback.length && (
              <p className="p-6 text-sm text-slate-500">No feedback yet.</p>
            )}
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h3 className="font-bold">Game reviews ({reviews.length})</h3>
          </div>
          <div className="divide-y divide-slate-100">
            {reviews.map((r) => (
              <div key={r.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{r.name}</div>
                    <div className="text-xs text-slate-500">
                      {r.email} ·{" "}
                      {r.gameName ||
                        (r.gameId ? `Game ID ${r.gameId}` : "Unknown game")}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="rounded-lg bg-amber-50 px-2.5 py-1 text-xs font-bold text-amber-700">
                      ★ {r.rating}/5
                    </span>
                    {can("feedback.manage") && (
                      <button
                        title="Remove game review"
                        className="rounded-lg border border-rose-200 p-2 text-rose-700"
                        onClick={() => {
                          if (
                            window.confirm(
                              "Remove this game review permanently?",
                            )
                          )
                            void act(
                              "/api/admin/feedback",
                              "DELETE",
                              { id: r.id, kind: "review" },
                              "Game review removed.",
                            );
                        }}
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-slate-700">
                  {r.comment}
                </p>
                <p className="mt-2 text-xs text-slate-400">
                  {dateLabel(r.createdAt)}
                </p>
              </div>
            ))}
            {!reviews.length && (
              <p className="p-6 text-sm text-slate-500">No reviews yet.</p>
            )}
          </div>
        </div>
      </div>
    </>
  );

  const renderAudit = () => (
    <>
      <SectionHeading
        title="Audit log"
        description="Recent administrative actions for traceability and accountability."
      />
      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <table className="min-w-[1000px] w-full text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase text-slate-500">
            <tr>
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">Actor</th>
              <th className="px-5 py-3">Action</th>
              <th className="px-5 py-3">Entity</th>
              <th className="px-5 py-3">Details</th>
              <th className="px-5 py-3">IP</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {auditEvents.map((e) => (
              <tr key={e.id}>
                <td className="px-5 py-4 whitespace-nowrap">
                  {dateLabel(e.createdAt)}
                </td>
                <td className="px-5 py-4">{e.adminEmail || "Deleted admin"}</td>
                <td className="px-5 py-4 font-semibold">{e.action}</td>
                <td className="px-5 py-4">
                  {e.entityType}
                  {e.entityId ? ` #${e.entityId}` : ""}
                </td>
                <td className="max-w-[300px] px-5 py-4">
                  <details>
                    <summary className="cursor-pointer text-orange-700">
                      View details
                    </summary>
                    <pre className="mt-2 whitespace-pre-wrap break-words text-xs text-slate-500">
                      {e.details}
                    </pre>
                  </details>
                </td>
                <td className="px-5 py-4 text-xs text-slate-500">
                  {e.ipAddress || "—"}
                </td>
              </tr>
            ))}
            {!auditEvents.length && (
              <tr>
                <td colSpan={6} className="p-8 text-center text-slate-500">
                  No administrative events logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );

  const renderActive = () => {
    if (active === "overview") return renderOverview();
    if (active === "users") return renderUsers();
    if (active === "team") return renderTeam();
    if (active === "affiliates") return renderAffiliates();
    if (active === "plans") return renderPlans();
    if (active === "subscriptions") return renderSubscriptions();
    if (active === "payments") return renderPayments();
    if (active === "games") return renderGames();
    if (active === "categories") return renderCategories();
    if (active === "messages")
      return (
        <>
          <SectionHeading
            title="Contact messages"
            description="Inbox for queries, partnerships and bug reports sent by users."
          />
          <ContactMessages canManage={can("messages.manage")} />
        </>
      );
    if (active === "feedback") return renderFeedback();
    if (active === "settings") return renderSettings();
    if (active === "audit") return renderAudit();
    return null;
  };

  if (booting || authLoading)
    return (
      <div className="flex min-h-[55vh] items-center justify-center bg-[#f6f7fb] text-slate-600">
        <div className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <LoaderCircle className="h-5 w-5 animate-spin text-orange-600" />
          <span className="text-sm font-semibold">
            Loading admin workspace…
          </span>
        </div>
      </div>
    );

  return (
    <div className="min-h-[calc(100vh-80px)] bg-[#f6f7fb] text-slate-900">
      {busy && (
        <div className="fixed inset-x-0 top-0 z-[100] h-1 overflow-hidden bg-orange-100">
          <div className="h-full w-1/3 animate-pulse bg-orange-600" />
        </div>
      )}
      <div className="mx-auto max-w-[1600px] px-3 py-4 sm:px-6 sm:py-6 lg:px-8">
        <div className="mb-5 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white px-5 py-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-orange-600 text-white shadow-md shadow-orange-600/20">
              <Shield className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-black tracking-tight sm:text-2xl">
                Sportrz Control Center
              </h1>
              <p className="mt-0.5 text-xs text-slate-500">
                Your platform, your people, your growth — all in one place.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden text-right sm:block">
              <div className="max-w-[220px] truncate text-sm font-semibold">
                {admin.user?.displayName || currentUser.email}
              </div>
              <div className="text-xs capitalize text-slate-500">
                {admin.role.replace("_", " ")}
              </div>
            </div>
            <button
              onClick={() => void refreshCurrent()}
              className={btnSecondary}
              title="Refresh current section"
            >
              <RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} />
              <span className="hidden sm:inline">Refresh data</span>
            </button>
          </div>
        </div>
        <div className="grid gap-5 lg:grid-cols-[250px_minmax(0,1fr)]">
          <aside className="h-fit rounded-2xl border border-slate-200 bg-white p-3 shadow-sm lg:sticky lg:top-4">
            <div className="px-3 pb-3 pt-2 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
              Workspace
            </div>
            <nav className="flex gap-1 overflow-x-auto lg:flex-col lg:overflow-visible">
              {visibleNav.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.key}
                    onClick={() => selectSection(item.key)}
                    className={`flex shrink-0 items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm font-semibold transition lg:w-full ${active === item.key ? "bg-orange-600 text-white shadow-md shadow-orange-600/20" : "text-slate-600 hover:bg-slate-100 hover:text-slate-950"}`}
                  >
                    <Icon className="h-4 w-4 shrink-0" />
                    <span>{item.label}</span>
                    {active === item.key && (
                      <ChevronDown className="ml-auto hidden h-4 w-4 lg:block" />
                    )}
                  </button>
                );
              })}
            </nav>
            <div className="mt-4 border-t border-slate-100 p-3">
              <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Role-based access enabled
              </div>
              <p className="mt-1 text-[11px] leading-5 text-slate-500">
                The server checks each API permission independently.
              </p>
            </div>
          </aside>
          <main className="min-w-0 rounded-2xl border border-slate-200 bg-white/70 p-4 shadow-sm sm:p-6 lg:p-7">
            {message && (
              <div
                role="alert"
                className="mb-5 flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
              >
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span className="flex-1">{message}</span>
                <button
                  onClick={() => setMessage("")}
                  className="rounded p-0.5 hover:bg-amber-100"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            )}
            {busy && (
              <div className="mb-4 flex items-center gap-2 text-xs font-medium text-slate-400">
                <LoaderCircle className="h-3.5 w-3.5 animate-spin" />
                Syncing live data…
              </div>
            )}
            {renderActive()}
          </main>
        </div>
        <footer className="mt-5 flex flex-wrap items-center justify-between gap-2 px-1 text-[11px] text-slate-400">
          <span>Sportrz Control Center.</span>
          <span>Signed in as {admin.user?.email || currentUser.email}</span>
        </footer>
      </div>
    </div>
  );
}
