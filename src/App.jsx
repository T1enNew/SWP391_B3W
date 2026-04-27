import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { AuthProvider } from './context/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import ManagerDashboard from './pages/Manager/Dashboard';
import ManagerProjects from './pages/Manager/Projects';
import CreateProject from './pages/Manager/Projects/CreateProject';
import ManagerProjectDetail from './pages/Manager/Projects/ProjectDetail';
import AnnotatorAuditDetail from './pages/Manager/Projects/AnnotatorAudit';
import Datasets from './pages/Manager/Datasets';
import DatasetItemDetail from './pages/Manager/Datasets/DatasetItemDetail';
import Labels from './pages/Manager/Taxonomy/Labels';
import AnnotatorOverview from './pages/Annotator/Dashboard';
import AnnotatorProjectList from './pages/Annotator/Projects';
import AnnotatorProjectDetail from './pages/Annotator/Projects/ProjectDetail';
import Workspace from './pages/Annotator/Workspace';
import AnnotatorHistory from './pages/Annotator/History';
import ReviewerProjectList from './pages/Reviewer/Projects';
import ReviewerProjectDetailPage from './pages/Reviewer/Projects/ProjectDetail';
import ReviewerWorkspace from './pages/Reviewer/Workspace';
import ReviewerTask from './pages/Reviewer/Task';
import ReviewerOverview from './pages/Reviewer/Dashboard';
import ReviewerHistory from './pages/Reviewer/History';
import AdminDashboard from './pages/Admin/Dashboard';
import AdminUsers from './pages/Admin/Users';
import AdminActivityLogs from './pages/Admin/ActivityLogs';
import AdminSystemSettings from './pages/Admin/SystemSettings';
import LayoutTailwind from './components/LayoutTailwind';
import ErrorBoundary from './components/ErrorBoundary';
import LayoutAnnotator from './components/LayoutAnnotator';
import LayoutReviewer from './components/LayoutReviewer';

const darkTheme = createTheme({
  palette: { mode: 'dark', primary: { main: '#3b82f6' }, background: { default: '#0f172a', paper: '#1e293b' } },
  components: { MuiButton: { styleOverrides: { root: { textTransform: 'none' } } } },
});

const ROLE_PATHS = { annotator: '/annotator', reviewer: '/reviewer', admin: '/admin' };

const getRoleRedirect = () => {
  const token = sessionStorage.getItem('token');
  if (!token) return '/login';
  try {
    const { role } = JSON.parse(atob(token.split('.')[1]));
    return ROLE_PATHS[role] ?? '/dashboard';
  } catch {
    return '/dashboard';
  }
};

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <AuthProvider>
        <Router>
          <Routes>
            <Route path='/login' element={<Login />} />
            <Route path='/register' element={<Register />} />
            <Route element={<PrivateRoute><ErrorBoundary><LayoutTailwind /></ErrorBoundary></PrivateRoute>}>
              <Route path='/dashboard' element={<ManagerDashboard />} />
              <Route path='/manager/projects' element={<ManagerProjects />} />
              <Route path='/manager/projects/create' element={<CreateProject />} />
              <Route path='/manager/projects/:id' element={<ManagerProjectDetail />} />
              <Route path='/manager/annotators/:projectId/:annotatorId' element={<AnnotatorAuditDetail />} />
              <Route path='/manager/datasets' element={<Datasets />} />
              <Route path='/manager/datasets/:id' element={<DatasetItemDetail />} />
              <Route path='/manager/datasets/:id/items/*' element={<DatasetItemDetail />} />
              <Route path='/manager/labels' element={<Labels />} />
              <Route path='/admin' element={<AdminDashboard />} />
              <Route path='/admin/users' element={<AdminUsers />} />
              <Route path='/admin/system-settings' element={<AdminSystemSettings />} />
              <Route path='/admin/activity-logs' element={<AdminActivityLogs />} />
            </Route>

            <Route element={<PrivateRoute><LayoutAnnotator /></PrivateRoute>}>
              <Route path='/annotator' element={<AnnotatorOverview />} />
              <Route path='/annotator/tasks' element={<AnnotatorProjectList />} />
              <Route path='/annotator/projects/:projectId' element={<AnnotatorProjectDetail />} />
              <Route path='/annotator/workspace/:projectId' element={<Workspace />} />
              <Route path='/annotator/history' element={<AnnotatorHistory />} />
            </Route>

            <Route element={<PrivateRoute><LayoutReviewer /></PrivateRoute>}>
              <Route path='/reviewer' element={<ReviewerOverview />} />
              <Route path='/reviewer/tasks' element={<ReviewerProjectList />} />
              <Route path='/reviewer/projects/:projectId' element={<ReviewerProjectDetailPage />} />
              <Route path='/reviewer/workspace/:projectId' element={<ReviewerWorkspace />} />
              <Route path='/reviewer/tasks/:id' element={<ReviewerTask />} />
              <Route path='/reviewer/history' element={<ReviewerHistory />} />
            </Route>

            <Route path='/' element={<Navigate to={getRoleRedirect()} replace />} />
            <Route path='*' element={<Navigate to='/dashboard' replace />} />
          </Routes>
        </Router>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;