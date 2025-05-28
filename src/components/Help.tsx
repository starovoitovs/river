import { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeSlug from 'rehype-slug';
import { Box, Drawer, List, ListItemButton, ListItemText, Toolbar } from '@mui/material';

const DRAWER_WIDTH = 280;

interface TOCItem {
  level: number;
  text: string;
  id: string;
}

export default function Help() {
  const [content, setContent] = useState('');
  const [toc, setToc] = useState<TOCItem[]>([]);

  // Extract TOC from markdown content
  const extractTOC = useCallback((markdown: string) => {
    const headingRegex = /^(#{1,6})\s+(.+)$/gm;
    const items: TOCItem[] = [];
    let match;

    while ((match = headingRegex.exec(markdown)) !== null) {
      const level = match[1].length;
      const text = match[2];
      const id = text.toLowerCase().replace(/[^\w\s-]/g, '')
        .replace(/\s+/g, '-');
      items.push({ level, text, id });
    }

    return items;
  }, []);

  const location = useLocation();

  useEffect(() => {
    const handleInitialScroll = () => {
      if (location.hash) {
        const id = location.hash.substring(1);
        const element = document.getElementById(id);
        if (element) {
          element.scrollIntoView({ behavior: 'smooth' });
        }
      }
    };

    // Small delay to ensure content is loaded
    const timer = setTimeout(handleInitialScroll, 100);
    return () => clearTimeout(timer);
  }, [location.hash]);

  useEffect(() => {
    fetch('/river/ABOUT.md')
      .then(response => response.text())
      .then(text => {
        setContent(text);
        setToc(extractTOC(text));
      })
      .catch(error => console.error('Error loading help content:', error));
  }, [extractTOC]);

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderTOCItem = (item: TOCItem) => (
    <ListItemButton
      key={item.id}
      onClick={() => scrollToSection(item.id)}
      sx={{ 
        pl: item.level * 2,
        py: 0.5
      }}
    >
      <ListItemText 
        primary={item.text}
        primaryTypographyProps={{
          variant: item.level === 1 ? 'subtitle1' : 'body2',
          fontWeight: item.level === 1 ? 500 : 400
        }}
      />
    </ListItemButton>
  );

  return (
    <Box sx={{ display: 'flex' }}>
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
          },
        }}
      >
        <Toolbar /> {/* Add spacing for fixed AppBar */}
        <Box sx={{ overflow: 'auto' }}>
          <List dense component="nav">
            {toc.map(renderTOCItem)}
          </List>
        </Box>
      </Drawer>

      <Box sx={{ 
        flex: 1, 
        px: 4,
        pb: 4,
        '& img': { maxWidth: '100%', height: 'auto' },
        '& h1': { mb: 3 },
        '& h2': { mt: 4, mb: 2 },
        '& h3': { mt: 3, mb: 2 },
        '& p': { mb: 2 },
        '& ul, & ol': { mb: 2 },
        '& code': { 
          backgroundColor: '#f7f7f7',
          padding: '2px 4px',
          borderRadius: 1,
          fontSize: '0.9em',
        },
        '& pre': {
          backgroundColor: '#f7f7f7',
          padding: 2,
          borderRadius: 1,
          overflowX: 'auto'
        }
      }}>
        <ReactMarkdown 
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeSlug]}
        >
          {content}
        </ReactMarkdown>
      </Box>
    </Box>
  );
}