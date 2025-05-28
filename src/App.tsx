import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { ThemeProvider, createTheme } from '@mui/material';
import Layout from './components/Layout';
import Home from './components/Home';
import Help from './components/Help';
import './App.css';

const theme = createTheme({
  palette: {
    primary: {
      main: '#070aac',
    },
  },
});

function App() {
  return (
    <ThemeProvider theme={theme}>
      <Router basename="/river/">
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Home />} />
            <Route path="help" element={<Help />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  );
}

export default App;
