import { useEffect, useState, useRef } from "react";
import { Box, Button, Typography, IconButton, Switch, Paper, Divider, Alert } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Pause, PlayArrow } from "@mui/icons-material";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

import Navbar from "../../components/sections/Navbar/navbar";

const MatchDashboard = () => {
    const [time, setTime] = useState(0);
    const [running, setRunning] = useState(false);
    const [score, setScore] = useState([0, 0]);
    const [penalties, setPenalties] = useState([0, 0]);
    const [diffWin, setDiffWin] = useState(false);
    const location = useLocation();
    const navigate = useNavigate();
    const [metadata, setMetadata] = useState(null);
    const [isFinalizingMatch, setIsFinalizingMatch] = useState(false);
    const [error, setError] = useState(null);

    const getTimeByAge = (age) => {
        if (age <= 11) return 120;
        if (age <= 14) return 180;
        if (age <= 17) return 240;
        return 300;
    };

    useEffect(() => {
        if (location.state) {
            const matchData = location.state;
            setMetadata(matchData);
            console.log("Match data:", matchData);

            if (matchData.varsta) {
                const age = parseInt(matchData.varsta);
                const initialTime = getTimeByAge(age);
                setTime(initialTime);
            }
        }
    }, [location.state]);

    // Culorile pentru sportivi
    const blueColor = "#198dd2";
    const whiteColor = "#ffffff";
    const blueBorderColor = "#0b5d8f";
    const whiteBorderColor = "#cccccc";

    const channel = useRef(new BroadcastChannel("match_channel"));
    const timerRef = useRef(null);
    const scoreRef = useRef(score);
    const penaltiesRef = useRef(penalties);

    const broadcastState = () => {
        channel.current.postMessage({
            type: "update",
            score: scoreRef.current,
            penalties: penaltiesRef.current,
            time,
            metadata,
        });
    };

    useEffect(() => {
        if (running && time > 0) {
            timerRef.current = setInterval(() => {
                setTime((t) => {
                    const newTime = t - 1;
                    if (newTime <= 0) {
                        setRunning(false);
                    }
                    channel.current.postMessage({
                        type: "update",
                        score: scoreRef.current,
                        penalties: penaltiesRef.current,
                        time: newTime,
                        running: newTime > 0,
                        metadata,
                    });
                    return newTime;
                });
            }, 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [running]);

    useEffect(() => {
        scoreRef.current = score;
        if (diffWin && Math.abs(score[0] - score[1]) >= 10) {
            setRunning(false);
            console.log("Meci oprit din cauza diferentei de 10 puncte");
        }
    }, [score, diffWin]);

    useEffect(() => {
        penaltiesRef.current = penalties;
    }, [penalties]);

    useEffect(() => {
        broadcastState();
    }, [metadata]);

    const formatTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;

    const handleAddScore = (player, value) => {
        setScore((prev) => {
            const newScore = [...prev];
            newScore[player] += value;
            scoreRef.current = newScore;
            broadcastState();
            return newScore;
        });
    };

    const handleRemoveScore = (player, value) => {
        setScore((prev) => {
            const newScore = [...prev];
            if (newScore[player] - value < 0) return prev;
            newScore[player] -= value;
            scoreRef.current = newScore;
            broadcastState();
            return newScore;
        });
    };

    const handleAddPenalty = (player) => {
        setPenalties((prev) => {
            const newPenalties = [...prev];
            newPenalties[player] += 1;
            if (newPenalties[player] === 2) handleAddScore(player === 0 ? 1 : 0, 1);
            if (newPenalties[player] === 3) handleAddScore(player === 0 ? 1 : 0, 2);
            if (newPenalties[player] === 4) {
                setRunning(false);
                console.log(`Sportivul ${player + 1} a fost descalificat`);
            }
            if (newPenalties[player] > 4) newPenalties[player] = 4;
            penaltiesRef.current = newPenalties;
            broadcastState();
            return newPenalties;
        });
    };

    const handleRemovePenalty = (player) => {
        setPenalties((prev) => {
            const newPenalties = [...prev];
            newPenalties[player] -= 1;
            if (newPenalties[player] < 0) newPenalties[player] = 0;
            if (newPenalties[player] === 1) handleRemoveScore(player === 0 ? 1 : 0, 1);
            if (newPenalties[player] === 2) handleRemoveScore(player === 0 ? 1 : 0, 2);
            penaltiesRef.current = newPenalties;
            broadcastState();
            return newPenalties;
        });
    };

    const handleAddTime = (value) => {
        setTime((prevTime) => {
            const newTime = prevTime + value;
            channel.current.postMessage({
                type: "update",
                score: scoreRef.current,
                penalties: penaltiesRef.current,
                time: newTime,
                running,
                metadata,
            });
            return newTime;
        });
    };

    const handleRemoveTime = (value) => {
        setTime((prevTime) => {
            const newTime = Math.max(0, prevTime - value);
            channel.current.postMessage({
                type: "update",
                score: scoreRef.current,
                penalties: penaltiesRef.current,
                time: newTime,
                running,
                metadata,
            });
            return newTime;
        });
    };

    const openPublicScreen = () => {
        window.open("/public-view", "_blank", "width=800,height=600,noopener,noreferrer");
        setTimeout(() => {
            broadcastState();
        }, 500);
    };

    const handleFinalizeMeci = async () => {
        if (!metadata || !metadata.id) {
            setError("Nu s-au găsit datele meciului pentru finalizare");
            return;
        }

        setIsFinalizingMatch(true);
        setError(null);

        try {
            let finalScore1 = score[0];
            let finalScore2 = score[1];
            let castigatorId = null;

            if (penalties[0] >= 4) {
                finalScore1 = 0;
                finalScore2 = 99;
                castigatorId = metadata.teams[1]?.idSportiv;
            } else if (penalties[1] >= 4) {
                finalScore1 = 99;
                finalScore2 = 0;
                castigatorId = metadata.teams[0]?.idSportiv;
            } else {
                if (finalScore1 > finalScore2) {
                    castigatorId = metadata.teams[0]?.idSportiv;
                } else if (finalScore2 > finalScore1) {
                    castigatorId = metadata.teams[1]?.idSportiv;
                }
            }

            const requestPayload = {
                scor1: finalScore1,
                scor2: finalScore2,
                castigator: castigatorId,
                diferenta_activata: diffWin,
            };

            console.log("Request payload:", requestPayload);

            const token = localStorage.getItem("access_token");

            const response = await axios.patch(`http://127.0.1:8000/api/meciuri/${metadata.id}/finalizare/`, requestPayload, {
                headers: {
                    "Content-Type": "application/json",
                    Authorization: `Bearer ${token}`,
                },
            });

            const result = response.data;

            navigate(metadata.returnTo, {
                state: {
                    message: "Meciul a fost finalizat cu succes!",
                    nextMatch: result.nextMatch || null,
                },
            });
        } catch (error) {
            console.error("Eroare la finalizarea meciului:", error);
            setError(error.message || "A apărut o eroare la finalizarea meciului");
        } finally {
            setIsFinalizingMatch(false);
        }
    };

    // Verificăm dacă meciul poate fi finalizat
    const canFinalize = () => {
        // Meciul poate fi finalizat dacă:
        // 1. Cineva are 4 penalizări (descalificare)
        // 2. Timpul s-a terminat
        // 3. Diferența de 10 puncte este activată și cineva are cu 10+ puncte mai mult
        const hasDisqualification = penalties[0] >= 4 || penalties[1] >= 4;
        const timeIsUp = time <= 0;
        const has10PointDiff = diffWin && Math.abs(score[0] - score[1]) >= 10;

        return hasDisqualification || timeIsUp || has10PointDiff;
    };

    const getFinalizationReason = () => {
        if (penalties[0] >= 4) return `${metadata?.teams[0]?.name || "Sportivul 1"} a fost descalificat (4 penalizări)`;
        if (penalties[1] >= 4) return `${metadata?.teams[1]?.name || "Sportivul 2"} a fost descalificat (4 penalizări)`;
        if (time <= 0) return "Timpul s-a terminat";
        if (diffWin && Math.abs(score[0] - score[1]) >= 10) return "Diferență de 10 puncte atinsă";
        return "";
    };

    if (!metadata || !metadata.teams) {
        return (
            <>
                <Navbar />
                <Box height={"calc(100vh - 4.5rem)"} mt={"4.5rem"} sx={{ display: "flex", alignItems: "center", justifyContent: "center" }}>
                    <Typography variant="h6">Loading match data...</Typography>
                </Box>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <Box height={"calc(100vh - 4.5rem)"} mt={"4.5rem"}>
                {error && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="error">{error}</Alert>
                    </Box>
                )}

                {canFinalize() && (
                    <Box sx={{ mb: 2 }}>
                        <Alert severity="warning">Meciul poate fi finalizat: {getFinalizationReason()}</Alert>
                    </Box>
                )}

                <Box sx={{ textAlign: "center", mb: 6 }}>
                    <Typography variant="h1" py={2}>
                        {formatTime(time)}
                    </Typography>

                    <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                        <Grid container spacing={2} justifyContent="center">
                            <Button variant="outlined" onClick={() => handleRemoveTime(60)} sx={{ fontSize: "1.2rem" }}>
                                -60s
                            </Button>
                            <Button variant="outlined" onClick={() => handleRemoveTime(30)} sx={{ fontSize: "1.2rem" }}>
                                -30s
                            </Button>
                        </Grid>
                        <Grid>
                            <IconButton color="primary" onClick={() => setRunning(!running)} sx={{ fontSize: "2rem" }}>
                                {running ? <Pause fontSize="inherit" /> : <PlayArrow fontSize="inherit" />}
                            </IconButton>
                        </Grid>
                        <Grid container spacing={2} justifyContent="center">
                            <Button variant="outlined" onClick={() => handleAddTime(30)} sx={{ fontSize: "1.2rem" }}>
                                +30s
                            </Button>
                            <Button variant="outlined" onClick={() => handleAddTime(60)} sx={{ fontSize: "1.2rem" }}>
                                +60s
                            </Button>
                        </Grid>
                    </Grid>
                </Box>

                <Grid container spacing={6} justifyContent="space-between">
                    {[0, 1].map((player) => {
                        const isBlue = player === 0;
                        const bgColor = isBlue ? blueColor : whiteColor;
                        const borderColor = isBlue ? blueBorderColor : whiteBorderColor;
                        const textColor = isBlue ? "white" : "black";
                        const isDisqualified = penalties[player] >= 4;

                        return (
                            <Grid key={player} xs={12} md={5}>
                                <Paper
                                    elevation={2}
                                    sx={{
                                        p: 5,
                                        minWidth: 520,
                                        backgroundColor: isDisqualified ? "#ffebee" : bgColor,
                                        color: isDisqualified ? "#d32f2f" : textColor,
                                        border: `3px solid ${isDisqualified ? "#f44336" : borderColor}`,
                                        borderRadius: 2,
                                        transform: player === 1 ? "scaleX(-1)" : "none",
                                        opacity: isDisqualified ? 0.7 : 1,
                                    }}
                                >
                                    <Box sx={{ transform: player === 1 ? "scaleX(-1)" : "none" }}>
                                        <Typography variant="h5" mb={2}>
                                            {metadata.teams[player]?.name || `Player ${player + 1}`}
                                            {isDisqualified && (
                                                <Typography variant="body2" color="error" sx={{ mt: 1 }}>
                                                    DESCALIFICAT
                                                </Typography>
                                            )}
                                        </Typography>

                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                                            <Typography variant="h2" minWidth={70}>
                                                {score[player]}
                                            </Typography>
                                            <Box sx={{ display: "flex", gap: 1 }}>
                                                {[1, 2, 3].map((val) => (
                                                    <Button
                                                        key={val}
                                                        variant="contained"
                                                        onClick={() => handleAddScore(player, val)}
                                                        disabled={isDisqualified}
                                                        sx={{
                                                            minWidth: 40,
                                                            bgcolor: isBlue ? "#0d6efd" : "grey.300",
                                                            color: isBlue ? "white" : "black",
                                                            "&:hover": {
                                                                bgcolor: isBlue ? "#0b5ed7" : "grey.400",
                                                            },
                                                        }}
                                                    >
                                                        +{val}
                                                    </Button>
                                                ))}
                                            </Box>
                                            <Box sx={{ display: "flex", gap: 1, ml: 4 }}>
                                                {[1, 2, 3].map((val) => (
                                                    <Button
                                                        key={val}
                                                        variant="contained"
                                                        onClick={() => handleRemoveScore(player, val)}
                                                        disabled={isDisqualified}
                                                        sx={{
                                                            minWidth: 40,
                                                            bgcolor: isBlue ? "#0d6efd" : "grey.300",
                                                            color: isBlue ? "white" : "black",
                                                            "&:hover": {
                                                                bgcolor: isBlue ? "#0b5ed7" : "grey.400",
                                                            },
                                                        }}
                                                    >
                                                        -{val}
                                                    </Button>
                                                ))}
                                            </Box>
                                        </Box>

                                        <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleAddPenalty(player)}
                                                disabled={isDisqualified}
                                                sx={{
                                                    borderColor: isBlue ? "black" : "",
                                                    color: isBlue ? "black" : "",
                                                    bgcolor: isBlue ? "white" : "",
                                                }}
                                            >
                                                Adaugă Penalizare
                                            </Button>
                                            <Button
                                                variant="outlined"
                                                color="error"
                                                onClick={() => handleRemovePenalty(player)}
                                                sx={{
                                                    borderColor: isBlue ? "black" : "",
                                                    color: isBlue ? "black" : "",
                                                    bgcolor: isBlue ? "white" : "",
                                                }}
                                            >
                                                Scoate Penalizare
                                            </Button>
                                            <Typography
                                                variant="h6"
                                                sx={{
                                                    ml: 2,
                                                    color: penalties[player] >= 4 ? "#d32f2f" : "inherit",
                                                    fontWeight: penalties[player] >= 4 ? "bold" : "normal",
                                                }}
                                            >
                                                Penalizări: {penalties[player]}
                                            </Typography>
                                        </Box>
                                    </Box>
                                </Paper>
                            </Grid>
                        );
                    })}
                </Grid>

                <Grid container justifyContent="center" sx={{ mt: 4 }}>
                    <Grid xs={12} md={8}>
                        <Paper elevation={0} sx={{ p: 2 }}>
                            <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 2 }}>
                                <Typography variant="body1">Oprire meci la diferență de 10 puncte</Typography>
                                <Switch checked={diffWin} onChange={() => setDiffWin((v) => !v)} color="primary" />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                <Box sx={{ textAlign: "center", mt: 6 }}>
                    <Button variant="contained" size="large" onClick={handleFinalizeMeci} disabled={isFinalizingMatch} sx={{ px: 6, py: 2 }}>
                        {isFinalizingMatch ? "Se finalizează..." : "Finalizează Meciul"}
                    </Button>
                    <Button variant="contained" size="large" onClick={openPublicScreen} sx={{ px: 6, py: 2, ml: 4 }}>
                        Ecran Public
                    </Button>
                </Box>
            </Box>
        </>
    );
};

export default MatchDashboard;
