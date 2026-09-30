import { Trash2 } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useAppStore, type ExerciseDraft } from '../store/useAppStore';
import { cn } from '../utils/cn';
import { Modal } from './Modal';

const EMPTY_DRAFT: ExerciseDraft = {
  name: '',
  sets: 3,
  reps: '10',
  weight: 20,
  step: 2.5,
  tip: '',
  unit: 'kg',
};

export function ExerciseEditorModal() {
  const editor = useAppStore((state) => state.ui.editor);
  const closeEditor = useAppStore((state) => state.closeEditor);
  const dayTemplates = useAppStore((state) => state.dayTemplates);
  const addExercise = useAppStore((state) => state.addExercise);
  const updateExercise = useAppStore((state) => state.updateExercise);
  const deleteExercise = useAppStore((state) => state.deleteExercise);
  const openConfirm = useAppStore((state) => state.openConfirm);
  const pushToast = useAppStore((state) => state.pushToast);

  const editing = editor?.exercise ?? null;
  const template = dayTemplates.find((item) => item.id === editor?.dayTemplateId);

  const [draft, setDraft] = useState<ExerciseDraft>(EMPTY_DRAFT);

  useEffect(() => {
    if (!editor) return;
    setDraft(
      editor.exercise
        ? {
            name: editor.exercise.name,
            sets: editor.exercise.sets,
            reps: editor.exercise.reps,
            weight: editor.exercise.weight,
            step: editor.exercise.step,
            tip: editor.exercise.tip,
            unit: editor.exercise.unit,
          }
        : EMPTY_DRAFT,
    );
  }, [editor]);

  const patch = (next: Partial<ExerciseDraft>) => setDraft((prev) => ({ ...prev, ...next }));

  const handleSave = async () => {
    if (!editor) return;
    if (!draft.name.trim()) {
      pushToast('请填写动作名称', 'error');
      return;
    }
    if (!Number.isFinite(draft.sets) || draft.sets < 1 || draft.sets > 20) {
      pushToast('组数请填 1-20', 'error');
      return;
    }
    if (!Number.isFinite(draft.weight) || draft.weight < 0) {
      pushToast('重量请填非负数字', 'error');
      return;
    }

    if (editing) {
      await updateExercise(editor.dayTemplateId, editing.id, draft);
    } else {
      await addExercise(editor.dayTemplateId, draft);
    }
    closeEditor();
  };

  const handleDelete = () => {
    if (!editor || !editing) return;
    openConfirm({
      title: '删除动作',
      message: `确定要删除「${editing.name}」吗？已有的完成记录也会一并清除。`,
      confirmText: '删除',
      danger: true,
      onConfirm: () => deleteExercise(editor.dayTemplateId, editing.id),
    });
  };

  const inputClass =
    'h-12 w-full rounded-chip border border-brand-400/15 bg-night-950/60 px-3.5 text-sm text-slate-100 outline-none transition placeholder:text-slate-600 focus:border-brand-400/55';

  return (
    <Modal
      open={editor !== null}
      onClose={closeEditor}
      title={editing ? '编辑动作' : '新增动作'}
      subtitle={template ? `${template.label} · ${template.title}` : undefined}
      footer={
        <div className="flex gap-2.5">
          {editing && (
            <button
              type="button"
              onClick={handleDelete}
              aria-label="删除动作"
              className="grid h-12 w-12 shrink-0 place-items-center rounded-chip border border-rose-400/25 bg-rose-500/10 text-rose-300 transition active:scale-95"
            >
              <Trash2 size={17} />
            </button>
          )}
          <button
            type="button"
            onClick={() => void handleSave()}
            className="h-12 flex-1 rounded-chip bg-gradient-to-r from-brand-400 to-aqua-400 text-sm font-semibold text-night-950 shadow-lg shadow-brand-500/20 transition active:scale-[0.98]"
          >
            {editing ? '保存修改' : '添加到训练日'}
          </button>
        </div>
      }
    >
      <div className="space-y-3.5">
        <label className="block">
          <span className="mb-1.5 block text-[11px] text-slate-400">动作名称</span>
          <input
            value={draft.name}
            onChange={(event) => patch({ name: event.target.value })}
            placeholder="例如：器械夹胸"
            className={inputClass}
          />
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] text-slate-400">组数</span>
            <input
              value={String(draft.sets)}
              onChange={(event) => patch({ sets: Number(event.target.value) })}
              inputMode="numeric"
              type="number"
              min={1}
              max={20}
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] text-slate-400">次数</span>
            <input
              value={draft.reps}
              onChange={(event) => patch({ reps: event.target.value })}
              placeholder="10 或 力竭"
              className={inputClass}
            />
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[11px] text-slate-400">默认重量</span>
            <input
              value={String(draft.weight)}
              onChange={(event) => patch({ weight: Number(event.target.value) })}
              inputMode="decimal"
              type="number"
              step="0.5"
              className={inputClass}
            />
          </label>

          <label className="block">
            <span className="mb-1.5 block text-[11px] text-slate-400">加减步进</span>
            <input
              value={String(draft.step)}
              onChange={(event) => patch({ step: Number(event.target.value) })}
              inputMode="decimal"
              type="number"
              step="0.5"
              className={inputClass}
            />
          </label>
        </div>

        <div>
          <span className="mb-1.5 block text-[11px] text-slate-400">类型</span>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { value: 'kg', label: '负重（kg）' },
                { value: 'bodyweight', label: '自重 / 可负重' },
              ] as const
            ).map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => patch({ unit: option.value })}
                className={cn(
                  'h-12 rounded-chip border text-sm font-medium transition active:scale-[0.97]',
                  draft.unit === option.value
                    ? 'border-transparent bg-gradient-to-r from-brand-500/35 to-aqua-500/25 text-slate-50'
                    : 'border-white/8 bg-night-850/60 text-slate-400 hover:border-brand-400/25',
                )}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1.5 block text-[11px] text-slate-400">提示（可选）</span>
          <input
            value={draft.tip}
            onChange={(event) => patch({ tip: event.target.value })}
            placeholder="例如：离心控制 3 秒"
            className={inputClass}
          />
        </label>
      </div>
    </Modal>
  );
}
