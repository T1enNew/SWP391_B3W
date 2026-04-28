// useProjects.js
// Custom hook quản lý toàn bộ dữ liệu trang danh sách Projects của Manager.
// Fetch song song project list + dataset list, sau đó fetch task stats cho từng project
// để tính trạng thái hiển thị chính xác (không chỉ dựa vào project.status từ backend).

import { useCallback, useEffect, useMemo, useState } from "react";
import axios from "axios";
import { API_URL } from "../../../../config/api";
import { getArray } from "../../../../utils/api";
import { getAuthHeaders } from "../../../../utils/auth";
import {
  normalizeProject,
  computeTaskStats,
  getDisplayStatus,
  OVERDUE_STATUSES,
} from "../projectStatusUtils";

// Hook chính — dùng ở trang Projects/index.jsx
// Trả về: danh sách project, dataset, trạng thái loading, taskStatsMap (đếm task theo project),
// counts (đếm project theo từng status để hiển thị StatTile), hàm loadData để refresh
export function useProjects() {
  const [projects, setProjects] = useState([]);
  const [datasets, setDatasets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [taskStatsMap, setTaskStatsMap] = useState({});
  const [taskStatsLoading, setTaskStatsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch toàn bộ dữ liệu cần thiết cho trang:
  //   Bước 1: Fetch project list + dataset list song song (Promise.allSettled)
  //   Bước 2: Fetch task list cho từng project song song → tính taskStatsMap
  // Dùng allSettled để 1 API lỗi không làm hỏng phần còn lại
  const loadData = useCallback(async () => {
    setLoading(true);
    setTaskStatsMap({});
    try {
      const [projectRes, datasetRes] = await Promise.allSettled([// Bước 1: Fetch project list + dataset list song song
        axios.get(`${API_URL}/api/projects`, {
          params: { page: 1, limit: 100 },
          headers: getAuthHeaders(),
        }),
        axios.get(`${API_URL}/api/datasets`, { headers: getAuthHeaders() }),
      ]);

      let pList = [];
      if (projectRes.status === "fulfilled") {
        const pData = projectRes.value.data;
        pList = pData?.data ? pData.data : getArray(pData);
        setProjects(pList.map(normalizeProject));
        //Tức là dữ liệu project từ backend có thể
        //  là _id, id, name, title khác nhau thì được đưa về format thống nhất.
      } else {
        setError("Không tải được danh sách project");
      }
      if (datasetRes.status === "fulfilled")
        setDatasets(getArray(datasetRes.value.data));

      if (pList.length > 0) {
        setTaskStatsLoading(true);
        const taskResults = await Promise.allSettled(
          pList.map((p) =>
            axios.get(`${API_URL}/api/tasks/project/${p.id || p._id}`, {
              // vơ8í mỗi pj gọi task của nó
              headers: getAuthHeaders(),
            })
          )
        );
        const statsMap = {};
        taskResults.forEach((res, i) => {
          if (res.status === "fulfilled") {
            const raw = Array.isArray(res.value.data)
              ? res.value.data
              : res.value.data?.data || res.value.data?.tasks || [];
            const pid = pList[i].id || pList[i]._id;
            const stats = computeTaskStats(raw);
            if (stats) statsMap[pid] = stats; //lấy raw rồi tính thống kê
          }
        });
        setTaskStatsMap(statsMap);
        setTaskStatsLoading(false);
      }
    } catch (e) {
      setError(e?.response?.data?.message || e.message || "Không tải được project");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Đếm project theo từng status hiển thị — dùng để render các StatTile ở đầu trang.
  // Phụ thuộc vào taskStatsMap: khi taskStatsMap thay đổi, counts tự cập nhật.
  const counts = useMemo(() => { //Cái này giúp UI biết project đó thực tế đang chạy tới đâu.
    const ds = (p) => getDisplayStatus(p, taskStatsMap[p.id || p._id] || null);
    //Có nghĩa là lấy status hiển thị của project.
    return {
      all: projects.length,
      active: projects.filter((p) => ds(p) === "active").length,
      completed: projects.filter((p) => ds(p) === "completed").length,
      draft: projects.filter((p) => ds(p) === "draft").length,
      archived: projects.filter((p) => ds(p) === "archived").length,
      reviewer_pending: projects.filter((p) => ds(p) === "reviewer_pending").length,
      overdue: projects.filter((p) => OVERDUE_STATUSES.includes(ds(p))).length,
    };
  }, [projects, taskStatsMap]);

  return {
    projects,
    datasets,
    loading,
    taskStatsMap,
    taskStatsLoading,
    error,
    counts,
    loadData,
  };
}
