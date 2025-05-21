import { Box, Typography, Container, Card, CardContent, Chip, Button } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { EventAvailable, Timeline, LocationOn, CheckCircleOutline, AccessTime } from "@mui/icons-material";
import { Link } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";
import Navbar from "../../components/sections/Navbar/navbar";
import Footer from "../../components/sections/Footer/footer";
import { useTheme } from "@mui/material/styles";
import API_URL from "../../config";

export default function Competitions() {
    const [competitions, setCompetitions] = useState([]);
    const [showPast, setShowPast] = useState(false);
    const theme = useTheme();

    const lunaRomana = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

    const fetchAllCompetitions = async () => {
        try {
            const response = await axios.get(`${API_URL}/competitions/`);
            const formatted = response.data.map((event) => {
                const startDate = new Date(event.data_incepere);
                const endDate = new Date(event.data_sfarsit);
                const now = new Date();

                let dateFormatted = "";
                if (startDate.toDateString() === endDate.toDateString()) {
                    dateFormatted = `${startDate.getDate()} ${lunaRomana[startDate.getMonth()]} ${startDate.getFullYear()}`;
                } else {
                    const sameMonth = startDate.getMonth() === endDate.getMonth();
                    const sameYear = startDate.getFullYear() === endDate.getFullYear();
                    if (sameMonth && sameYear) {
                        dateFormatted = `${startDate.getDate()}-${endDate.getDate()} ${lunaRomana[endDate.getMonth()]} ${endDate.getFullYear()}`;
                    } else {
                        dateFormatted = `${startDate.getDate()} ${lunaRomana[startDate.getMonth()]} - ${endDate.getDate()} ${lunaRomana[endDate.getMonth()]} ${endDate.getFullYear()}`;
                    }
                }

                let status = "upcoming";
                if (endDate < now) status = "past";
                else if (startDate <= now && now <= endDate) status = "ongoing";

                return {
                    name: event.nume,
                    date: dateFormatted,
                    location: event.oras,
                    startDate: startDate,
                    id: event.id,
                    timestamp: startDate.getTime(),
                    status,
                };
            });

            const sorted = formatted.sort((a, b) => a.timestamp - b.timestamp);
            setCompetitions(sorted);
        } catch (error) {
            setCompetitions([]);
        }
    };

    useEffect(() => {
        fetchAllCompetitions();
    }, []);

    const visibleCompetitions = competitions.filter((c) => showPast || c.status !== "past");

    return (
        <>
            <Navbar />
            <Box sx={{ pt: 10, pb: 12, minHeight: "100vh" }}>
                <Container>
                    <Typography variant="h4" color="white" gutterBottom sx={{ mb: 4, textAlign: "center" }}>
                        Toate Competițiile
                    </Typography>

                    <Button variant="outlined" color="black" fullWidth sx={{ mb: 3 }} onClick={() => setShowPast((prev) => !prev)}>
                        {showPast ? "Ascunde competițiile finalizate" : "Afișează competițiile finalizate"}
                    </Button>

                    {visibleCompetitions.length === 0 ? (
                        <Typography variant="h6" color="white" align="center">
                            Nu există competiții înregistrate.
                        </Typography>
                    ) : (
                        <Grid container spacing={4}>
                            {visibleCompetitions.map((event) => (
                                <Grid size={{ xs: 12 }} key={event.id}>
                                    <Card elevation={3}>
                                        <CardContent sx={{ p: 3 }}>
                                            <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                                <EventAvailable color="primary" sx={{ mr: 2 }} />
                                                <Typography variant="h6">{event.name}</Typography>
                                                {event.status === "past" && <Chip label="Finalizat" size="small" icon={<CheckCircleOutline fontSize="small" />} sx={{ ml: 2 }} />}
                                                {event.status === "ongoing" && <Chip label="În desfășurare" size="small" color="primary" icon={<AccessTime fontSize="small" />} sx={{ ml: 2 }} />}
                                            </Box>

                                            <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                                <Chip label={event.date} color="info" variant="outlined" icon={<Timeline fontSize="small" />} />
                                                <Chip label={event.location} color="success" variant="outlined" icon={<LocationOn fontSize="small" />} />
                                            </Box>

                                            <Button fullWidth variant="contained" sx={{ mt: 3 }} component={Link} to={`/competition/${event.id}`}>
                                                Detalii
                                            </Button>
                                        </CardContent>
                                    </Card>
                                </Grid>
                            ))}
                        </Grid>
                    )}
                </Container>
            </Box>
            <Footer />
        </>
    );
}
