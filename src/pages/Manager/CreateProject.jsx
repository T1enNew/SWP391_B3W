import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api, extractList, getErrorMessage } from '../../lib/apiClient';
import { page, card, input, button, buttonSecondary, SectionTitle } from '../_fixedShared';

const normalizeList = (payload) => {
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.datasets)) return payload.datasets;
  if (Array.isArray(payload?.users)) return payload.users;
  return [];
};

const normalizeDataset = (dataset) => ({
  ...dataset,
  id: dataset?.id ?? dataset?._id ?? dataset?.dataset_id ?? '',
  name: dataset?.name ?? dataset?.title ?? `Dataset ${dataset?.id ?? ''}`,
  status: dataset?.status ?? dataset?.dataset_status ?? '',
  data_items_count:
    dataset?.data_items_count ??
    dataset?.item_count ??
    dataset?.items_count ??
    dataset?.total_items ??
    0,
});

const normalizeUser = (user) => ({
  ...user,
  id: user?.id ?? user?._id,
  full_name: user?.full_name ?? user?.fullName ?? user?.username ?? user?.email ?? 'User',
});

export default function CreateProject() {
  const navigate = useNavigate();

  const [datasets, setDatasets] = useState([]);
  const [annotators, setAnnotators] = useState([]);
  const [reviewers, setReviewers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState('');

  const [form, setForm] = useState({
    name: '',
    description: '',
    guidelines: '',
    deadline: '',
    dataset_id: '',
    annotator_ids: [],
    reviewer_ids: [],
    export_format: 'JSON',
    review_policy: {
      mode: 'full',
      sample_rate: 1,
      reviewers_per_item: 1,
    },
  });

  useEffect(() => {
    const load = async () => {
      try {
        setLoading(true);
        setMessage('');

        const [datasetRes, annRes, revRes] = await Promise.all([
          api.get('/api/datasets?limit=100'),
          api.get('/api/users?role=annotator&limit=100'),
          api.get('/api/users?role=reviewer&limit=100'),
        ]);

        const datasetList = normalizeList(datasetRes.data)
          .map(normalizeDataset)
          .filter((d) => d.id);

        const annotatorList = normalizeList(annRes.data)
          .map(normalizeUser)
          .filter((u) => u.id);

        const reviewerList = normalizeList(revRes.data)
          .map(normalizeUser)
          .filter((u) => u.id);

        setDatasets(datasetList);
        setAnnotators(annotatorList);
        setReviewers(reviewerList);
      } catch (error) {
        setMessage(getErrorMessage(error, 'Không tải được dữ liệu tạo project.'));
      } finally {
        setLoading(false);
      }
    };

    load();
  }, []);

  const datasetOptions = useMemo(() => {
    return datasets;
  }, [datasets]);

  const toggleUser = (field, id) => {
    setForm((prev) => ({
      ...prev,
      [field]: prev[field].includes(id)
        ? prev[field].filter((x) => x !== id)
        : [...prev[field], id],
    }));
  };

  const submit = async (e) => {
    e.preventDefault();
    try {
      setMessage('');

      const payload = {
        name: form.name.trim(),
        description: form.description.trim() || undefined,
        guidelines: form.guidelines.trim() || undefined,
        deadline: form.deadline ? new Date(form.deadline).toISOString() : undefined,
        dataset_id: form.dataset_id ? Number(form.dataset_id) : undefined,
        annotator_ids: form.annotator_ids,
        reviewer_ids: form.reviewer_ids,
        export_format: form.export_format,
        review_policy: {
          mode: form.review_policy.mode || 'full',
          sample_rate: Number(form.review_policy.sample_rate || 1),
          reviewers_per_item: Number(form.review_policy.reviewers_per_item || 1),
        },
      };

      if (!payload.name) {
        setMessage('Vui lòng nhập tên project.');
        return;
      }

      const { data } = await api.post('/api/projects', payload);
      navigate(`/manager/projects/${data?.id || data?._id}`);
    } catch (error) {
      setMessage(getErrorMessage(error, 'Tạo project thất bại.'));
    }
  };

  return (
    <div className={page}>
      <SectionTitle
        title="Create Project"
        subtitle="Tạo project và gắn dataset đúng theo BE."
        right={<Link className={buttonSecondary} to="/manager/projects">Back</Link>}
      />

      {message ? (
        <div className="mb-4 rounded-lg border border-slate-700 bg-slate-800 px-4 py-3 text-sm">
          {message}
        </div>
      ) : null}

      <form className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]" onSubmit={submit}>
        <div className={card}>
          <h2 className="mb-4 text-lg font-semibold">Thông tin project</h2>

          <div className="space-y-3">
            <input
              className={input}
              placeholder="Tên project"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <textarea
              className={input}
              placeholder="Mô tả"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            <textarea
              className={input}
              placeholder="Guidelines"
              value={form.guidelines}
              onChange={(e) => setForm({ ...form, guidelines: e.target.value })}
            />

            <input
              className={input}
              type="datetime-local"
              value={form.deadline}
              onChange={(e) => setForm({ ...form, deadline: e.target.value })}
            />

            <select
              className={input}
              value={form.dataset_id}
              onChange={(e) => setForm({ ...form, dataset_id: e.target.value })}
            >
              <option value="">Không gắn dataset</option>
              {datasetOptions.map((dataset) => (
                <option key={dataset.id} value={dataset.id}>
                  {dataset.name}
                  {dataset.status ? ` • ${dataset.status}` : ''}
                  {typeof dataset.data_items_count === 'number'
                    ? ` • ${dataset.data_items_count} items`
                    : ''}
                </option>
              ))}
            </select>

            {loading ? (
              <div className="text-sm text-slate-400">Đang tải datasets...</div>
            ) : datasetOptions.length === 0 ? (
              <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-200">
                Không có dataset nào được load lên. Kiểm tra lại API `/api/datasets`.
              </div>
            ) : null}

            <select
              className={input}
              value={form.export_format}
              onChange={(e) => setForm({ ...form, export_format: e.target.value })}
            >
              {['JSON', 'CSV', 'COCO', 'YOLO', 'VOC'].map((f) => (
                <option key={f} value={f}>
                  {f}
                </option>
              ))}
            </select>

            <div>
              <div className="mb-2 text-sm text-slate-300">Reviewers per item</div>
              <input
                className={input}
                type="number"
                min="1"
                value={form.review_policy.reviewers_per_item}
                onChange={(e) =>
                  setForm({
                    ...form,
                    review_policy: {
                      ...form.review_policy,
                      reviewers_per_item: Number(e.target.value || 1),
                    },
                  })
                }
              />
            </div>

            <button className={button} type="submit">
              Tạo project
            </button>
          </div>
        </div>

        <div className="space-y-6">
          <div className={card}>
            <h2 className="mb-4 text-lg font-semibold">Annotators</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {annotators.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.annotator_ids.includes(user.id)}
                    onChange={() => toggleUser('annotator_ids', user.id)}
                  />
                  <span>{user.full_name}</span>
                </label>
              ))}
            </div>
          </div>

          <div className={card}>
            <h2 className="mb-4 text-lg font-semibold">Reviewers</h2>
            <div className="grid gap-2 md:grid-cols-2">
              {reviewers.map((user) => (
                <label
                  key={user.id}
                  className="flex items-center gap-2 rounded-lg border border-slate-700 bg-slate-900/60 p-3 text-sm"
                >
                  <input
                    type="checkbox"
                    checked={form.reviewer_ids.includes(user.id)}
                    onChange={() => toggleUser('reviewer_ids', user.id)}
                  />
                  <span>{user.full_name}</span>
                </label>
              ))}
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}