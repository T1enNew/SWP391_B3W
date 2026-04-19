import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, extractList, getErrorMessage } from '../../lib/apiClient';
import { page, button, SectionTitle, EmptyState, pill, StatusBadge } from '../_fixedShared';

const normalizeDataset = (dataset) => ({
  ...dataset,
  id: dataset?.id ?? dataset?._id ?? dataset?.dataset_id ?? null,
  name: dataset?.name ?? dataset?.title ?? 'Untitled dataset',
});

const normalizeProject = (project) => ({
  ...project,
  id: project?.id ?? project?._id,
  name: project?.name ?? project?.title ?? 'Untitled project',
  dataset_id:
    project?.dataset_id ??
    project?.dataset?.id ??
    project?.dataset?._id ??
    null,
  dataset_name:
    project?.dataset?.name ||
    project?.dataset_name ||
    project?.dataset_title ||
    project?.datasetId?.name ||
    null,
  export_format: project?.export_format || 'JSON',
  total_tasks:
    project?.total_tasks ??
    project?.task_count ??
    project?.tasks_count ??
    project?.totalItems ??
    0,
  reviewed_tasks:
    project?.reviewed_tasks ??
    project?.review_count ??
    project?.reviews_count ??
    0,
  created_at: project?.created_at || project?.createdAt || null,
});

export default function ManagerProjects() {
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const [projectRes, datasetRes] = await Promise.all([
          api.get('/api/projects?limit=100'),
          api.get('/api/datasets?limit=200'),
        ]);

        const projectList = extractList(projectRes.data)
          .map(normalizeProject)
          .filter((p) => p.id);

        const datasetList = extractList(datasetRes.data)
          .map(normalizeDataset)
          .filter((d) => d.id);

        setProjects(projectList);
        setDatasets(datasetList);
      } catch (e) {
        setMessage(getErrorMessage(e, 'Không tải được danh sách project.'));
      }
    };

    load();
  }, []);

  const datasetMap = useMemo(() => {
    const map = new Map();
    datasets.forEach((d) => {
      map.set(String(d.id), d.name);
    });
    return map;
  }, [datasets]);

  const sortedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aTime = a?.created_at ? new Date(a.created_at).getTime() : 0;
      const bTime = b?.created_at ? new Date(b.created_at).getTime() : 0;
      return bTime - aTime;
    });
  }, [projects]);

const getDatasetName = (project) => {
  if (project?.dataset_name) return project.dataset_name;
  if (project?.dataset?.name) return project.dataset.name;

  const byMap = project?.dataset_id
    ? datasetMap.get(String(project.dataset_id))
    : null;

  if (byMap) return byMap;

  return project?.dataset_id
    ? `Dataset #${project.dataset_id}`
    : 'Dataset info not returned by backend';
};

  return (
    <div className={page}>
      <SectionTitle
        title="Projects"
        subtitle="Danh sách project hiện có của manager."
        right={
          <Link className={button} to="/manager/projects/create">
            Create project
          </Link>
        }
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <div className="grid gap-4">
        {sortedProjects.map((project) => (
          <button
            key={project.id}
            className="w-full rounded-2xl border border-slate-800 bg-slate-800/70 p-5 text-left hover:border-blue-500"
            onClick={() => navigate(`/manager/projects/${project.id}`)}
          >
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-lg font-semibold">{project.name}</div>
                <div className="mt-1 text-sm text-slate-400">
                  {getDatasetName(project)} • {project.export_format}
                </div>
              </div>
              <StatusBadge value={project.status} />
            </div>

            <div className="mt-3 flex flex-wrap gap-2 text-xs text-slate-400">
              <span className={pill}>Tasks: {project.total_tasks || 0}</span>
              <span className={pill}>Reviewed: {project.reviewed_tasks || 0}</span>
              {project.deadline ? (
                <span className={pill}>
                  Deadline: {new Date(project.deadline).toLocaleString()}
                </span>
              ) : null}
            </div>
          </button>
        ))}

        {sortedProjects.length === 0 ? (
          <EmptyState text="Chưa có project nào." />
        ) : null}
      </div>
    </div>
  );
}