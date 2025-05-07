import { useEffect, useState, useRef } from "react";
import { Box, Button, Typography, IconButton, Switch, Paper, Divider, Badge } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Add, Remove, Pause, PlayArrow, Sports, Close } from "@mui/icons-material";

import Navbar from "../../components/sections/Navbar/navbar";

const MatchDashboard = () => {
    const [time, setTime] = useState(300);
    const [running, setRunning] = useState(false);
    const [score, setScore] = useState([0, 0]);
    const [penalties, setPenalties] = useState([0, 0]);
    const [diffWin, setDiffWin] = useState(false);
    const timerRef = useRef(null);

    useEffect(() => {
        if (running && time > 0) {
            timerRef.current = setInterval(() => setTime((t) => t - 1), 1000);
        } else {
            clearInterval(timerRef.current);
        }
        return () => clearInterval(timerRef.current);
    }, [running, time]);

    useEffect(() => {
        if (diffWin && Math.abs(score[0] - score[1]) >= 10) {
            setRunning(false);
            console.log("Meci oprit din cauza diferentei de 10 puncte");
        }
    }, [score, diffWin]);

    const formatTime = (t) => `${Math.floor(t / 60)}:${(t % 60).toString().padStart(2, "0")}`;

    const handleAddScore = (player, value) => {
        setScore((prev) => {
            const newScore = [...prev];
            newScore[player] += value;
            return newScore;
        });
    };

    const handleRemoveScore = (player, value) => {
        setScore((prev) => {
            const newScore = [...prev];
            newScore[player] -= value;
            return newScore;
        });
    };

    const handleAddPenalty = (player) => {
        setPenalties((prev) => {
            const newPenalties = [...prev];
            newPenalties[player] += 1;

            if (newPenalties[player] === 2) handleAddScore(player === 0 ? 1 : 0, 1);
            if (newPenalties[player] === 3) handleAddScore(player === 0 ? 1 : 0, 1);
            if (newPenalties[player] === 4) {
                setRunning(false);
                console.log(`Sportivul ${player + 1} a fost descalificat`);
            }
            if (newPenalties[player] > 4) newPenalties[player] = 4;

            console.log(newPenalties[player]);

            return newPenalties;
        });
    };

    const handleRemovePenalty = (player) => {
        setPenalties((prev) => {
            const newPenalties = [...prev];
            newPenalties[player] -= 1;

            if (newPenalties[player] < 0) newPenalties[player] = 0;
            if (newPenalties[player] === 1) handleRemoveScore(player === 0 ? 1 : 0, 1);
            if (newPenalties[player] === 2) handleRemoveScore(player === 0 ? 1 : 0, 1);
            console.log(newPenalties[player]);
            return newPenalties;
        });
    };

    return (
        <>
            <Navbar />
            <Box height={"100vh"}>
                <Typography variant="h4" align="center" gutterBottom sx={{ mb: 4 }}>
                    <Sports sx={{ mr: 2, verticalAlign: "middle" }} />
                    Control Meci
                </Typography>

                {/* Timer Section */}
                <Box sx={{ textAlign: "center", mb: 6 }}>
                    <Typography
                        variant="h2"
                        sx={{
                            fontSize: "4rem",
                            fontFamily: "monospace",
                            backgroundColor: "rgba(0,0,0,0.1)",
                            px: 4,
                            py: 2,
                            borderRadius: 2,
                        }}
                    >
                        {formatTime(time)}
                    </Typography>

                    <Grid container spacing={2} justifyContent="center" sx={{ mt: 2 }}>
                        <Grid>
                            <Button variant="outlined" startIcon={<Remove />} onClick={() => setTime((t) => Math.max(0, t - 30))} size="large">
                                -30s
                            </Button>
                        </Grid>
                        <Grid>
                            <IconButton color="primary" onClick={() => setRunning(!running)} sx={{ fontSize: "2rem" }}>
                                {running ? <Pause fontSize="inherit" /> : <PlayArrow fontSize="inherit" />}
                            </IconButton>
                        </Grid>
                        <Grid>
                            <Button variant="outlined" startIcon={<Add />} onClick={() => setTime((t) => t + 30)} size="large">
                                +30s
                            </Button>
                        </Grid>
                    </Grid>
                </Box>

                <Divider sx={{ my: 4 }} />

                {/* Players Section */}
                <Grid container spacing={6} justifyContent="space-between">
                    {[0, 1].map((player) => (
                        <Grid key={player} xs={12} md={5}>
                            <Paper
                                elevation={2}
                                sx={{
                                    p: 3,
                                    borderLeft: player === 0 ? "4px solid #1976d2" : "4px solid #d32f2f",
                                    transform: player === 1 ? "scaleX(-1)" : "none",
                                }}
                            >
                                <Box sx={{ transform: player === 1 ? "scaleX(-1)" : "none" }}>
                                    <Typography variant="h5" sx={{ mb: 2 }}>
                                        Sportiv {player + 1}
                                    </Typography>

                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 3 }}>
                                        <Typography variant="h3" sx={{ flexGrow: 1 }}>
                                            {score[player]}
                                        </Typography>
                                        <Box sx={{ display: "flex", gap: 1 }}>
                                            {[1, 2, 3].map((val) => (
                                                <Button key={val} variant="contained" onClick={() => handleAddScore(player, val)} sx={{ minWidth: 40 }}>
                                                    +{val}
                                                </Button>
                                            ))}
                                        </Box>
                                        <Box sx={{ display: "flex", gap: 1, ml: 4 }}>
                                            {[1, 2, 3].map((val) => (
                                                <Button key={val} variant="contained" onClick={() => handleRemoveScore(player, val)} sx={{ minWidth: 40 }}>
                                                    -{val}
                                                </Button>
                                            ))}
                                        </Box>
                                    </Box>

                                    <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
                                        <Button variant="outlined" color="error" onClick={() => handleAddPenalty(player)}>
                                            Adaugă Penalizare
                                        </Button>
                                        <Button variant="outlined" color="error" onClick={() => handleRemovePenalty(player)}>
                                            Scoate Penalizare
                                        </Button>
                                    </Box>
                                </Box>
                            </Paper>
                        </Grid>
                    ))}
                </Grid>

                {/* Settings Section */}
                <Grid container justifyContent="center" sx={{ mt: 4 }}>
                    <Grid xs={12} md={8}>
                        <Paper elevation={0} sx={{ p: 2, bgcolor: "background.default" }}>
                            <Box
                                sx={{
                                    display: "flex",
                                    alignItems: "center",
                                    justifyContent: "space-between",
                                    gap: 2,
                                }}
                            >
                                <Typography variant="body1">Oprire automată la diferență de 10 puncte</Typography>
                                <Switch checked={diffWin} onChange={() => setDiffWin((v) => !v)} color="primary" />
                            </Box>
                        </Paper>
                    </Grid>
                </Grid>

                {/* Save Button */}
                <Box sx={{ textAlign: "center", mt: 6 }}>
                    <Button variant="contained" size="large" startIcon={<Sports />} onClick={() => console.log({ score, penalties, time })} sx={{ px: 6, py: 2 }}>
                        Finalizează Meciul
                    </Button>
                </Box>
            </Box>
        </>
    );
};

export default MatchDashboard;
