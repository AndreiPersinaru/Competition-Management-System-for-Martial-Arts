import React, { useState, useEffect } from "react";
import { Bracket, Seed, SeedItem, SeedTeam } from "react-brackets";
import { Container, Box, Typography, FormControl, InputLabel, Select, MenuItem, Paper } from "@mui/material";
import EmojiEventsIcon from "@mui/icons-material/EmojiEvents";

const CustomSeed = ({ seed, breakpoint }) => {
    return (
        <Seed mobileBreakpoint={breakpoint}>
            <SeedItem style={{ width: "200px" }} onClick={() => console.log("Seed clicked", seed.id)}>
                <div
                    style={{
                        display: "flex",
                        flexDirection: "column",
                        width: "100%",
                        border: "1px solid #ccc",
                        borderRadius: "4px",
                        overflow: "hidden",
                    }}
                >
                    <SeedTeam
                        style={{
                            padding: "8px",
                            backgroundColor: seed.teams[0]?.winner ? "#e3f2fd" : "white",
                            fontWeight: seed.teams[0]?.winner ? "bold" : "normal",
                            borderBottom: "1px solid #ccc",
                        }}
                    >
                        {seed.teams[0]?.name === "BYE" ? "BYE" : seed.teams[0]?.name || "TBD"}
                        {seed.teams[0]?.score !== undefined && <span style={{ float: "right", fontWeight: "bold" }}>{seed.teams[0]?.score}</span>}
                    </SeedTeam>
                    <SeedTeam
                        style={{
                            padding: "8px",
                            backgroundColor: seed.teams[1]?.winner ? "#e3f2fd" : "white",
                            fontWeight: seed.teams[1]?.winner ? "bold" : "normal",
                        }}
                    >
                        {seed.teams[1]?.name === "BYE" ? "BYE" : seed.teams[1]?.name || "TBD"}
                        {seed.teams[1]?.score !== undefined && <span style={{ float: "right", fontWeight: "bold" }}>{seed.teams[1]?.score}</span>}
                    </SeedTeam>
                </div>
            </SeedItem>
        </Seed>
    );
};

const CustomTitle = ({ title }) => {
    return (
        <div
            style={{
                textAlign: "center",
                fontWeight: "bold",
                padding: "10px",
                color: "#1976d2",
            }}
        >
            {title}
        </div>
    );
};

const generateParticipants = (count) => {
    const firstNames = ["Andrei", "Mihai", "Cristian", "Alexandru", "Gabriel", "Razvan", "Vlad", "Bogdan", "Radu", "Catalin"];
    const lastNames = ["Popescu", "Ionescu", "Dumitru", "Stanciu", "Radulescu", "Neagu", "Marin", "Tudor", "Dobre", "Florescu"];

    return Array.from({ length: count }, (_, i) => ({
        id: i + 1,
        name: `${firstNames[i % 10]} ${lastNames[i % 10]}`,
        country: ["ROU", "FRA", "ITA", "ESP", "GER"][i % 5],
    }));
};

const generateBracket = (participants) => {
    let rounds = [];
    let currentParticipants = participants.map((p) => ({ ...p }));
    let matchId = 1;

    while (currentParticipants.length > 1) {
        const roundNumber = rounds.length + 1;
        const roundTitle = roundNumber === 1 ? "Runda 1" : roundNumber === 2 ? "Sferturi" : roundNumber === 3 ? "Semifinale" : roundNumber === 4 ? "Finala" : `Runda ${roundNumber}`;

        const round = {
            title: roundTitle,
            seeds: [],
        };

        const numMatches = Math.floor(currentParticipants.length / 2);
        const byes = currentParticipants.length % 2;

        // Create matches
        for (let i = 0; i < numMatches; i++) {
            const team1 = currentParticipants[i * 2];
            const team2 = currentParticipants[i * 2 + 1];
            round.seeds.push({
                id: matchId++,
                teams: [team1 || { name: "BYE" }, team2 || { name: "BYE" }],
            });
        }

        // Prepare next round participants
        const nextParticipants = [];
        for (let i = 0; i < numMatches; i++) {
            nextParticipants.push({ name: `Câștigător M${matchId - numMatches + i}` });
        }
        // Add byes
        for (let i = 0; i < byes; i++) {
            const byeParticipant = currentParticipants[numMatches * 2 + i];
            if (byeParticipant) nextParticipants.push(byeParticipant);
        }

        rounds.push(round);
        currentParticipants = nextParticipants;
    }

    return rounds;
};

const TournamentBrackets = () => {
    const [participantCount, setParticipantCount] = useState(8);
    const [participants, setParticipants] = useState([]);
    const [brackets, setBrackets] = useState([]);

    useEffect(() => {
        setParticipants(generateParticipants(participantCount));
    }, [participantCount]);

    useEffect(() => {
        if (participants.length === 0) return;
        setBrackets(generateBracket(participants));
    }, [participants]);

    const handleCountChange = (event) => {
        setParticipantCount(event.target.value);
    };

    return (
        <Container maxWidth="xl">
            <Box sx={{ my: 4, textAlign: "center" }}>
                <Typography variant="h4" component="h1" gutterBottom>
                    <EmojiEventsIcon sx={{ mr: 1, verticalAlign: "middle" }} />
                    Tournament Brackets
                </Typography>

                <FormControl sx={{ m: 1, minWidth: 200 }}>
                    <InputLabel id="participant-count-label">Participanți</InputLabel>
                    <Select labelId="participant-count-label" value={participantCount} onChange={handleCountChange} label="Participanți">
                        {Array.from({ length: 9 }, (_, i) => i + 2).map((num) => (
                            <MenuItem key={num} value={num}>
                                {num} Participanți
                            </MenuItem>
                        ))}
                    </Select>
                </FormControl>
            </Box>

            <Paper elevation={3} sx={{ p: 2, overflowX: "auto", mb: 4 }}>
                <Box sx={{ display: "flex", justifyContent: "center" }}>
                    <Bracket rounds={brackets}  roundTitleComponent={CustomTitle} swipeableProps={{ enableMouseEvents: true }} mobileBreakpoint={760} />
                </Box>
            </Paper>

            <Box sx={{ mt: 4 }}>
                <Typography variant="body2" color="text.secondary" align="center">
                    Lista participanți: {participants.map((p) => p.name).join(", ")}
                </Typography>
            </Box>
        </Container>
    );
};

export default TournamentBrackets;
