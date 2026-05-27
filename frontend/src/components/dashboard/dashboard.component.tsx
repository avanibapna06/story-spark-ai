import { useGetDashboardAnalysisQuery } from "../../redux/apis/analysis.api";
import TopicsChart from "../chart/dashboard/bar_chart";
import SubscriptionChart from "../chart/dashboard/doughnut_chart";
import PostsPerMonthChart from "../chart/dashboard/line_chart";
import UsersPieChart from "../chart/dashboard/pai_chart";
import LoadingAnimation from "../loading/loading.component";

const DashboardComponent = () => {
  const { data, isLoading } = useGetDashboardAnalysisQuery(undefined);

  if (isLoading) {
    return <LoadingAnimation />;
  }

  const stats = data
    ? [
        {
          title: "Total Users",
          value: data.users.total,
          icon: "fa-users",
          gradient: "from-blue-600 to-cyan-500",
          glow: "shadow-blue-500/5 dark:shadow-blue-500/20",
          border: "border-blue-100 dark:border-blue-500/20",
          bg: "bg-blue-50/40 dark:bg-blue-500/10",
          iconBg: "bg-blue-100 dark:bg-blue-500/15",
          iconColor: "text-blue-600 dark:text-blue-400",
          badge: "Active platform",
          badgeColor: "text-blue-600 dark:text-blue-400",
        },
        {
          title: "Total Posts",
          value: data.posts.total,
          icon: "fa-newspaper",
          gradient: "from-violet-600 to-purple-500",
          glow: "shadow-violet-500/5 dark:shadow-violet-500/20",
          border: "border-violet-100 dark:border-violet-500/20",
          bg: "bg-violet-50/40 dark:bg-violet-500/10",
          iconBg: "bg-violet-100 dark:bg-violet-500/15",
          iconColor: "text-violet-600 dark:text-violet-400",
          badge: "Published content",
          badgeColor: "text-violet-600 dark:text-violet-400",
        },
        {
          title: "Subscriptions",
          value:
            data.subscriptionTypes.free +
            data.subscriptionTypes.pro +
            data.subscriptionTypes.premium,
          icon: "fa-credit-card",
          gradient: "from-emerald-600 to-teal-500",
          glow: "shadow-emerald-500/5 dark:shadow-emerald-500/20",
          border: "border-emerald-100 dark:border-emerald-500/20",
          bg: "bg-emerald-50/40 dark:bg-emerald-500/10",
          iconBg: "bg-emerald-100 dark:bg-emerald-500/15",
          iconColor: "text-emerald-600 dark:text-emerald-400",
          badge: "All tiers",
          badgeColor: "text-emerald-600 dark:text-emerald-400",
        },
        {
          title: "Writer Applications",
          value: data.users.applyForWriter,
          icon: "fa-pen-nib",
          gradient: "from-amber-500 to-orange-500",
          glow: "shadow-amber-500/5 dark:shadow-amber-500/20",
          border: "border-amber-100 dark:border-amber-500/20",
          bg: "bg-amber-50/40 dark:bg-amber-500/10",
          iconBg: "bg-amber-100 dark:bg-amber-500/15",
          iconColor: "text-amber-600 dark:text-amber-400",
          badge: "Pending review",
          badgeColor: "text-amber-600 dark:text-amber-400",
        },
      ]
    : [];

  return (
    <div className="space-y-8">
      {/* HERO SECTION */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-50 via-slate-50 to-blue-50 border border-slate-200 shadow-xl dark:from-[#0f1c3a] dark:via-[#0d1a3a] dark:to-[#111433] dark:border-white/[0.07] p-6 md:p-8">
        <div className="absolute -top-16 -right-16 w-64 h-64 bg-blue-600/15 rounded-full blur-[60px]" />
        <div className="absolute bottom-0 left-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-[50px]" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-100/50 dark:bg-blue-500/10 border border-blue-200/50 dark:border-blue-500/20 mb-4">
              <span className="w-1.5 h-1.5 rounded-full bg-blue-500 dark:bg-blue-400 animate-pulse"></span>
              <span className="text-[10px] uppercase tracking-widest text-blue-600 dark:text-blue-300 font-semibold">
                Live Analytics Dashboard
              </span>
            </div>

            <h1 className="text-4xl font-black text-slate-800 dark:text-white leading-tight mb-3">
              Welcome Back 👋
            </h1>

            <p className="text-slate-600 dark:text-slate-400 text-base max-w-xl">
              Monitor platform growth, track engagement, and manage your
              ecosystem through a modern analytics experience.
            </p>
          </div>
        </div>
      </div>

      {/* STATS GRID */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {stats.map((item) => (
          <div
            key={item.title}
            className={`rounded-2xl border ${item.border} ${item.bg} p-5 shadow-xl ${item.glow}`}
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className={`flex items-center justify-center w-10 h-10 rounded-xl ${item.iconBg}`}
              >
                <i className={`fas ${item.icon} ${item.iconColor} text-sm`}></i>
              </div>

              <span className={`text-[10px] ${item.badgeColor}`}>
                {item.badge}
              </span>
            </div>

            <p className="text-slate-500 dark:text-slate-400 text-xs mb-2">{item.title}</p>

            <h2 className="text-4xl font-black text-slate-800 dark:text-white">
              {item.value.toLocaleString()}
            </h2>
          </div>
        ))}
      </div>

      {/* EMPTY STATE */}
      {!data && (
        <div className="rounded-2xl border border-slate-200 dark:border-white/[0.06] bg-slate-50/50 dark:bg-white/[0.02] p-20 text-center">
          <h2 className="text-3xl font-black text-slate-800 dark:text-white mb-3">
            Analytics Not Available
          </h2>

          <p className="text-slate-600 dark:text-slate-400">
            Dashboard insights are currently unavailable.
          </p>
        </div>
      )}

      {/* CHARTS GRID */}
      {data && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <div className="rounded-2xl border border-blue-100 bg-slate-50/50 p-6 dark:border-blue-500/15 dark:bg-white/[0.02]">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Users Distribution
            </h2>

            <UsersPieChart data={data.users} />
          </div>

          <div className="rounded-2xl border border-emerald-100 bg-slate-50/50 p-6 dark:border-emerald-500/15 dark:bg-white/[0.02]">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Subscription Overview
            </h2>

            <SubscriptionChart data={data.subscriptionTypes} />
          </div>

          <div className="rounded-2xl border border-violet-100 bg-slate-50/50 p-6 dark:border-violet-500/15 dark:bg-white/[0.02]">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">Monthly Posts</h2>

            <PostsPerMonthChart perMonth={data.posts.perMonth} />
          </div>

          <div className="rounded-2xl border border-amber-100 bg-slate-50/50 p-6 dark:border-amber-500/15 dark:bg-white/[0.02]">
            <h2 className="text-lg font-bold text-slate-800 dark:text-white mb-4">
              Topics Analytics
            </h2>

            <TopicsChart topics={data.posts.topics} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DashboardComponent;