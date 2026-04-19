import React, { useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api, extractList, getErrorMessage } from '../../lib/apiClient';
import {
  page,
  card,
  buttonSecondary,
  SectionTitle,
  EmptyState,
  StatusBadge,
} from '../_fixedShared';

const normalizeProject = (project) => ({
  ...project,
  id: project?.id ?? project?._id,
  name: project?.name ?? project?.title ?? 'Project detail',
  dataset_id: project?.dataset_id ?? project?.dataset?.id ?? project?.dataset?._id ?? null,
  dataset_name:
    project?.dataset?.name ||
    project?.dataset_name ||
    project?.dataset_title ||
    null,
  guidelines: project?.guidelines ?? '',
});

const normalizeTask = (task) => ({
  ...task,
  id: task?.id ?? task?._id,
  status: task?.status ?? 'unknown',
  annotator_name:
    task?.annotator?.full_name ||
    task?.annotator?.username ||
    task?.annotator_name ||
    '—',
  reviewer_name:
    task?.reviewer?.full_name ||
    task?.reviewer?.username ||
    task?.reviewer_name ||
    '—',
  file_name:
    task?.data_item?.original_name ||
    task?.data_item?.filename ||
    task?.filename ||
    task?.id,
});

export default function ManagerProjectDetail() {
  const { id } = useParams();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [reviewStats, setReviewStats] = useState(null);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [projectRes, taskRes, datasetRes] = await Promise.all([
          api.get(`/api/projects/${id}`),
          api.get(`/api/tasks/project/${id}?limit=200`),
          api.get('/api/datasets?limit=100'),
        ]);

        setProject(normalizeProject(projectRes.data));
        setTasks(extractList(taskRes.data).map(normalizeTask).filter((t) => t.id));
        setDatasets(extractList(datasetRes.data));

     try {
  const statsRes = await api.get(`/api/reviews/projects/${id}/stats`);
  setReviewStats(statsRes.data || null);
} catch (error) {
  console.warn('Skip project review stats:', error?.response?.data || error.message);
  setReviewStats(null);
}
      } catch (error) {
        setMessage(getErrorMessage(error, 'Không tải được chi tiết project.'));
      }
    };

    load();
  }, [id]);
const datasetName = useMemo(() => {
  if (!project) return '—';

  if (project.dataset_name) return project.dataset_name;
  if (project.dataset?.name) return project.dataset.name;

  if (!project.dataset_id) {
    return 'Dataset info not returned by backend';
  }

  const found = datasets.find(
    (d) =>
      String(d?.id) === String(project.dataset_id) ||
      String(d?._id) === String(project.dataset_id)
  );

  return found?.name || `Dataset #${project.dataset_id}`;
}, [project, datasets]);

  const taskGroups = useMemo(
    () => ({
      assigned: tasks.filter((t) => t.status === 'assigned').length,
      in_progress: tasks.filter((t) => t.status === 'in_progress').length,
      submitted: tasks.filter((t) => t.status === 'submitted' || t.status === 'resubmitted').length,
      approved: tasks.filter((t) => t.status === 'approved').length,
      rejected: tasks.filter((t) => t.status === 'rejected').length,
    }),
    [tasks]
  );

  return (
    <div className={page}>
      <SectionTitle
        title={project?.name || 'Project detail'}
        subtitle={project?.description || 'Chi tiết project và tasks đã được tạo.'}
        right={<Link className={buttonSecondary} to="/manager/projects">Back</Link>}
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
        <div className="space-y-6">
          <div className={card}>
            <h2 className="mb-4 text-lg font-semibold">Thông tin project</h2>
            {project ? (
              <div className="space-y-3 text-sm">
                <div>
                  <span className="text-slate-400">Dataset:</span> {datasetName}
                </div>
                <div>
                  <span className="text-slate-400">Status:</span> <StatusBadge value={project.status} />
                </div>
                <div>
                  <span className="text-slate-400">Deadline:</span>{' '}
                  {project.deadline ? new Date(project.deadline).toLocaleString() : '—'}
                </div>
                <div>
                  <span className="text-slate-400">Guidelines:</span> {project.guidelines || '—'}
                </div>
              </div>
            ) : (
              <div className="text-sm text-slate-400">Đang tải…</div>
            )}
          </div>

          <div className={card}>
            <h2 className="mb-4 text-lg font-semibold">Task summary</h2>
            <div className="grid grid-cols-2 gap-3">
              {Object.entries(taskGroups).map(([key, value]) => (
                <div
                  key={key}
                  className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
                >
                  <div className="text-xs uppercase text-slate-400">{key}</div>
                  <div className="mt-2 text-2xl font-bold">{value}</div>
                </div>
              ))}
            </div>

            {reviewStats ? (
              <div className="mt-4 text-sm text-slate-400">
                Approval rate: {reviewStats.approval_rate ?? 0}% • Approved: {reviewStats.approved ?? 0} • Rejected: {reviewStats.rejected ?? 0}
              </div>
            ) : null}
          </div>
        </div>

        <div className={card}>
          <h2 className="mb-4 text-lg font-semibold">Tasks</h2>
          <div className="space-y-3">
            {tasks.map((task) => (
              <div
                key={task.id}
                className="rounded-xl border border-slate-700 bg-slate-900/60 p-4"
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-medium">{task.file_name}</div>
                    <div className="mt-1 text-xs text-slate-400">
                      Annotator: {task.annotator_name} • Reviewer: {task.reviewer_name}
                    </div>
                  </div>
                  <StatusBadge value={task.status} />
                </div>
              </div>
            ))}

            {tasks.length === 0 ? (
              <EmptyState text="Project này chưa có task. Hãy tạo project kèm dataset + annotators để auto-generate tasks." />
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}