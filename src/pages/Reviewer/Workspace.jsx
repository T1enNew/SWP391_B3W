import React from 'react';
import { Link, useParams } from 'react-router-dom';
import { page, card, button, SectionTitle } from '../_fixedShared';

export default function ReviewerWorkspace() {
  const { projectId } = useParams();
  return <div className={page}><SectionTitle title="Reviewer Workspace" subtitle="Màn này được rút gọn. Dùng danh sách task của project để mở màn review chi tiết." right={<Link className={button} to={`/reviewer/projects/${projectId}`}>Mở task list</Link>} /><div className={card}><p className="text-sm text-slate-400">Workspace cũ phụ thuộc flow cũ của FE. Bản fix này chuyển reviewer sang route /reviewer/tasks/:id để review trực tiếp theo endpoint /api/reviews/task/:id.</p></div></div>;
}
