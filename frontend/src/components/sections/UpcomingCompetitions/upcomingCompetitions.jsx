import { Box, Typography, Container, Card, CardContent, Chip, Button } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { EventAvailable, Timeline, LocationOn } from "@mui/icons-material";
import { Link } from "react-router-dom";
import axios from "axios";
import { useEffect, useState } from "react";
import API_URL from "../../../config";

const UpcomingCompetitions = () => {
    const [upcomingEvents, setUpcomingEvents] = useState([]);

    const apiClient = axios.create({
        timeout: 5000,
        headers: {
            "Content-Type": "application/json",
        },
    });

    const lunaRomana = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];

    const fetchUpcomingEvents = async () => {
        try {
            const response = await apiClient.get(`${API_URL}/competitions/`);
            const today = new Date();

            const upcoming = response.data
                .filter((event) => new Date(event.data_incepere) >= today)
                .sort((a, b) => new Date(a.data_incepere) - new Date(b.data_incepere))
                .slice(0, 2)
                .map((event) => {
                    const startDate = new Date(event.data_incepere);
                    const endDate = new Date(event.data_sfarsit);

                    let dateFormatted = "";

                    if (startDate.toDateString() === endDate.toDateString()) {
                        dateFormatted = `${startDate.getDate()} ${lunaRomana[startDate.getMonth()]} ${startDate.getFullYear()}`;
                    } else {
                        dateFormatted = `${startDate.getDate()}-${endDate.getDate()} ${lunaRomana[endDate.getMonth()]} ${endDate.getFullYear()}`;
                    }

                    return {
                        name: event.nume,
                        date: dateFormatted,
                        location: event.oras,
                        id: event.id,
                    };
                });

            setUpcomingEvents(upcoming);
        } catch (error) {
            setUpcomingEvents([]);
        }
    };

    useEffect(() => {
        fetchUpcomingEvents();
    }, []);

    return (
        <Box sx={{ pt: 8, pb: 12, bgcolor: "primary.main" }}>
            <Container>
                <Typography variant="h4" color="white" gutterBottom sx={{ mb: 4, textAlign: "center" }}>
                    Următoarele Competiții
                </Typography>
                {upcomingEvents.length === 0 ? (
                    <Typography variant="h6" color="white" align="center">
                        Nu există competiții programate în perioada următoare.
                    </Typography>
                ) : (
                    <Grid container spacing={4} justifyContent={upcomingEvents.length === 1 ? "center" : "flex-start"}>
                        {upcomingEvents.map((event) => (
                            <Grid size={{ xs: 12, md: 6 }} key={event.id}>
                                <Card elevation={3}>
                                    <CardContent sx={{ p: 3 }}>
                                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                                            <EventAvailable color="primary" sx={{ mr: 2 }} />
                                            <Typography variant="h6">{event.name}</Typography>
                                        </Box>

                                        <Box sx={{ display: "flex", gap: 2, flexWrap: "wrap" }}>
                                            <Chip label={event.date} color="info" variant="outlined" icon={<Timeline fontSize="small" />} />
                                            <Chip label={event.location} color="success" variant="outlined" icon={<LocationOn fontSize="small" />} />
                                        </Box>

                                        <Button fullWidth variant="contained" sx={{ mt: 3 }} component={Link} to={`/competition/${event.id}`}>
                                            Detalii & Înscriere
                                        </Button>
                                    </CardContent>
                                </Card>
                            </Grid>
                        ))}
                    </Grid>
                )}
            </Container>
        </Box>
    );
};

export default UpcomingCompetitions;
