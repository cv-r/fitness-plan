import { AlertTriangle, DatabaseZap } from "lucide-react";
import { useEffect } from "react";
import { AiChatDrawer } from "./components/AiChatDrawer";
import { AiFab } from "./components/AiFab";
import { CalendarModal } from "./components/CalendarModal";
import { ConfirmModal } from "./components/ConfirmModal";
import { DailyTipModal } from "./components/DailyTipModal";
import { DaySelector } from "./components/DaySelector";
import { ExerciseEditorModal } from "./components/ExerciseEditorModal";
import { Header } from "./components/Header";
import { useDailyTip } from "./hooks/useDailyTip";
import { MotivationBar } from "./components/MotivationBar";
import { ProfileStrip } from "./components/ProfileStrip";
import { RestDay } from "./components/RestDay";
import { SettingsModal } from "./components/SettingsModal";
import { ToastHost } from "./components/Toast";
import { TrainingDay } from "./components/TrainingDay";
import { useAppStore } from "./store/useAppStore";

function Splash() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4">
      <div className="grid h-16 w-16 animate-pulse place-items-center rounded-3xl bg-gradient-to-br from-brand-400 to-aqua-400 text-lg font-black text-night-950 shadow-2xl shadow-brand-500/25">
        ZR
      </div>
      <p className="text-xs text-slate-500">正在加载训练数据…</p>
    </div>
  );
}

export default function App() {
  const ready = useAppStore((state) => state.ready);
  const error = useAppStore((state) => state.error);
  const storageDegraded = useAppStore((state) => state.storageDegraded);
  const init = useAppStore((state) => state.init);

  const currentDate = useAppStore((state) => state.currentDate);
  const dayRecords = useAppStore((state) => state.dayRecords);
  const dayTemplates = useAppStore((state) => state.dayTemplates);
  const selectDay = useAppStore((state) => state.selectDay);
  const markRest = useAppStore((state) => state.markRest);
  const clearDay = useAppStore((state) => state.clearDay);
  const resetDay = useAppStore((state) => state.resetDay);
  const openConfirm = useAppStore((state) => state.openConfirm);

  useEffect(() => {
    void init();
  }, [init]);

  // 数据就绪后自动要一次 AI 每日激励：每天一次，没配 Key 时内部直接跳过
  useDailyTip();

  if (!ready) return <Splash />;

  const record = dayRecords[currentDate];
  const template = record?.dayTemplateId
    ? dayTemplates.find((item) => item.id === record.dayTemplateId)
    : undefined;

  const handlePick = async (dayTemplateId: string) => {
    if (record?.dayTemplateId) {
      openConfirm({
        title: "切换训练日",
        message: "切换后当天的完成记录会被清空，确定继续吗？",
        confirmText: "切换",
        onConfirm: () => selectDay(dayTemplateId),
      });
      return;
    }
    await selectDay(dayTemplateId);
  };

  const handleRest = async () => {
    if (record?.dayTemplateId) {
      openConfirm({
        title: "标记为休息日",
        message: "标记休息会清空当天已有的训练记录，确定继续吗？",
        confirmText: "标记休息",
        onConfirm: markRest,
      });
      return;
    }
    await markRest();
  };

  const handleReselect = () => {
    openConfirm({
      title: "重选训练日",
      message: "重选会清空当天的完成记录，回到训练日选择界面。确定继续吗？",
      confirmText: "重选",
      onConfirm: clearDay,
    });
  };

  const handleReset = () => {
    openConfirm({
      title: "重置本日训练",
      message: "所有动作的重量会恢复成模板默认值，完成组数清零。确定继续吗？",
      confirmText: "重置",
      onConfirm: resetDay,
    });
  };

  return (
    <div className="flex min-h-dvh flex-col">
      <Header />
      <MotivationBar />

      {storageDegraded && (
        <div className="px-safe px-4 pt-3">
          <div className="mx-auto flex w-full max-w-md items-start gap-2 rounded-chip border border-amber-400/25 bg-amber-500/10 px-3 py-2.5">
            <DatabaseZap size={14} className="mt-0.5 shrink-0 text-amber-300" />
            <p className="text-[11px] leading-relaxed text-amber-200">
              IndexedDB 不可用，已降级到 localStorage，数据仍会保存在本机。
            </p>
          </div>
        </div>
      )}

      {error && (
        <div className="px-safe px-4 pt-3">
          <div className="mx-auto flex w-full max-w-md items-start gap-2 rounded-chip border border-rose-400/25 bg-rose-500/10 px-3 py-2.5">
            <AlertTriangle
              size={14}
              className="mt-0.5 shrink-0 text-rose-300"
            />
            <p className="text-[11px] leading-relaxed text-rose-200">
              数据加载异常：{error}
            </p>
          </div>
        </div>
      )}

      <main className="flex-1 space-y-3 pt-3 pb-28">
        <ProfileStrip />

        {template ? (
          <TrainingDay
            template={template}
            record={record}
            onReselect={handleReselect}
            onReset={handleReset}
          />
        ) : record?.isRest ? (
          <RestDay onReselect={handleReselect} />
        ) : (
          <DaySelector
            onPick={(id) => void handlePick(id)}
            onRest={() => void handleRest()}
          />
        )}
      </main>

      <AiFab />
      <AiChatDrawer />
      <DailyTipModal />
      <CalendarModal />
      <SettingsModal />
      <ExerciseEditorModal />
      <ConfirmModal />
      <ToastHost />
    </div>
  );
}
