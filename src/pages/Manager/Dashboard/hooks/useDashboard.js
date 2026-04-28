// useDashboard.js
// Custom hook cung cấp toàn bộ data và thống kê cho trang Manager Dashboard.
//
// Luồng fetch dữ liệu (chạy một lần khi mount):
//   1. Fetch song song: danh sách datasets + danh sách projects
//   2. Với mỗi project → fetch tasks của project đó (Promise.allSettled)
//   3. Từ tasks → build statusList (gom count theo trạng thái cho từng dataset)
//
// Thống kê trả về (stats — được tính bằng useMemo, tự cập nhật khi data thay đổi):
//   - KPI tổng: totalDatasets, totalProjects, totalTasks, totalApproved, totalRejected...
//   - approvalRate, completionRate
//   - datasetHealth[]   — trạng thái + tiến độ từng dataset
//   - projectStats[]    — tiến độ, deadline, status từng project (sắp xếp theo rủi ro)
//   - annotatorPerf[]   — hiệu suất từng annotator (top 6)
//   - reviewerPerf[]    — hiệu suất từng reviewer (top 6)
//   - alerts[]          — cảnh báo tự động (reject cao, overdue, at risk, pending review)
//   - pipeline          — phân bổ tasks theo từng stage

import { useEffect, useMemo, useState } from 'react';
import axios from 'axios';
import { API_URL } from '../../../../config/api';

// Lấy JWT token từ sessionStorage (ưu tiên) hoặc localStorage (fallback)
const getAuthToken = () =>
  sessionStorage.getItem('token') || localStorage.getItem('token') || '';

export function useDashboard() {
  const [loading, setLoading]           = useState(true);
  const [datasets, setDatasets]         = useState([]);
  const [projects, setProjects]         = useState([]);
  const [statusList, setStatusList]     = useState([]);
  const [projectTaskMap, setProjectTaskMap] = useState({});

  useEffect(() => {
    const fetchAll = async () => {
      try {
        const token   = getAuthToken();
        const headers = token ? { Authorization: `Bearer ${token}` } : {};

        const [datasetsRes, projectsRes] = await Promise.allSettled([
          axios.get(`${API_URL}/api/datasets`, { headers }),
          axios.get(`${API_URL}/api/projects`, { params: { page: 1, limit: 100 }, headers }),
        ]);

        const dsList = datasetsRes.status === 'fulfilled'
          ? (Array.isArray(datasetsRes.value.data)
              ? datasetsRes.value.data
              : datasetsRes.value.data?.data || [])
          : [];

        const pjList = projectsRes.status === 'fulfilled'
          ? (Array.isArray(projectsRes.value.data)
              ? projectsRes.value.data
              : projectsRes.value.data?.data || projectsRes.value.data?.projects || [])
          : [];

        setDatasets(dsList);
        setProjects(pjList);

        const taskResults = await Promise.allSettled(
          pjList.map((p) =>
            axios.get(`${API_URL}/api/tasks/project/${p._id || p.id}`, { headers })
          )
        );

        const ptMap = {};
        pjList.forEach((p, idx) => {
          const pid     = p._id || p.id;
          const taskRes = taskResults[idx];
          ptMap[pid] = taskRes?.status === 'fulfilled'
            ? (Array.isArray(taskRes.value.data)
                ? taskRes.value.data
                : taskRes.value.data?.data || taskRes.value.data?.tasks || [])
            : [];
        });
        setProjectTaskMap(ptMap);

        // Build statusList: không có API trực tiếp dataset→tasks,
        // nên tính ngược: với mỗi dataset → tìm các project dùng dataset đó → gom tasks
        const syntheticStatuses = dsList.map((ds) => {
          const dsId          = ds._id || ds.id;
          const linkedProjects = pjList.filter((p) => {
            const did = p.dataset?.id || p.dataset?._id || p.dataset_id || p.datasetId;
            return did === dsId;
          });

          let totalRaw = ds.total_items || ds.totalItems || 0;
          const counts = { approved: 0, submitted: 0, rejected: 0, pendingAnnotation: 0 };

          linkedProjects.forEach((p) => {
            const tasks = ptMap[p._id || p.id] || [];
            tasks.forEach((t) => {
              if      (t.status === 'approved')  counts.approved++;
              else if (t.status === 'submitted') counts.submitted++;
              else if (t.status === 'rejected')  counts.rejected++;
              else                               counts.pendingAnnotation++;
            });
            if (!totalRaw) totalRaw = tasks.length;
          });

          return { datasetId: dsId, datasetName: ds.name || 'Unnamed', datasetType: ds.type || 'image', totalRawItems: totalRaw, counts, votes: {}, finalItems: [], annotators: [] };
        });

        setStatusList(syntheticStatuses);
      } catch (err) {
        console.error('Dashboard fetch failed:', err);
        setDatasets([]); setProjects([]); setStatusList([]); setProjectTaskMap({});
      } finally {
        setLoading(false);
      }
    };
    fetchAll();
  }, []);

  // stats — tính toán từ raw data, chỉ tính lại khi datasets/projects/statusList/projectTaskMap thay đổi.
  // Không gọi API ở đây, chỉ xử lý thuần JavaScript.
  const stats = useMemo(() => {
    const totalDatasets = datasets.length;
    const totalProjects = projects.length;

    let totalRawItems = 0, totalApproved = 0, totalPending = 0, totalRejected = 0, totalSubmitted = 0, totalTasks = 0;

    const annotatorMap = {};
    const reviewerMap  = {};

    Object.entries(projectTaskMap).forEach(([, tasks]) => {
      totalTasks += tasks.length;
      tasks.forEach((t) => {
        const aId   = t.annotatorId?._id || t.annotatorId?.id || (typeof t.annotatorId === 'string' ? t.annotatorId : null)
                   || t.annotator?._id   || t.annotator?.id   || (typeof t.annotator   === 'string' ? t.annotator   : null);
        const aName = t.annotatorId?.full_name || t.annotatorId?.username || t.annotatorId?.name
                   || t.annotator?.full_name   || t.annotator?.username   || t.annotator?.name || 'Unknown';
        if (aId) {
          if (!annotatorMap[aId]) annotatorMap[aId] = { name: aName, tasks: 0, approved: 0, rejected: 0, submitted: 0 };
          annotatorMap[aId].tasks++;
          if      (t.status === 'approved')  annotatorMap[aId].approved++;
          else if (t.status === 'rejected')  annotatorMap[aId].rejected++;
          else if (t.status === 'submitted') annotatorMap[aId].submitted++;
        }

        // Lấy reviewer từ task-level (reviewerId) — đây là field chính backend trả về
        const rIdTask   = t.reviewerId?._id || t.reviewerId?.id || (typeof t.reviewerId === 'string' ? t.reviewerId : null)
                       || t.reviewer?._id   || t.reviewer?.id   || (typeof t.reviewer   === 'string' ? t.reviewer   : null);
        const rNameTask = t.reviewerId?.full_name || t.reviewerId?.username || t.reviewerId?.name
                       || t.reviewer?.full_name   || t.reviewer?.username   || t.reviewer?.name || 'Reviewer';
        if (rIdTask && (t.status === 'approved' || t.status === 'rejected')) {
          if (!reviewerMap[rIdTask]) reviewerMap[rIdTask] = { name: rNameTask, reviewed: 0, approved: 0, rejected: 0 };
          reviewerMap[rIdTask].reviewed++;
          if (t.status === 'approved') reviewerMap[rIdTask].approved++;
          else                         reviewerMap[rIdTask].rejected++;
        }

        // Fallback: nếu backend trả về mảng t.reviewers thì vẫn đọc được
        (t.reviewers || []).forEach((rv) => {
          const rId   = rv?.reviewerId?._id || rv?.reviewerId?.id || (typeof rv?.reviewerId === 'string' ? rv.reviewerId : null);
          const rName = rv?.reviewerId?.full_name || rv?.reviewerId?.username || rv?.reviewerId?.name || 'Reviewer';
          if (rId && rId !== rIdTask) {
            if (!reviewerMap[rId]) reviewerMap[rId] = { name: rName, reviewed: 0, approved: 0, rejected: 0 };
            if (rv.status === 'approved' || rv.status === 'rejected') {
              reviewerMap[rId].reviewed++;
              if (rv.status === 'approved') reviewerMap[rId].approved++;
              else                          reviewerMap[rId].rejected++;
            }
          }
        });
      });
    });

    statusList.forEach((s) => {
      totalRawItems  += s.totalRawItems       || 0;
      totalApproved  += s.counts?.approved    || 0;
      totalPending   += s.counts?.pendingAnnotation || 0;
      totalRejected  += s.counts?.rejected    || 0;
      totalSubmitted += s.counts?.submitted   || 0;
    });

    const reviewed       = totalApproved + totalRejected;
    const approvalRate   = reviewed      > 0 ? Math.round((totalApproved / reviewed)      * 100) : 0;
    const completionRate = totalRawItems > 0 ? Math.round((totalApproved / totalRawItems) * 100) : 0;

    // datasetHealth: tính state hiển thị cho từng dataset dựa trên tỷ lệ approved/rejected/submitted.
    // Thứ tự ưu tiên: Ready > Needs Attention > Reviewing > Annotating > Not Started
    const datasetHealth = statusList.map((s) => {
      const raw               = s.totalRawItems              || 0;
      const approved          = s.counts?.approved           || 0;
      const pendingAnnotation = s.counts?.pendingAnnotation  || 0;
      const submitted         = s.counts?.submitted          || 0;
      const rejected          = s.counts?.rejected           || 0;
      const progress          = raw > 0 ? Math.round((approved          / raw) * 100) : 0;
      const rejRate           = raw > 0 ? Math.round((rejected          / raw) * 100) : 0;

      let state = 'Not Started', stateColor = '#94a3b8', stateBg = 'rgba(148,163,184,0.12)';
      if (approved > 0 && progress >= 100)   { state = 'Ready';           stateColor = '#22c55e'; stateBg = 'rgba(34,197,94,0.12)';   }
      else if (rejRate > 30)                 { state = 'Needs Attention'; stateColor = '#ef4444'; stateBg = 'rgba(239,68,68,0.12)';   }
      else if (submitted > 0)                { state = 'Reviewing';       stateColor = '#f59e0b'; stateBg = 'rgba(245,158,11,0.12)';  }
      else if (pendingAnnotation > 0 || rejected > 0) { state = 'Annotating'; stateColor = '#3b82f6'; stateBg = 'rgba(59,130,246,0.12)'; }

      return { id: s.datasetId, name: s.datasetName, type: s.datasetType, raw, approved, submitted, pendingAnnotation, rejected, progress, rejRate, state, stateColor, stateBg };
    });

    // projectStats: tính progress, rejRate, deadline status cho từng project.
    // Sắp xếp theo mức rủi ro giảm dần: Overdue → At Risk → Needs Review → On Track
    const now = new Date();
    const projectStats = projects.map((p) => {
      const pid      = p._id || p.id;
      const tasks    = projectTaskMap[pid] || [];
      const total    = tasks.length;
      const approved = tasks.filter((t) => t.status === 'approved').length;
      const rejected = tasks.filter((t) => t.status === 'rejected').length;
      const submitted = tasks.filter((t) => t.status === 'submitted').length;
      const progress = total > 0 ? Math.round((approved / total)  * 100) : 0;
      const rejRate  = total > 0 ? Math.round((rejected  / total) * 100) : 0;

      const deadline     = p.deadline || p.due_date || null;
      const deadlineDate = deadline ? new Date(deadline) : null;
      const daysLeft     = deadlineDate ? Math.ceil((deadlineDate - now) / 86400000) : null;

      let status = 'On Track';
      if      (daysLeft !== null && daysLeft < 0 && progress < 100) status = 'Overdue';
      else if (daysLeft !== null && daysLeft <= 3 && progress < 90) status = 'At Risk';
      else if (rejRate > 30)                                         status = 'Needs Review';

      return { id: pid, name: p.name || 'Untitled', progress, rejRate, deadline, daysLeft, status, total, approved, rejected, submitted, taskStatus: p.status || 'active' };
    }).sort((a, b) => {
      const o = { Overdue: 0, 'At Risk': 1, 'Needs Review': 2, 'On Track': 3 };
      return (o[a.status] ?? 4) - (o[b.status] ?? 4);
    });

    // annotatorPerf / reviewerPerf: lấy top 6 theo số task/review nhiều nhất,
    // tính approvalRate = approved / (approved + rejected) * 100
    const annotatorPerf = Object.values(annotatorMap)
      .sort((a, b) => b.tasks - a.tasks).slice(0, 6)
      .map((a) => ({ ...a, approvalRate: (a.approved + a.rejected) > 0 ? Math.round((a.approved / (a.approved + a.rejected)) * 100) : 0 }));

    const reviewerPerf = Object.values(reviewerMap)
      .sort((a, b) => b.reviewed - a.reviewed).slice(0, 6)
      .map((r) => ({ ...r, approvalRate: r.reviewed > 0 ? Math.round((r.approved / r.reviewed) * 100) : 0 }));

    // alerts: tự động sinh cảnh báo từ data (không cần cấu hình).
    // Ưu tiên: reject cao → overdue → at risk → pending review
    const alerts = [];
    datasetHealth.filter((ds) => ds.rejRate > 30 && ds.raw > 0)
      .forEach((ds) => alerts.push({ type: 'rejection', msg: `Dataset "${ds.name}" có tỷ lệ reject ${ds.rejRate}%`, sev: 'error' }));
    projectStats.filter((p) => p.status === 'Overdue')
      .forEach((p) => alerts.push({ type: 'overdue', msg: `Project "${p.name}" đã quá hạn deadline`, sev: 'error' }));
    projectStats.filter((p) => p.status === 'At Risk')
      .forEach((p) => alerts.push({ type: 'deadline', msg: `Project "${p.name}" còn ${p.daysLeft} ngày — tiến độ ${p.progress}%`, sev: 'warning' }));
    if (totalSubmitted > 0)
      alerts.push({ type: 'review', msg: `${totalSubmitted} task đang chờ reviewer xét duyệt`, sev: 'info' });

    return {
      totalDatasets, totalProjects, totalTasks, totalRawItems,
      totalApproved, totalPending, totalRejected, totalSubmitted,
      approvalRate, completionRate,
      datasetHealth, projectStats, annotatorPerf, reviewerPerf, alerts,
      pipeline: { raw: totalRawItems, annotating: totalPending, submitted: totalSubmitted, approved: totalApproved, rework: totalRejected },
    };
  }, [datasets, projects, statusList, projectTaskMap]);

  return { loading, stats };
}
