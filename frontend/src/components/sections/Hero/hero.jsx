import { Box, Button, Container, Typography } from "@mui/material";
import { Link } from "react-router-dom";
import backgroundImage from "../../../assets/pictures/home-background.jpg";

const HeroSection = () => (
    <Box
        sx={{
            height: "100vh",
            textAlign: "center",
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            backgroundImage: `url(${backgroundImage})`,
            backgroundSize: "100% 100%",
            backgroundPosition: "center",
            backgroundRepeat: "no-repeat",
        }}
    >
        <Container>
            <Typography variant="h2" gutterBottom color="primary.contrastText" sx={{ textShadow: "4px 4px 4px black" }}>
                Organizator Competiții Arte Marțiale
            </Typography>
            <Typography variant="h5" gutterBottom color="primary.contrastText" sx={{ textShadow: "4px 4px 4px black" }}>
                Înscrieri, programări și gestionare competiții profesionale
            </Typography>
            <Button variant="contained" color="primary" size="large" component={Link} to="/competitions" sx={{ mt: 3, mx: 2 }}>
                Vezi Competiții
            </Button>
        </Container>
    </Box>
);

export default HeroSection;
