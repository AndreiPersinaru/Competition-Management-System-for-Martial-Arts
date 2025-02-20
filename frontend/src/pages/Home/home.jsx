import Navbar from "../../components/sections/Navbar/navbar";
import { Box, Button, Container, Typography, Card, CardContent, Paper, Chip } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { EventAvailable, EmojiEvents, Timeline, ListAlt } from "@mui/icons-material";
import { Link } from "react-router-dom";
import backgroundImage from "../../assets/pictures/home-background.jpg";

const Home = () => {
    // Date demo competiții (înlocuiește cu date reale)
    const upcomingEvents = [
        { name: "Campionatul National de Judo", date: "15 Octombrie 2024", location: "București", discipline: "Judo" },
        { name: "Cupa Karate Transilvania", date: "5 Noiembrie 2024", location: "Cluj-Napoca", discipline: "Karate" },
    ];

    const whatWeOffer = [
        {
            icon: <EventAvailable fontSize="large" />,
            title: "Înscrieri Online",
            text: "Sistem simplu de înscriere cu plata integrată",
        },
        {
            icon: <EmojiEvents fontSize="large" />,
            title: "Clasamente Live",
            text: "Urmărește rezultatele în timp real",
        },
        {
            icon: <ListAlt fontSize="large" />,
            title: "Programări",
            text: "Orar competiții și categorii de vârstă",
        },
    ];

    return (
        <>
            <Navbar />

            {/* Hero Section */}
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
                    <Button variant="contained" color="primary" size="large" component={Link} to="/" sx={{ mt: 3, mx: 2 }}>
                        Vezi Competiții
                    </Button>
                    <Button variant="contained" color="secondary" size="large" component={Link} to="/" sx={{ mt: 3, mx: 2 }}>
                        Înscrie-te Acum
                    </Button>
                </Container>
            </Box>

            {/* Urmatoarele Competiții */}
            <Box sx={{ pt: 8, pb: 12, bgcolor: "primary.main" }}>
                <Container>
                    <Typography variant="h4" color="white" gutterBottom sx={{ mb: 4, textAlign: "center" }}>
                        Următoarele Competiții
                    </Typography>
                    <Grid container spacing={4}>
                        {upcomingEvents.map((event, index) => (
                            <Grid size={{ xs: 12, md: 6 }} key={index}>
                                <Card elevation={3}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                            <EventAvailable color="primary" sx={{ mr: 2 }} />
                                            <Typography variant="h6">{event.name}</Typography>
                                        </Box>

                                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                            <Chip label={event.date} color="info" variant="outlined" icon={<Timeline fontSize="small" />} />
                                            <Chip label={event.location} color="success" variant="outlined" icon={<ListAlt fontSize="small" />} />
                                        </Box>

                                        <Button fullWidth variant="contained" sx={{ mt: 3 }} component={Link} to={`/competition/${index}`}>
                                            Detalii & Înscriere
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Functionalități */}
            <Box sx={{ py: 8 }}>
                <Container>
                    <Typography variant="h4" align="center" sx={{ mb: 4 }}>
                        Ce oferim
                    </Typography>
                    <Grid container spacing={4}>
                        {whatWeOffer.map((feature, index) => (
                            <Grid mb = {{ xs: 4, md: 0 }} size={{ xs: 12, md: 4 }} key={index}>
                                <Paper elevation={4} sx={{ p: 2, height: "100%" }}>
                                    <Box sx={{ textAlign: "center", mb: 2 }}>{feature.icon}</Box>
                                    <Typography variant="h5" align="center" gutterBottom>
                                        {feature.title}
                                    </Typography>
                                    <Typography align="center">{feature.text}</Typography>
                                </Paper>
                            </Grid>
                        ))}
                    </Grid>
                </Container>
            </Box>

            {/* Footer */}
            <Paper sx={{ bgcolor: "primary.main", color: "white", mt: 8 }}>
                <Container>
                    <Box py={4} textAlign="center">
                        <Typography variant="body2">© 2025 Martial Arts Competitions Platform</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Contact: contact@email.ro | Tel: +40 712 345 678
                        </Typography>
                    </Box>
                </Container>
            </Paper>
        </>
    );
};

export default Home;
