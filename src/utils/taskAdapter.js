export const normalizeLabel = (label) => ({
  ...label,
  id: label?.id || label?._id || null,
  name: label?.name || label?.label || '',
  color: label?.color || '#3b82f6',
  description: label?.description || '',
  shortcut: label?.shortcut || '',
});

export const normalizeDataItem = (item) => {
  if (!item) return null;
  return {
    ...item,
    id: item.id,
    filename: item.filename || item.original_name || item.originalName || '',
    originalName: item.originalName || item.original_name || item.filename || '',
    mimeType: item.mimeType || item.mime_type || '',
    path: item.path || item.storage_path || '',
    storagePath: item.storagePath || item.storage_path || '',
    storageUrl: item.storageUrl || item.storage_url || '',
    signedUrl: item.signedUrl || item.signed_url || item.storage_url || '',
    subtopicId: item.subtopicId || item.subtopic_id || item.subtopic?.id || null,
    subtopic: item.subtopic || null,
  };
};

export const normalizeTask = (task) => {
  if (!task) return null;
  const dataItem = normalizeDataItem(task.dataItem || task.data_item);
  const project = task.projectId || task.project || null;
  const dataset = task.datasetId || task.dataset || null;
  const labelSet = task.labelsetId || task.labelSet || task.label_set || null;
  const subtopic = task.subtopicId || dataItem?.subtopic || null;

  return {
    ...task,
    dataItem,
    data_item: dataItem,
    projectId: project,
    project,
    datasetId: dataset,
    dataset,
    labelsetId: labelSet,
    labelSet,
    label_set: labelSet,
    subtopicId: subtopic,
    availableLabels: (labelSet?.labels || task.availableLabels || []).map(normalizeLabel),
    labels: task.labels || task.annotation_data || {},
  };
};

export const normalizeProject = (project) => {
  if (!project) return null;
  const dataset = project.datasetId || project.dataset || null;
  const datasetSubtopics = dataset?.subtopics || [];
  const topSubtopics = project.subtopics || datasetSubtopics || [];
  return {
    ...project,
    projectName: project.projectName || project.name || '',
    datasetName: project.datasetName || dataset?.name || '',
    topicName: project.topicName || dataset?.topic?.name || '',
    datasetId: dataset,
    dataset,
    subtopics: topSubtopics.map((sub) => ({
      ...sub,
      subtopicId: sub.subtopicId || sub.id,
      subtopicName: sub.subtopicName || sub.name || '',
      guideline: sub.guideline || '',
    })),
  };
};
