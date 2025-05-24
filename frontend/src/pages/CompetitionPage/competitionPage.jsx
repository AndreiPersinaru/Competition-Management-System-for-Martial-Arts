import { Box, Typography, Card, useTheme, useMediaQuery, List, ListItem, ListItemIcon, ListItemText } from "@mui/material";
import axios from "axios";
import { useParams } from "react-router-dom";
import { useEffect, useState } from "react";
import Navbar from "../../components/sections/Navbar/navbar";
import Footer from "../../components/sections/Footer/footer";
import { ArrowRight, CalendarToday, LocationOn, SportsMartialArts } from "@mui/icons-material";
import Excel from "../../components/sections/Excel/excel";
import API_URL from "../../config";

export default function CompetitionPage() {
    const { id } = useParams();
    const [competition, setCompetition] = useState(null);
    const [error, setError] = useState(null);
    const [loading, setLoading] = useState(true);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down("md"));

    useEffect(() => {
        const fetchCompetition = async () => {
            try {
                const response = await axios.get(`${API_URL}/competitions/${id}/`);
                let data = response.data;
                const map = new Map();
                data.probe.forEach((proba) => {
                    let numeSimplificat = proba.nume;

                    if (numeSimplificat.toLowerCase().includes("palaismata")) {
                        numeSimplificat = "Palaismata";
                    } else if (numeSimplificat.toLowerCase().includes("polydamas")) {
                        numeSimplificat = "Polydamas";
                    }

                    if (!map.has(numeSimplificat)) {
                        map.set(numeSimplificat, { id: proba.id, nume: numeSimplificat });
                    }
                });

                data.probe = Array.from(map.values());

                setCompetition(data);
                setLoading(false);
            } catch (error) {
                setError("Eroare la încărcarea competiției. Te rugăm să încerci mai târziu.");
                setLoading(false);
            }
        };
        fetchCompetition();
    }, [id]);

    if (loading) {
        return (
            <>
                <Navbar />
                <Box sx={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Typography variant="h5">Se încarcă...</Typography>
                </Box>
            </>
        );
    }

    if (error) {
        return (
            <>
                <Navbar />
                <Box sx={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Typography variant="h5" color="error">
                        {error}
                    </Typography>
                </Box>
            </>
        );
    }

    if (!competition) {
        return (
            <>
                <Navbar />
                <Box sx={{ height: "100vh", display: "flex", justifyContent: "center", alignItems: "center" }}>
                    <Typography variant="h5">Nu există competiție.</Typography>
                </Box>
            </>
        );
    }

    const formatDate = (startDateString, endDateString) => {
        const startDate = new Date(startDateString);
        const endDate = new Date(endDateString);

        const sameDay = startDate.toDateString() === endDate.toDateString();

        if (sameDay) {
            return `${startDate.getDate()} ${getMonthName(startDate.getMonth())} ${startDate.getFullYear()}`;
        } else {
            const sameMonthYear = startDate.getMonth() === endDate.getMonth() && startDate.getFullYear() === endDate.getFullYear();

            if (sameMonthYear) {
                return `${startDate.getDate()}-${endDate.getDate()} ${getMonthName(endDate.getMonth())} ${endDate.getFullYear()}`;
            } else {
                return `${startDate.getDate()} ${getMonthName(startDate.getMonth())} - ${endDate.getDate()} ${getMonthName(endDate.getMonth())} ${endDate.getFullYear()}`;
            }
        }
    };

    const getMonthName = (monthIndex) => {
        const months = ["Ianuarie", "Februarie", "Martie", "Aprilie", "Mai", "Iunie", "Iulie", "August", "Septembrie", "Octombrie", "Noiembrie", "Decembrie"];
        return months[monthIndex];
    };

    return (
        <>
            <Navbar />
            <Box
                sx={{
                    display: "flex",
                    flexDirection: isMobile ? "column" : "row",
                    pt: "4.5rem",
                    minHeight: "calc(100vh - 4.5rem)",
                    overflow: "hidden",
                }}
            >
                {/* Left side - Competition Details */}
                <Box
                    sx={{
                        width: isMobile ? "100%" : "40%",
                        height: isMobile ? "auto" : "100%",
                        p: isMobile ? 2 : 5,
                    }}
                >
                    <Typography variant="h3" sx={{ mb: 5, pr: 5, textAlign: "center" }}>
                        {competition.nume}
                    </Typography>

                    <Box sx={{ mb: 6, pr: 5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                            <CalendarToday color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h4">Data Competiției</Typography>
                        </Box>
                        <Typography variant="body1" sx={{ ml: 4 }}>
                            <strong>{formatDate(competition.data_incepere, competition.data_sfarsit)}</strong>
                        </Typography>
                    </Box>

                    <Box sx={{ mb: 4, pr: 5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                            <LocationOn color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h4">Locație</Typography>
                        </Box>
                        <Typography variant="body1" sx={{ ml: 4, mb: 1 }}>
                            Oraș: <strong>{competition.oras}</strong>
                        </Typography>
                        <Typography variant="body1" sx={{ ml: 4 }}>
                            Adresă: <strong>{competition.adresa}</strong>
                        </Typography>
                    </Box>
                    <Box sx={{ mb: 4, pr: 5 }}>
                        <Box sx={{ display: "flex", alignItems: "center", mb: 2 }}>
                            <SportsMartialArts color="primary" sx={{ mr: 1 }} />
                            <Typography variant="h4" sx={{ display: "flex", alignItems: "center" }}>
                                Probele Disponibile
                            </Typography>
                        </Box>
                        {competition.probe && competition.probe.length > 0 ? (
                            <List>
                                {competition.probe.map((proba, index) => (
                                    <ListItem key={index}>
                                        <ListItemIcon>
                                            <ArrowRight color="primary" />
                                        </ListItemIcon>
                                        <ListItemText primary={proba.nume} sx={{ ml: -3 }} />
                                    </ListItem>
                                ))}
                            </List>
                        ) : (
                            <Typography variant="body1" sx={{ ml: 4 }}>
                                Nu există probe disponibile.
                            </Typography>
                        )}
                    </Box>
                </Box>

                {/* Right side - Google Maps */}
                <Box
                    sx={{
                        width: isMobile ? "100%" : "60%",
                        height: isMobile ? "60vh" : "calc(100vh - 4.5rem)",
                        px: isMobile ? 2 : 0,
                        boxSizing: "border-box",
                    }}
                >
                    <Box
                        component="iframe"
                        src={competition.locatie_google_maps}
                        sx={{
                            border: 0,
                            width: "100%",
                            height: "100%",
                        }}
                        allowFullScreen
                        loading="lazy"
                        referrerPolicy="no-referrer-when-downgrade"
                    />
                </Box>
            </Box>
            <Excel />
            <Footer />
        </>
    );
}
