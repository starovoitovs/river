import { Link, Outlet } from 'react-router-dom';
import { AppBar, Toolbar, Button, Box } from '@mui/material';

export default function Layout() {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <AppBar 
        position="fixed" 
        color="primary"
        elevation={0}
        sx={{ zIndex: (theme) => theme.zIndex.drawer + 1 }}
      >
        <Toolbar>
          <Button component={Link} to="/" color="inherit">
            River Analysis
          </Button>
          <Button component={Link} to="/help" color="inherit">
            Help
          </Button>
        </Toolbar>
      </AppBar>
      <Toolbar /> {/* Add spacing below fixed AppBar */}
      <Box sx={{ flex: 1 }}>
        <Outlet />
      </Box>
    </Box>
  );
}