import React, { useState } from "react";
import { Box, Button, Container, Paper, TextField, Typography, Alert, IconButton, List, ListItem, ListItemText } from "@mui/material";
import { Delete, Edit } from "@mui/icons-material";
import backgroundImage from "../../assets/pictures/home-background.jpg";
import Navbar from "../../components/sections/Navbar/navbar";
import axios from "axios";
import { EditCalendar } from "@mui/icons-material";
import API_URL from "../../config";

const getEmbedLink = (link) => {
    const match = link.match(/src="([^"]+)"/);
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
    const [selectedProbes, setSelectedProbes] = useState([]);
    const [newProbe, setNewProbe] = useState("");
    const [editingIndex, setEditingIndex] = useState(-1);
    const [editingValue, setEditingValue] = useState("");
    const today = new Date(Date.now() - new Date().getTimezoneOffset() * 60000).toISOString().split("T")[0];

    const handleAddProbe = (e) => {
        if (e.key === 'Enter' && newProbe.trim()) {
            e.preventDefault();
            setSelectedProbes([...selectedProbes, newProbe.trim()]);
            setNewProbe("");
        }
    };

    const handleDeleteProbe = (index) => {
        setSelectedProbes(selectedProbes.filter((_, i) => i !== index));
    };

    const handleEditProbe = (index) => {
        setEditingIndex(index);
        setEditingValue(selectedProbes[index]);
    };

    const handleSaveEdit = (e) => {
        if (e.key === 'Enter' && editingValue.trim()) {
            e.preventDefault();
            const updatedProbes = [...selectedProbes];
            updatedProbes[editingIndex] = editingValue.trim();
            setSelectedProbes(updatedProbes);
            setEditingIndex(-1);
            setEditingValue("");
        }
    };

    const handleBlurEdit = () => {
        if (editingValue.trim()) {
            const updatedProbes = [...selectedProbes];
            updatedProbes[editingIndex] = editingValue.trim();
            setSelectedProbes(updatedProbes);
        }
        setEditingIndex(-1);
        setEditingValue("");
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError("");
        setSuccess(false);

        try {
            await axios.post(
                `${API_URL}/competitions/`,
                {
                    nume,
                    data_incepere: dataIncepere,
                    data_sfarsit: dataSfarsit,
                    oras,
                    adresa,
                    locatie_google_maps: getEmbedLink(mapLink),
                    probe: selectedProbes,
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
            setSelectedProbes([]);
        } catch (error) {
            console.error("Error creating competition:", error.response?.data);
            setError("Eroare la creare competiție.");
        }
    };

    return (
        <>
            <Navbar />
            <Box
                sx={{
                    pt: "8rem",
                    pb: "4rem",
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
                            <Box sx={{ display: "flex", justifyContent: "space-between", gap: 2 }}>
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
                                    value={dataSfarsit}
                                    onChange={(e) => setDataSfarsit(e.target.value)}
                                    required
                                />
                            </Box>
                            <TextField fullWidth margin="normal" label="Oraș" value={oras} onChange={(e) => setOras(e.target.value)} required />
                            <TextField fullWidth margin="normal" label="Adresă" value={adresa} onChange={(e) => setAdresa(e.target.value)} required />
                            <TextField fullWidth margin="normal" label="Link Google Maps" value={mapLink} onChange={(e) => setMapLink(e.target.value)} />

                            <TextField 
                                fullWidth 
                                margin="normal" 
                                label="Adauga proba" 
                                value={newProbe} 
                                onChange={(e) => setNewProbe(e.target.value)}
                                onKeyPress={handleAddProbe}
                            />

                            {selectedProbes.length > 0 && (
                                <List>
                                    {selectedProbes.map((probe, index) => (
                                        <ListItem key={index} sx={{ px: 0 }}>
                                            {editingIndex === index ? (
                                                <TextField
                                                    fullWidth
                                                    value={editingValue}
                                                    onChange={(e) => setEditingValue(e.target.value)}
                                                    onKeyPress={handleSaveEdit}
                                                    onBlur={handleBlurEdit}
                                                    autoFocus
                                                />
                                            ) : (
                                                <>
                                                    <ListItemText primary={probe} />
                                                    <IconButton onClick={() => handleEditProbe(index)} size="small">
                                                        <Edit />
                                                    </IconButton>
                                                    <IconButton onClick={() => handleDeleteProbe(index)} size="small">
                                                        <Delete />
                                                    </IconButton>
                                                </>
                                            )}
                                        </ListItem>
                                    ))}
                                </List>
                            )}

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