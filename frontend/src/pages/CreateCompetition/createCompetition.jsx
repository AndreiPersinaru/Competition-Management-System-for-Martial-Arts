import React, { useState } from "react";
import { Box, Button, Container, Paper, TextField, Typography, Alert } from "@mui/material";
import backgroundImage from "../../assets/pictures/home-background.jpg";
import Navbar from "../../components/sections/Navbar/Navbar";
import axios from "axios";
import { EditCalendar } from "@mui/icons-material";

const getEmbedLink = (link) => {
    const match = link.match(/src="([^"]+)"/);
    console.log("Link Google Maps:", match);
    return match ? match[1] : "";
};

const CreateCompetition = () => {
    const accessToken = localStorage.getItem("access_token");
    const [nume, setNume] = useState("");
    const [dataIncepere, setDataIncepere] = useState("");
    const [dataSfarsit, setDataSfarsit] = useState("");
    const [oras, setOras] = useState("");
    const [adresa, setAdresa] = useState("");
    const [mapLink, setMapLink] = useState("");
    const [error, setError] = useState("");
    const [success, setSuccess] = useState(false);
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        try {
            await axios.post(
                "http://127.0.0.1:8000/api/add-competition/",
                {
                    nume,
                    data_incepere: dataIncepere,
                    data_sfarsit: dataSfarsit,
                    oras,
                    adresa,
                    locatie_google_maps: getEmbedLink(mapLink),
                },
                { headers: { Authorization: `Bearer ${accessToken}` } }
            );
            setSuccess(true);
            setNume("");
            setDataIncepere("");
            setDataSfarsit("");
            setOras("");
            setAdresa("");
            setMapLink("");
        } catch {
            setError("Eroare la creare competiție.");
        }
    };

    return (
        <>
            <Navbar />
            <Box
                sx={{
                    position: "relative",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    minHeight: "100vh",
                    overflow: "hidden",
                    "&::before": {
                        content: '""',
                        position: "absolute",
                        width: "100%",
                        height: "100%",
                        backgroundImage: `url(${backgroundImage})`,
                        backgroundSize: "100% 100%",
                        filter: "blur(2px) brightness(0.5)",
                        transform: "scale(1.01)",
                        zIndex: -1,
                    },
                }}
            >
                <Container maxWidth="sm">
                    <Paper elevation={8} sx={{ p: 4 }}>
                        <Box sx={{ textAlign: "center", mb: 3 }}>
                            <EditCalendar fontSize="large" color="primary" />
                        </Box>
                        <Typography variant="h5" gutterBottom>
                            Creare Competiție
                        </Typography>

                        {error && (
                            <Alert severity="error" sx={{ mb: 2 }}>
                                {error}
                            </Alert>
                        )}
                        {success && (
                            <Alert severity="success" sx={{ mb: 2 }}>
                                Competiția a fost creată!
                            </Alert>
                        )}

                        <Box component="form" onSubmit={handleSubmit}>
                            <TextField fullWidth margin="normal" label="Nume" value={nume} onChange={(e) => setNume(e.target.value)} required autoFocus />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Data Începere"
                                type="date"
                                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: today, max: dataSfarsit } }}
                                value={dataIncepere}
                                onChange={(e) => setDataIncepere(e.target.value)}
                                required
                            />
                            <TextField
                                fullWidth
                                margin="normal"
                                label="Data Sfârșit"
                                type="date"
                                slotProps={{ inputLabel: { shrink: true }, htmlInput: { min: dataIncepere || today } }}
                                min={dataIncepere}
                                value={dataSfarsit}
                                onChange={(e) => setDataSfarsit(e.target.value)}
                                required
                            />
                            <TextField fullWidth margin="normal" label="Oraș" value={oras} onChange={(e) => setOras(e.target.value)} required />
                            <TextField fullWidth margin="normal" label="Adresă" value={adresa} onChange={(e) => setAdresa(e.target.value)} required />
                            <TextField fullWidth margin="normal" label="Link Google Maps" value={mapLink} onChange={(e) => setMapLink(e.target.value)} />
                            <Button type="submit" variant="contained" fullWidth sx={{ mt: 2 }}>
                                Salvează
                            </Button>
                        </Box>
                    </Paper>
                </Container>
            </Box>
        </>
    );
};

export default CreateCompetition;
