import { useEffect, useState, useRef } from "react";
import { Box, Button, Typography, IconButton, Switch, Paper, Divider } from "@mui/material";
import Grid from "@mui/material/Grid2";
import { Pause, PlayArrow } from "@mui/icons-material";
import { useLocation } from "react-router-dom";

import Navbar from "../../components/sections/Navbar/navbar";

const MatchDashboard = () => {
    const [time, setTime] = useState(300);
    const [running, setRunning] = useState(false);
    const [score, setScore] = useState([0, 0]);
    const [penalties, setPenalties] = useState([0, 0]);
    const [diffWin, setDiffWin] = useState(false);
    const location = useLocation();
    const [metadata, setMetadata] = useState(null);

    useEffect(() => {
        if (location.state) {
            console.log("Meci primit:", location.state);
            setMetadata(location.state);
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
                    channel.current.postMessage({
                        type: "update",
                        score: scoreRef.current,
                        penalties: penaltiesRef.current,
                        time: newTime,
                        running: true,
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

    if (!metadata || !metadata.teams) {
        return (
            <>
                <Navbar />
                <Box height={"calc(100vh - 4.5rem)"} mt={"4.5rem"} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography variant="h6">Loading match data...</Typography>
                </Box>
            </>
        );
    }

    return (
        <>
            <Navbar />
            <Box height={"calc(100vh - 4.5rem)"} mt={"4.5rem"}>
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

                        return (
                            <Grid key={player} xs={12} md={5}>
                                <Paper
                                    elevation={2}
                                    sx={{
                                        p: 5,
                                        minWidth: 520,
                                        backgroundColor: bgColor,
                                        color: textColor,
                                        border: `3px solid ${borderColor}`,
                                        borderRadius: 2,
                                        transform: player === 1 ? "scaleX(-1)" : "none",
                                    }}
                                >
                                    <Box sx={{ transform: player === 1 ? "scaleX(-1)" : "none" }}>
                                        <Typography variant="h5" mb={2}>
                                            {metadata.teams[player]?.name || `Player ${player + 1}`}
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
                                            <Typography variant="h6" sx={{ ml: 2 }}>
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
                    <Button variant="contained" size="large" onClick={() => console.log({ score, penalties, time })} sx={{ px: 6, py: 2 }}>
                        Finalizează Meciul
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