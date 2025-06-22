import { Container, Box, Typography } from '@mui/material';
import { styled } from '@mui/material/styles';

const StyledContainer = styled(Container)(({ theme }) => ({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '100vh',
  padding: theme.spacing(4),
}));

const VideoWrapper = styled(Box)(({ theme }) => ({
  position: 'relative',
  overflow: 'hidden',
  width: '100%',
  paddingTop: '56.25%', // 16:9 aspect ratio
  borderRadius: theme.shape.borderRadius,
  boxShadow: theme.shadows[6],
  backgroundColor: theme.palette.background.paper,
}));

const StyledIframe = styled('iframe')({
  position: 'absolute',
  top: 0,
  left: 0,
  width: '100%',
  height: '100%',
  border: 0,
});

const Livestream = () => {
  return (
    <StyledContainer maxWidth="md">
      <Box mb={4} textAlign="center">
        <Typography variant="h4" component="h1" gutterBottom>
          Live Stream
        </Typography>
        <Typography variant="subtitle1" color="textSecondary">
          Urmărește transmisia live în direct
        </Typography>
      </Box>

      <VideoWrapper>
        <StyledIframe
          src="https://www.youtube.com/embed/LrGXtSDGmWA?si=zex50f2zCRkHyw6R"
          title="YouTube video player"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </VideoWrapper>
    </StyledContainer>
  );
};

export default Livestream;